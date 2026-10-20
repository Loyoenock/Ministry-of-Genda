/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { supabase, setSupabaseConfiguredForTesting } from '../lib/supabase';
import {
  fetchInterviewsOrThrow,
  fetchAllInterviewsGlobalOrThrow,
  fetchInterviewsFromSupabase,
} from '../lib/interviewService';
import { fetchAnalyticsDataset, AnalyticsFilters } from '../lib/reportService';
import { useInterviewRecords } from '../hooks/useInterviewRecords';
import { AuthProvider, useAuth, setEnableAuthListenerForTesting } from '../context/AuthContext';
import { mapSignInError } from '../lib/authErrorMapper';

describe('Resilience, Paging & Fail-Closed Auth Regression Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSupabaseConfiguredForTesting(true);
    setEnableAuthListenerForTesting(false);
    localStorage.clear();
  });

  afterEach(() => {
    setEnableAuthListenerForTesting(false);
    vi.restoreAllMocks();
  });

  // (a) loadInterviews surfacing an error instead of an empty list
  it('(a) loadInterviews surfaces an error instead of swallowing it into an empty list', async () => {
    // Mock Supabase from('interviews') to fail with a database error
    const queryError = { message: 'PostgREST server connection timeout', code: '504' };
    const queryMock: any = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: null, error: queryError }),
    };

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'interviews') return queryMock;
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any;
    });

    // 1. Verify old fetchInterviewsFromSupabase swallows error and returns empty list
    const swallowedResult = await fetchInterviewsFromSupabase('usr-1', false);
    expect(swallowedResult).toEqual([]);

    // 2. Verify new fetchInterviewsOrThrow actually throws the error
    await expect(fetchInterviewsOrThrow('usr-1', false)).rejects.toMatchObject({
      message: 'PostgREST server connection timeout',
    });

    // 3. Verify useInterviewRecords.loadInterviews sets error state
    function TestRecordsComponent() {
      const { allInterviews, loading, error } = useInterviewRecords({
        userId: 'usr-1',
        isAdmin: false,
      });

      return (
        <div>
          <div data-testid="loading-state">{loading ? 'loading' : 'idle'}</div>
          <div data-testid="error-state">{error || 'no-error'}</div>
          <div data-testid="interviews-count">{allInterviews.length}</div>
        </div>
      );
    }

    render(<TestRecordsComponent />);

    await act(async () => {
      // allow promise to settle
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(screen.getByTestId('error-state').textContent).toContain('PostgREST server connection timeout');
    expect(screen.getByTestId('interviews-count').textContent).toBe('0');
  });

  // (b) paging combining 2,500 mocked rows
  it('(b) pages through Supabase in chunks of 1000 combining 2,500 mocked rows', async () => {
    // Generate 2,500 mock raw database rows
    const mock2500Rows = Array.from({ length: 2500 }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      interviewee_name: `Officer ${i + 1}`,
      role_title: 'Inspector',
      department_unit: 'Labour Standards',
      years_in_role: 3,
      interviewer_id: '00000000-0000-4000-8000-000000000001',
      tier: 'Management',
      status: 'Completed',
      duration_min: 60,
      completion_percentage: 100,
      created_at: '2025-09-20T10:00:00Z',
      profiles: { full_name: 'Lead Commissioner' },
    }));

    const rangeCalls: { from: number; to: number }[] = [];

    const queryMock: any = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockImplementation((from: number, to: number) => {
        rangeCalls.push({ from, to });
        const sliced = mock2500Rows.slice(from, to + 1);
        return Promise.resolve({ data: sliced, error: null });
      }),
    };

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'interviews') return queryMock;
      return { select: vi.fn().mockReturnThis() } as any;
    });

    const result = await fetchInterviewsOrThrow();

    // Verify 3 pages were fetched: 0..999, 1000..1999, 2000..2999
    expect(rangeCalls).toEqual([
      { from: 0, to: 999 },
      { from: 1000, to: 1999 },
      { from: 2000, to: 2999 },
    ]);

    // Verify all 2,500 rows were combined into the final result
    expect(result.length).toBe(2500);
    expect(result[0].interviewee_name).toBe('Officer 1');
    expect(result[2499].interviewee_name).toBe('Officer 2500');

    // Also test fetchAllInterviewsGlobalOrThrow
    rangeCalls.length = 0;
    const globalResult = await fetchAllInterviewsGlobalOrThrow();
    expect(rangeCalls.length).toBe(3);
    expect(globalResult.length).toBe(2500);
  });

  // (b2) analytics paging and .in() chunking to <= 200 IDs per request
  it('(b2) reportService.fetchAnalyticsDataset chunks interviewer_notes .in() queries to <= 200 IDs', async () => {
    // Generate 450 interview records
    const mockInterviews = Array.from({ length: 450 }, (_, i) => ({
      id: `10000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      interviewee_name: `Interviewee ${i}`,
      role_title: 'Officer',
      department_unit: 'Labour Unit',
      interviewer_id: 'usr-1',
      interviewer_name: 'Interviewer One',
      tier: 'Management',
      status: 'Completed',
      duration_min: 60,
      completion_percentage: 100,
      created_at: '2025-09-20T10:00:00Z',
    }));

    const inListSizes: number[] = [];

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'interviews') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({ data: mockInterviews, error: null }),
        } as any;
      }
      if (table === 'interviewer_notes') {
        const notesQuery: any = {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockImplementation((_col: string, ids: string[]) => {
            inListSizes.push(ids.length);
            return notesQuery;
          }),
          range: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
        return notesQuery;
      }
      return { select: vi.fn().mockReturnThis() } as any;
    });

    const defaultFilters: AnalyticsFilters = {
      dateRange: 'all',
      tier: 'All Tiers',
      status: 'All Statuses',
      department: 'All Departments',
      interviewerId: 'All Interviewers',
    };

    const dataset = await fetchAnalyticsDataset(defaultFilters);
    expect(dataset.kpis.totalInterviews).toBe(450);

    // 450 IDs chunked into <= 200 per request: 200, 200, 50
    expect(inListSizes).toEqual([200, 200, 50]);
  });

  // (c) fail-closed sign-out when profile fetch errors
  it('(c) fail-closed: signs user out and sets authError without fabricating profile when profile fetch errors', async () => {
    const signOutSpy = vi.fn().mockResolvedValue({ error: null });

    vi.spyOn(supabase.auth, 'signOut').mockImplementation(signOutSpy);
    vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({
      data: {
        user: { id: 'usr-troubled', email: 'officer@mglsd.go.ug' } as any,
        session: { access_token: 'valid-token' } as any,
      },
      error: null,
    });

    // Mock profiles select to fail with database error
    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection refused: 503', code: '503' },
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        } as any;
      }
      return { select: vi.fn().mockReturnThis() } as any;
    });

    function TestAuthConsumer() {
      const { user, authError, login } = useAuth();
      return (
        <div>
          <div data-testid="user-id">{user?.id || 'none'}</div>
          <div data-testid="auth-error">{authError || 'no-error'}</div>
          <button
            data-testid="login-btn"
            onClick={() => login('officer@mglsd.go.ug', 'SecurePass123!')}
          >
            Login
          </button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    // Click login
    await act(async () => {
      screen.getByTestId('login-btn').click();
    });

    // 1. Verify user was signed out fail-closed (NOT fabricated into 'interviewer')
    expect(signOutSpy).toHaveBeenCalled();
    expect(screen.getByTestId('user-id').textContent).toBe('none');

    // 2. Verify authError is set with mapped friendly error
    const errorText = screen.getByTestId('auth-error').textContent;
    expect(errorText).toBeDefined();
    expect(errorText).not.toBe('no-error');
    expect(errorText).toContain('Unable to connect to the authentication server');
  });

  // (d) the onAuthStateChange callback not awaiting Supabase calls
  it('(d) onAuthStateChange callback does not await Supabase calls and schedules work via setTimeout', async () => {
    setEnableAuthListenerForTesting(true);
    vi.useFakeTimers();

    let capturedAuthCallback: ((event: string, session: any) => any) | null = null;

    vi.spyOn(supabase.auth, 'onAuthStateChange').mockImplementation(((callback: any) => {
      capturedAuthCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }) as any);

    const profileQuerySpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'usr-callback', email: 'officer@mglsd.go.ug', role: 'interviewer' },
          error: null,
        }),
      }),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: profileQuerySpy,
        } as any;
      }
      return { select: vi.fn().mockReturnThis() } as any;
    });

    render(
      <AuthProvider>
        <div data-testid="app-ready">Ready</div>
      </AuthProvider>
    );

    expect(capturedAuthCallback).toBeDefined();

    // Invoke the callback with SIGNED_IN event
    const fakeSession = {
      user: { id: 'usr-callback', email: 'officer@mglsd.go.ug' },
      access_token: 'token-abc',
    };

    let callbackReturnValue: any;
    act(() => {
      callbackReturnValue = capturedAuthCallback!('SIGNED_IN', fakeSession);
    });

    // 1. Assert callback did NOT return a Promise (not an async function that deadlocks gotrue)
    expect(callbackReturnValue && typeof callbackReturnValue.then === 'function').toBeFalsy();

    // 2. Assert profile query has NOT executed synchronously yet
    expect(profileQuerySpy).not.toHaveBeenCalled();

    // 3. Fast-forward timer: scheduled work via setTimeout executes
    await act(async () => {
      vi.runAllTimers();
    });

    expect(profileQuerySpy).toHaveBeenCalled();

    vi.useRealTimers();
  });
});
