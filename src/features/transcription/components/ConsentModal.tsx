/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, Check, X, AlertCircle } from 'lucide-react';

interface ConsentModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  isSubmitting = false,
}) => {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 id="consent-modal-title" className="text-base font-bold text-slate-900 leading-tight">
                Participant Consent Required
              </h3>
              <p className="text-xs text-slate-500">Live Audio Transcription Protocol</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            aria-label="Close consent dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-4 space-y-3 text-xs leading-relaxed text-slate-600">
          <div className="p-3 bg-teal-50/70 border border-teal-100 rounded-xl space-y-1.5">
            <p className="font-semibold text-teal-950 flex items-center space-x-1.5">
              <span>National Guidance & Privacy Safeguards</span>
            </p>
            <ul className="list-disc pl-4 space-y-1 text-teal-900 text-[11px]">
              <li>
                <strong>No Audio Storage:</strong> Audio streams are processed in real time and immediately discarded. No audio recordings or waveforms are saved to local or cloud storage.
              </li>
              <li>
                <strong>Encrypted In-Transit:</strong> Live streams are transmitted over TLS-encrypted streaming channels to the regional transcription processor.
              </li>
              <li>
                <strong>Access Restricted:</strong> Stored transcript text is bound strictly to this interview ID and protected by government row-level security.
              </li>
            </ul>
          </div>

          <label className="flex items-start space-x-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition select-none">
            <input
              type="checkbox"
              data-testid="consent-checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              disabled={isSubmitting}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600 cursor-pointer"
            />
            <span className="text-xs text-slate-700 font-medium">
              I certify that the interviewee has been informed of live transcription and explicitly consented to speech-to-text processing for this diagnostic session.
            </span>
          </label>
        </div>

        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            data-testid="consent-cancel-btn"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="consent-confirm-btn"
            onClick={onConfirm}
            disabled={!agreed || isSubmitting}
            className="px-4 py-2 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 disabled:opacity-50 disabled:hover:bg-teal-800 rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{isSubmitting ? 'Confirming...' : 'Confirm & Start'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
