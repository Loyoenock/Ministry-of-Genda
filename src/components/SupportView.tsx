/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HelpCircle, BookOpen, Layers, ShieldCheck, Phone, Mail, FileQuestion } from 'lucide-react';

export const SupportView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Interviewer Field Manual & Support</h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Operational methodology for the TRANSFORMATIVE Labour Directorate Diagnostic Exercise.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Dynamic Tier-Based Routing</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            The interview application automatically adapts questions according to the interviewee's role:
          </p>
          <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
            <li><strong>Leadership:</strong> Focuses on mandate, strategy, budget, and cross-sectoral governance (Sections A, B, D, G, H).</li>
            <li><strong>Management:</strong> Covers comprehensive operational and department oversight (Sections A through H).</li>
            <li><strong>Frontline Staff:</strong> Focuses on actual field tools, daily casework, inspection logistics, and pain points (Sections C, E, F, H).</li>
            <li><strong>Support / IT / Records:</strong> Detailed technical systems, registries, and the 4 live system demonstrations (Sections E, G, H + W1–W4).</li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Document Verification Protocol</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Verify each of the 20 statutory documents against physical ledgers or digital copies. Mark both the <em>Exists</em> status (Yes, No, Partial, Unknown) and the <em>Collected</em> status (Collected, Pending, Refused, N/A). Attach verified PDF/image scans where available.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Data Integrity & Offline Resilience</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            All typed responses and numbers auto-save seamlessly. Even during intermittent connectivity at regional labour offices, records are securely persisted in local encrypted storage and synced back automatically.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Phone className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">MGLSD Diagnostic Helpdesk</h3>
          <div className="text-xs text-slate-600 space-y-1">
            <p><strong>TRANSFORMATIVE Project Management Unit:</strong></p>
            <p>Ministry of Gender, Labour and Social Development</p>
            <p>Plot 2, Simbamanyo House, George Street, Kampala</p>
            <p className="pt-1"><strong>Support Hotline:</strong> +256 414 347 854 / +256 701 445 678</p>
            <p><strong>Technical Email:</strong> diagnostic-support@mglsd.go.ug</p>
          </div>
        </div>
      </div>
    </div>
  );
};
