/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  FileEdit,
  Hash,
  Activity,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { InterviewerNote } from '../../types';

interface NotesTabProps {
  interviewId: string;
  localNotes: InterviewerNote;
  onNoteFieldChange: (field: keyof InterviewerNote, value: any) => void;
  onNumbersCapturedChange: (metricKey: string, val: any) => void;
  onMaturityScoreChange: (domain: string, score: number) => void;
}

export const NotesTab: React.FC<NotesTabProps> = ({
  localNotes,
  onNoteFieldChange,
  onNumbersCapturedChange,
  onMaturityScoreChange,
}) => {
  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex items-center space-x-3">
        <span className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
          <FileEdit className="w-5 h-5" />
        </span>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Interviewer Synthesis, Operational Observations & Maturity Assessment
          </h2>
          <p className="text-xs text-slate-500">
            Record confidential field reflections, non-verbal cues, unprompted admissions, and quantitative administrative metrics.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Observations & Field Reflections */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <Lightbulb className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              General Observations & Atmosphere
            </span>
          </div>

          <div>
            <label
              htmlFor="notes-observations"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Overall Interview Atmosphere & Openness
            </label>
            <textarea
              id="notes-observations"
              data-testid="notes-observations"
              rows={4}
              placeholder="e.g. Officer was exceptionally forthcoming regarding inspectorate staffing shortages, but guarded about revenue remissions..."
              value={localNotes.observations || ''}
              onChange={(e) => onNoteFieldChange('observations', e.target.value)}
              className="w-full p-3 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none resize-y"
            />
          </div>

          <div>
            <label
              htmlFor="notes-cues"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Non-verbal Cues & Reluctance Points
            </label>
            <textarea
              id="notes-cues"
              rows={3}
              placeholder="Note any hesitation when discussing enforcement against high-profile political employers or prosecution files..."
              value={localNotes.non_verbal_cues || ''}
              onChange={(e) => onNoteFieldChange('non_verbal_cues', e.target.value)}
              className="w-full p-3 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none resize-y"
            />
          </div>

          <div>
            <label
              htmlFor="notes-bottlenecks"
              className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span>Critical Bottlenecks & Operational Pain Points</span>
            </label>
            <textarea
              id="notes-bottlenecks"
              rows={3}
              placeholder="Primary bottlenecks cited (fuel allowances, lack of vehicles, archaic registry system, judicial delays)..."
              value={localNotes.critical_bottlenecks || ''}
              onChange={(e) => onNoteFieldChange('critical_bottlenecks', e.target.value)}
              className="w-full p-3 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none resize-y"
            />
          </div>

          <div>
            <label
              htmlFor="notes-quotes"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Notable Direct Quotations
            </label>
            <textarea
              id="notes-quotes"
              rows={3}
              placeholder="&ldquo;We have 4 inspectors covering 14 districts across Karamoja with zero functional motorcycles.&rdquo;"
              value={localNotes.direct_quotes || ''}
              onChange={(e) => onNoteFieldChange('direct_quotes', e.target.value)}
              className="w-full p-3 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none resize-y font-serif italic text-slate-700"
            />
          </div>
        </div>

        {/* Quantitative Metrics & Maturity Assessment */}
        <div className="space-y-6">
          {/* Numbers Captured Section */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
              <Hash className="w-4 h-4 text-teal-700" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Quantitative Administrative Metrics
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label
                  htmlFor="metric-staff-approved"
                  className="block text-slate-600 font-semibold mb-1"
                >
                  Staff Strength (Approved)
                </label>
                <input
                  id="metric-staff-approved"
                  type="number"
                  placeholder="e.g. 85"
                  value={localNotes.numbers_captured?.staff_approved || ''}
                  onChange={(e) =>
                    onNumbersCapturedChange('staff_approved', parseInt(e.target.value) || 0)
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="metric-staff-actual"
                  className="block text-slate-600 font-semibold mb-1"
                >
                  Staff Strength (Actual Filled)
                </label>
                <input
                  id="metric-staff-actual"
                  type="number"
                  placeholder="e.g. 42"
                  value={localNotes.numbers_captured?.staff_actual || ''}
                  onChange={(e) =>
                    onNumbersCapturedChange('staff_actual', parseInt(e.target.value) || 0)
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="metric-annual-budget"
                  className="block text-slate-600 font-semibold mb-1"
                >
                  Annual Operational Budget (UGX)
                </label>
                <input
                  id="metric-annual-budget"
                  type="text"
                  placeholder="e.g. 1,450,000,000"
                  value={localNotes.numbers_captured?.annual_budget_ugx || ''}
                  onChange={(e) =>
                    onNumbersCapturedChange('annual_budget_ugx', e.target.value)
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="metric-inspections"
                  className="block text-slate-600 font-semibold mb-1"
                >
                  Inspections Conducted (Last FY)
                </label>
                <input
                  id="metric-inspections"
                  type="number"
                  placeholder="e.g. 320"
                  value={localNotes.numbers_captured?.inspections_conducted || ''}
                  onChange={(e) =>
                    onNumbersCapturedChange('inspections_conducted', parseInt(e.target.value) || 0)
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="metric-disputes"
                  className="block text-slate-600 font-semibold mb-1"
                >
                  Disputes / Complaints Handled
                </label>
                <input
                  id="metric-disputes"
                  type="number"
                  placeholder="e.g. 1140"
                  value={localNotes.numbers_captured?.disputes_handled || ''}
                  onChange={(e) =>
                    onNumbersCapturedChange('disputes_handled', parseInt(e.target.value) || 0)
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="metric-court-cases"
                  className="block text-slate-600 font-semibold mb-1"
                >
                  Active Court Cases / Prosecutions
                </label>
                <input
                  id="metric-court-cases"
                  type="number"
                  placeholder="e.g. 18"
                  value={localNotes.numbers_captured?.prosecutions || ''}
                  onChange={(e) =>
                    onNumbersCapturedChange('prosecutions', parseInt(e.target.value) || 0)
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Maturity Signals Evaluation */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
              <Activity className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Institutional Maturity Signals (1 = Nascent, 5 = Optimized)
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {[
                {
                  key: 'regulatory_enforcement',
                  label: 'Regulatory Enforcement Rigour',
                  desc: 'Ability to detect, sanction, and prosecute labour non-compliance',
                },
                {
                  key: 'digital_infrastructure',
                  label: 'Digital Infrastructure & Data Integration',
                  desc: 'Reliance on automated software vs paper records',
                },
                {
                  key: 'resource_autonomy',
                  label: 'Resource & Operational Autonomy',
                  desc: 'Adequacy of budget, transport, and protective inspector equipment',
                },
                {
                  key: 'inter_agency_synergy',
                  label: 'Inter-Agency & Social Partner Synergy',
                  desc: 'Coordination with NOTU, COFTU, FUE, URA, and Police',
                },
                {
                  key: 'policy_relevance',
                  label: 'Policy & Legal Modernity',
                  desc: 'Currency of statutory instruments regarding gig work and OSH',
                },
              ].map(({ key, label, desc }) => {
                const currentScore = localNotes.maturity_signals?.[key] || 3;

                return (
                  <div key={key} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-800">{label}</span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-900">
                        Score: {currentScore}/5
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2">{desc}</p>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          onClick={() => onMaturityScoreChange(key, val)}
                          className={`flex-1 py-1 text-xs font-bold rounded-lg transition ${
                            currentScore === val
                              ? 'bg-teal-700 text-white shadow-2xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
