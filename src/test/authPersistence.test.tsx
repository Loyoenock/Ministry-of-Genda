import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { supabase, setSupabaseConfiguredForTesting } from '../lib/supabase';

// Mock supabase
vi.mock('../lib/supabase', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, any>;
  return {
    ...actual,
    supabase: {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(),
        })),
      })),
    },
  };
});

function TestConsumer() {
  const { allUsers, updateUserRole, authError, demoLogin } = useAuth();
  return (
    <div>
      <div data-testid="user-role">
        {allUsers.find(u => u.id === 'usr-charles-003')?.role}
      </div>
      <button data-testid="login-admin" onClick={() => demoLogin('admin')}>
        Login Admin
      </button>
      <button data-testid="update-btn" onClick={async () => await updateUserRole('usr-charles-003', 'admin')}>
        Update Role
      </button>
      {authError && <div data-testid="error-toast">{authError}</div>}
    </div>
  );
}

describe('AuthContext - updateUserRole Transactionality', () => {
  beforeEach(() => {
    setSupabaseConfiguredForTesting(true);
    vi.clearAllMocks();
  });

  it('rolls back local state on Supabase update failure', async () => {
    // Mock Supabase failure with delay
    (supabase.from as any).mockReturnValue({
      update: vi.fn(() => ({
        eq: vi.fn().mockImplementation(() => new Promise((resolve) => {
          setTimeout(() => resolve({ error: { message: 'Network Error' } }), 50);
        })),
      })),
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Login as admin
    await act(async () => {
      screen.getByTestId('login-admin').click();
    });

    expect(screen.getByTestId('user-role').textContent).toBe('interviewer');

    await act(async () => {
      await screen.getByTestId('update-btn').click();
    });

    // Verify optimistic update
    expect(screen.getByTestId('user-role').textContent).toBe('admin');

    // Wait for setTimeout to execute
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    // Optimistic update should have reverted
    expect(screen.getByTestId('user-role').textContent).toBe('interviewer');
    expect(screen.getByTestId('error-toast').textContent).toBe('Failed to update role – changes reverted');
  });
});
