/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthProvider } from '../context/AuthContext';
import { LoginView } from '../components/LoginView';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

describe('Supabase Client & Auth System', () => {
  it('exports valid supabase client and isSupabaseConfigured flag', () => {
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
    expect(typeof isSupabaseConfigured).toBe('boolean');
  });

  it('renders LoginView with Uganda Ministry branding', () => {
    render(
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    );

    expect(screen.getAllByText(/Ministry of Gender, Labour and Social Development/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Labour Directorate Diagnostic/i)).toBeDefined();
  });
});
