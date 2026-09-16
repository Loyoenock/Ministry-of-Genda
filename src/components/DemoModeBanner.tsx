/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AlertTriangle, Database, X, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const DemoModeBanner: React.FC = () => {
  const { isDemoMode, isSupabaseConfigured } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (!isDemoMode || isSupabaseConfigured || dismissed) {
    return null;
  }

  return (
    <div
      role="status"
      aria-label="Demo mode warning banner"
      className="bg-amber-500/10 border-b border-amber-500/30 text-amber-900 px-3 sm:px-4 py-2 text-xs transition-all animate-in fade-in duration-300"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1 bg-amber-200/70 text-amber-900 font-bold px-2 py-0.5 rounded text-[10px] tracking-wide uppercase shrink-0">
            <AlertTriangle className="w-3 h-3 text-amber-700" />
            Demo Mode
          </span>
          <p className="truncate text-amber-950 font-medium">
            Running offline with simulated mock data. Authenticated actions & interviews are stored in local browser memory.
          </p>
          <span className="hidden md:inline text-amber-800 text-[11px]">
            (Set <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-[10px]">VITE_SUPABASE_URL</code> to enable persistent cloud storage)
          </span>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1 text-amber-800 hover:text-amber-950 hover:bg-amber-500/20 rounded transition"
          aria-label="Dismiss demo mode warning"
          title="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
