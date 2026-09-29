/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { AuthProvider } from '../context/AuthContext';
import { UserManagementView } from '../components/UserManagementView';
import { setSupabaseConfiguredForTesting } from '../lib/supabase';

vi.mock('../lib/supabase', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, any>;
  return {
    ...actual,
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
      channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
      removeChannel: vi.fn(),
    },
  };
});

describe('User Management Admin Full CRUD', () => {
  beforeEach(() => {
    setSupabaseConfiguredForTesting(true);
    vi.clearAllMocks();
  });

  it('renders user list and filters by search', () => {
    render(
      <AuthProvider>
        <UserManagementView />
      </AuthProvider>
    );

    // Initial users present from test fixtures
    expect(screen.getAllByText(/John Okello/i)[0]).toBeInTheDocument();

    // Filter by search
    const searchInput = screen.getByTestId('user-search-input');
    fireEvent.change(searchInput, { target: { value: 'Charles' } });

    expect(screen.getAllByText(/Charles Kato/i)[0]).toBeInTheDocument();
    expect(screen.queryByText(/John Okello/i)).not.toBeInTheDocument();
  });

  it('allows admin to create a new user', async () => {
    render(
      <AuthProvider>
        <UserManagementView />
      </AuthProvider>
    );

    // Open add modal
    fireEvent.click(screen.getByTestId('add-user-btn'));

    // Fill new user details
    fireEvent.change(screen.getByTestId('create-user-fullname'), {
      target: { value: 'Christine Akello' },
    });
    fireEvent.change(screen.getByTestId('create-user-email'), {
      target: { value: 'christine.akello@mglsd.go.ug' },
    });
    fireEvent.change(screen.getByTestId('create-user-dept'), {
      target: { value: 'Dispute Settlement Unit' },
    });

    // Submit
    await act(async () => {
      fireEvent.click(screen.getByTestId('create-user-submit-btn'));
    });

    // Verify user appears in table
    expect(screen.getAllByText(/Christine Akello/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/christine.akello@mglsd.go.ug/i)[0]).toBeInTheDocument();
  });

  it('allows admin to edit user details', async () => {
    render(
      <AuthProvider>
        <UserManagementView />
      </AuthProvider>
    );

    // Click edit on Charles Kato
    const editBtns = screen.getAllByTestId('edit-user-btn-usr-charles-003');
    fireEvent.click(editBtns[0]);

    // Change full name and department
    const nameInput = screen.getByTestId('edit-user-fullname');
    fireEvent.change(nameInput, { target: { value: 'Charles Kato Senior Inspector' } });

    await act(async () => {
      fireEvent.click(screen.getByTestId('edit-user-submit-btn'));
    });

    expect(screen.getAllByText(/Charles Kato Senior Inspector/i)[0]).toBeInTheDocument();
  });

  it('allows admin to delete a user with confirmation', async () => {
    render(
      <AuthProvider>
        <UserManagementView />
      </AuthProvider>
    );

    expect(screen.getAllByText(/Mary Ayebare/i)[0]).toBeInTheDocument();

    // Click delete on Mary Ayebare
    const deleteBtns = screen.getAllByTestId('delete-user-btn-usr-mary-004');
    fireEvent.click(deleteBtns[0]);

    // Confirm modal appears
    expect(screen.getByText(/Delete User Account/i)).toBeInTheDocument();

    // Confirm deletion
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-delete-user-btn'));
    });

    expect(screen.queryByTestId('user-card-usr-mary-004')).not.toBeInTheDocument();
    expect(screen.queryByTestId('user-row-usr-mary-004')).not.toBeInTheDocument();
  });
});
