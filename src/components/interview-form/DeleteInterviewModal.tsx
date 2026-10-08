/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { Interview } from '../../types';

interface DeleteInterviewModalProps {
  interview: Interview;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteInterviewModal: React.FC<DeleteInterviewModalProps> = ({
  interview,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-interview-title"
      data-testid="confirm-delete-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-3 bg-rose-100 text-rose-700 rounded-xl shrink-0">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
          </div>
          <div className="space-y-1">
            <h3
              id="delete-interview-title"
              data-testid="confirm-delete-title"
              className="text-base font-bold text-slate-900"
            >
              Permanently delete this interview?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              This will remove the interview, all answers, checklist items, notes and uploaded files. This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Target Interview Record Details */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1">
          <div>
            <strong className="text-slate-800">Participant:</strong> {interview.interviewee_name}
          </div>
          <div>
            <strong className="text-slate-800">Role & Department:</strong> {interview.role_title} ({interview.department_unit})
          </div>
          <div>
            <strong className="text-slate-800">Tier & Status:</strong> {interview.tier} &bull; {interview.status}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            data-testid="cancel-delete-btn"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition min-h-[42px]"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="confirm-delete-btn"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold transition flex items-center space-x-2 min-h-[42px] shadow-sm"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 text-white" />
                <span>Delete permanently</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
