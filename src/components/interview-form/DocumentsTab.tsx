/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  FileText,
  Upload,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  Loader2,
  X,
  FileCheck,
} from 'lucide-react';
import { DocumentItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { getDocumentSignedUrl } from '../../lib/interviewService';

interface DocumentsTabProps {
  interviewId: string;
  checklist: DocumentItem[];
  onUpdateChecklistItem: (
    interviewId: string,
    itemNumber: number,
    updates: Partial<DocumentItem>
  ) => void;
  onUploadDocumentFile: (
    interviewId: string,
    itemNumber: number,
    fileOrName: File | string
  ) => Promise<string | void> | void;
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({
  interviewId,
  checklist,
  onUpdateChecklistItem,
  onUploadDocumentFile,
}) => {
  const { isDemoMode, isSupabaseConfigured } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetUploadItemRef = useRef<number | null>(null);

  const [actionToast, setActionToast] = useState<{
    type: 'info' | 'success' | 'error';
    message: string;
    submessage?: string;
  } | null>(null);
  const [activeRetrievalItem, setActiveRetrievalItem] = useState<number | null>(null);
  const [uploadingItemNumber, setUploadingItemNumber] = useState<number | null>(null);

  const collectedCount = checklist.filter((i) => i.collected_status === 'Collected').length;

  const handleTriggerUpload = (itemNumber: number) => {
    targetUploadItemRef.current = itemNumber;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetItem = targetUploadItemRef.current;
    if (!file || !targetItem) return;

    setUploadingItemNumber(targetItem);
    setActionToast(null);

    try {
      await onUploadDocumentFile(interviewId, targetItem, file);
      if (!isSupabaseConfigured || isDemoMode) {
        setActionToast({
          type: 'info',
          message: 'Demo Mode – file metadata saved only. Binary content is not persisted.',
          submessage: `Attached metadata for "${file.name}" on checklist item #${targetItem}.`,
        });
      } else {
        setActionToast({
          type: 'success',
          message: `File uploaded successfully: "${file.name}"`,
          submessage: 'Securely stored in private bucket "interview-documents" with 1-hour signed access.',
        });
      }
    } catch (err: any) {
      const errMsg = err?.message || 'An unexpected error occurred during document upload.';
      setActionToast({
        type: 'error',
        message: errMsg,
        submessage: 'The upload was aborted and the checklist item was restored to its previous state.',
      });
    } finally {
      setUploadingItemNumber(null);
    }
  };

  const handleDownloadOrView = async (item: DocumentItem) => {
    const fileRef = item.file_url || item.storage_path;
    if (!fileRef) return;

    // Demo mode interception
    if (
      !isSupabaseConfigured ||
      isDemoMode ||
      fileRef.startsWith('#demo-') ||
      fileRef.startsWith('#')
    ) {
      setActionToast({
        type: 'info',
        message: 'Demo Mode – file metadata saved only. Binary content is not persisted.',
        submessage: `File "${item.file_name || 'Document'}" was recorded as an offline metadata entry in this session.`,
      });
      return;
    }

    try {
      setActiveRetrievalItem(item.item_number);
      setActionToast(null);
      const signedUrl = await getDocumentSignedUrl(fileRef, 3600);
      if (signedUrl && !signedUrl.startsWith('#')) {
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
        setActionToast({
          type: 'success',
          message: `Opening secure document in new tab`,
          submessage: 'Generated fresh 1-hour time-limited signed URL from private repository.',
        });
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Access denied by security policy.';
      setActionToast({
        type: 'error',
        message: errMsg,
        submessage: 'You may not have the required interviewer or admin permissions for this interview file.',
      });
    } finally {
      setActiveRetrievalItem(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input for Document Attachment Uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        className="hidden"
        aria-label="Upload document file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.csv,.txt"
      />

      {/* Demo Mode Notice Banner */}
      {(!isSupabaseConfigured || isDemoMode) && (
        <div
          role="status"
          className="bg-amber-500/10 border border-amber-500/30 text-amber-950 p-4 rounded-2xl flex items-start gap-3 text-xs shadow-2xs animate-in fade-in duration-200"
        >
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-900">Demo Mode Active</span>
              <span className="bg-amber-200/80 text-amber-900 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
                Metadata Only
              </span>
            </div>
            <p className="text-amber-900/90 leading-relaxed font-medium">
              Demo Mode – file metadata saved only. Binary content is not persisted.
            </p>
            <p className="text-amber-800 text-[11px]">
              Uploaded file names and collection states are tracked locally in this session, avoiding browser storage quotas.
            </p>
          </div>
        </div>
      )}

      {/* Notification Toast / Alert */}
      {actionToast && (
        <div
          role="alert"
          className={`p-4 rounded-2xl border flex items-start justify-between gap-3 text-xs shadow-2xs transition animate-in fade-in duration-200 ${
            actionToast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : actionToast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {actionToast.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            ) : actionToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold">{actionToast.message}</p>
              {actionToast.submessage && (
                <p className="mt-0.5 text-[11px] opacity-90">{actionToast.submessage}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setActionToast(null)}
            className="p-1 hover:bg-black/5 rounded text-current opacity-70 hover:opacity-100 transition"
            aria-label="Close notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Summary Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
              <FileText className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Statutory Documents & Operational Evidentiary Checklist
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Verify the existence, location, format, and confidentiality rating of mandatory directorate registers, policy frameworks, inspection logs, and statutory returns.
          </p>
        </div>

        <div className="flex items-center space-x-4 bg-slate-50 p-3 rounded-xl border border-slate-200/70 shrink-0">
          <div>
            <div className="text-xs font-medium text-slate-500">Collected</div>
            <div className="text-lg font-black text-teal-700">
              {collectedCount} / {checklist.length}
            </div>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div>
            <div className="text-xs font-medium text-slate-500">Rate</div>
            <div className="text-lg font-black text-slate-800">
              {checklist.length > 0 ? Math.round((collectedCount / checklist.length) * 100) : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Document Items List */}
      <div className="grid grid-cols-1 gap-4">
        {checklist.map((item) => {
          const isCollected = item.collected_status === 'Collected';
          const hasFile = Boolean(item.file_name || item.file_url);

          return (
            <div
              key={item.item_number}
              data-testid={`checklist-item-${item.item_number}`}
              className={`bg-white rounded-2xl border p-5 transition shadow-xs ${
                isCollected
                  ? 'border-teal-200/90 bg-teal-50/10'
                  : 'border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                {/* Left: Document Info */}
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-900 font-mono text-xs font-black flex items-center justify-center">
                      #{item.item_number}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {item.category}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      Ref: {item.statutory_reference}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {item.document_name}
                  </h3>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    {item.purpose_description}
                  </p>
                </div>

                {/* Right: Status & Action Toggles */}
                <div className="w-full lg:w-96 shrink-0 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/70">
                  {/* Exists Toggle */}
                  <div>
                    <span className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Existence Status
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {(['Yes', 'No', 'Partial', 'Unknown'] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() =>
                            onUpdateChecklistItem(interviewId, item.item_number, {
                              exists_status: status,
                            })
                          }
                          className={`py-1 text-[11px] font-semibold rounded-md transition ${
                            item.exists_status === status
                              ? 'bg-teal-700 text-white shadow-2xs'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Collected Toggle */}
                  <div>
                    <span className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Collection Status
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['Collected', 'Not Collected', 'Requested', 'Not Applicable'] as const).map((col) => (
                        <button
                          key={col}
                          data-testid={`col-status-${item.item_number}-${col.replace(/\s+/g, '-').toLowerCase()}`}
                          onClick={() =>
                            onUpdateChecklistItem(interviewId, item.item_number, {
                              collected_status: col,
                            })
                          }
                          className={`py-1 px-2 text-[11px] font-semibold rounded-md transition truncate ${
                            item.collected_status === col
                              ? col === 'Collected'
                                ? 'bg-emerald-700 text-white font-bold shadow-2xs'
                                : 'bg-slate-800 text-white'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {col}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Metadata Row: Confidentiality & Format */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200">
                    <div>
                      <label
                        htmlFor={`conf-${item.item_number}`}
                        className="block text-[10px] font-semibold text-slate-500 uppercase"
                      >
                        Confidentiality
                      </label>
                      <select
                        id={`conf-${item.item_number}`}
                        value={item.confidentiality || 'Internal'}
                        onChange={(e) =>
                          onUpdateChecklistItem(interviewId, item.item_number, {
                            confidentiality: e.target.value as any,
                          })
                        }
                        className="w-full mt-0.5 p-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 outline-none"
                      >
                        <option value="Public">Public</option>
                        <option value="Internal">Internal</option>
                        <option value="Restricted">Restricted</option>
                        <option value="Confidential">Confidential</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor={`format-${item.item_number}`}
                        className="block text-[10px] font-semibold text-slate-500 uppercase"
                      >
                        Format
                      </label>
                      <input
                        id={`format-${item.item_number}`}
                        type="text"
                        placeholder="e.g. Hardcopy / Excel"
                        value={item.format || ''}
                        onChange={(e) =>
                          onUpdateChecklistItem(interviewId, item.item_number, {
                            format: e.target.value,
                          })
                        }
                        className="w-full mt-0.5 p-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  {/* Location & Holding Officer */}
                  <div className="pt-1">
                    <label
                      htmlFor={`location-${item.item_number}`}
                      className="block text-[10px] font-semibold text-slate-500 uppercase"
                    >
                      Physical Location / Holding Officer
                    </label>
                    <input
                      id={`location-${item.item_number}`}
                      type="text"
                      placeholder="e.g. Room 4B Registry, Head of OSH"
                      value={item.location_or_officer || ''}
                      onChange={(e) =>
                        onUpdateChecklistItem(interviewId, item.item_number, {
                          location_or_officer: e.target.value,
                        })
                      }
                      className="w-full mt-0.5 p-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 outline-none"
                    />
                  </div>

                  {/* Notes / Observations */}
                  <div className="pt-1">
                    <label
                      htmlFor={`notes-${item.item_number}`}
                      className="block text-[10px] font-semibold text-slate-500 uppercase"
                    >
                      Checklist Notes & Observations
                    </label>
                    <input
                      id={`notes-${item.item_number}`}
                      type="text"
                      placeholder="e.g. Last updated June 2024; pending validation"
                      value={item.notes || ''}
                      onChange={(e) =>
                        onUpdateChecklistItem(interviewId, item.item_number, {
                          notes: e.target.value,
                        })
                      }
                      className="w-full mt-0.5 p-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 outline-none"
                    />
                  </div>

                  {/* File Attachment Upload & Download Section */}
                  <div className="pt-2 border-t border-slate-200">
                    {hasFile ? (
                      <div className="p-2.5 bg-emerald-50/90 border border-emerald-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-2 truncate min-w-0">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span
                              className="text-xs font-mono font-bold text-emerald-950 truncate"
                              title={item.file_name || item.document_title}
                            >
                              {item.file_name || 'Attached Evidence'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleTriggerUpload(item.item_number)}
                            disabled={uploadingItemNumber === item.item_number}
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-emerald-100 rounded transition shrink-0"
                            title="Replace File"
                            aria-label={`Replace file for item ${item.item_number}`}
                          >
                            {uploadingItemNumber === item.item_number ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-700" />
                            ) : (
                              <Upload className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Metadata badge and Download / View button */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-emerald-200/70">
                          {(!isSupabaseConfigured ||
                            isDemoMode ||
                            (item.file_url && item.file_url.startsWith('#demo-'))) ? (
                            <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded">
                              Demo Mode – Metadata only
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded flex items-center gap-1">
                              <FileCheck className="w-3 h-3 text-emerald-700" />
                              Private Vault
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDownloadOrView(item)}
                            disabled={activeRetrievalItem === item.item_number}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-teal-800 bg-white hover:bg-teal-50 border border-teal-300 rounded-lg shadow-2xs transition disabled:opacity-50"
                            title="Download / View document with fresh 1-hour signed URL"
                          >
                            {activeRetrievalItem === item.item_number ? (
                              <Loader2 className="w-3 h-3 animate-spin text-teal-700" />
                            ) : (
                              <ExternalLink className="w-3 h-3 text-teal-700" />
                            )}
                            <span>Download / View</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleTriggerUpload(item.item_number)}
                        disabled={uploadingItemNumber === item.item_number}
                        className="w-full py-2 px-3 bg-white hover:bg-slate-50 border border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:text-teal-700 flex items-center justify-center space-x-1.5 transition disabled:opacity-50"
                      >
                        {uploadingItemNumber === item.item_number ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-700" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>
                          {uploadingItemNumber === item.item_number
                            ? 'Uploading...'
                            : 'Attach Document / Evidence Copy'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

