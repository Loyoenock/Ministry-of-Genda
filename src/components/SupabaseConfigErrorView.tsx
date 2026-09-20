/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { supabaseConfig } from '../lib/supabase';
import { Database, ShieldAlert, CheckCircle2, XCircle, Copy, Check, RefreshCw, ExternalLink } from 'lucide-react';

export const SupabaseConfigErrorView: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const details = supabaseConfig.details;

  const handleCopy = () => {
    const snippet = `SUPABASE_URL=https://your-project.supabase.co\nSUPABASE_ANON_KEY=your-anon-key`;
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#070d1f] text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-teal-500 selection:text-white">
      <div className="max-w-xl w-full bg-slate-900/90 border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-8 backdrop-blur-xl relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-2xl flex items-center justify-center shrink-0 text-amber-400 shadow-inner">
            <ShieldAlert className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold tracking-widest text-amber-400 uppercase bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                MGLSD Labour Directorate
              </span>
              <span className="text-[10px] font-semibold text-slate-400">Diagnostic Suite</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mt-1">Supabase Configuration Required</h1>
          </div>
        </div>

        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <p className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/50 text-slate-200">
            {supabaseConfig.errorMessage || 'A live Supabase backend connection is strictly required for secure authentication, row-level security (RLS), and encrypted data synchronization.'}
          </p>

          {/* Diagnostic status checklist */}
          <div className="space-y-2 bg-slate-950/50 p-4 rounded-2xl border border-slate-800 font-mono text-[11px]">
            <p className="text-slate-400 font-bold uppercase tracking-wider mb-2">Environment Diagnostics</p>
            
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="flex items-center space-x-2 text-slate-300">
                {details?.hasUrl ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                <span>SUPABASE_URL provided</span>
              </span>
              <span className={details?.hasUrl ? 'text-emerald-400' : 'text-rose-400'}>
                {details?.hasUrl ? (supabaseConfig.maskedUrl || 'Present') : 'Missing'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="flex items-center space-x-2 text-slate-300">
                {details?.hasKey ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                <span>SUPABASE_ANON_KEY provided</span>
              </span>
              <span className={details?.hasKey ? 'text-emerald-400' : 'text-rose-400'}>
                {details?.hasKey ? (supabaseConfig.maskedKey || 'Present') : 'Missing'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="flex items-center space-x-2 text-slate-300">
                {!details?.isUrlPlaceholder && !details?.isKeyPlaceholder ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                <span>Not placeholder values</span>
              </span>
              <span className={!details?.isUrlPlaceholder && !details?.isKeyPlaceholder ? 'text-emerald-400' : 'text-amber-400'}>
                {!details?.isUrlPlaceholder && !details?.isKeyPlaceholder ? 'Valid' : 'Placeholder detected'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="flex items-center space-x-2 text-slate-300">
                {details?.hasValidProtocol ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                <span>HTTPS / HTTP protocol</span>
              </span>
              <span className={details?.hasValidProtocol ? 'text-emerald-400' : 'text-rose-400'}>
                {details?.hasValidProtocol ? 'Valid' : 'Invalid'}
              </span>
            </div>
          </div>

          {/* Troubleshooting checklist */}
          <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/20 text-slate-300 space-y-1.5 text-[11px]">
            <p className="font-bold text-amber-400">Troubleshooting Checklist:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>Confirm <code className="text-teal-300">.env</code> is located in the project root (same directory as <code className="text-teal-300">package.json</code>).</li>
              <li>Restart your dev server completely (<code className="text-teal-300">npm run dev</code>) after changing <code className="text-teal-300">.env</code>.</li>
              <li>Ensure variable names are set to <code className="text-teal-300">SUPABASE_URL</code> and <code className="text-teal-300">SUPABASE_ANON_KEY</code>.</li>
              <li>Remove any accidental wrapping quotes around the URL or key values in <code className="text-teal-300">.env</code>.</li>
            </ul>
          </div>
        </div>

        {/* Actionable instructions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Setup Instructions
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 text-[11px] text-teal-400 hover:text-teal-300 transition bg-teal-500/10 hover:bg-teal-500/20 px-2.5 py-1 rounded-lg border border-teal-500/25"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Template!' : 'Copy .env Template'}</span>
            </button>
          </div>

          <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1.5 shadow-inner">
            <p className="text-amber-400 font-bold"># Create or update your .env file at the project root:</p>
            <p className="text-teal-300">SUPABASE_URL=https://your-project-id.supabase.co</p>
            <p className="text-teal-300">SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</p>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center space-x-1.5 transition"
          >
            <Database className="w-3.5 h-3.5 text-teal-400" />
            <span>Open Supabase Dashboard</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-teal-900/40 transition flex items-center justify-center space-x-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Application</span>
          </button>
        </div>
      </div>
    </div>
  );
};
