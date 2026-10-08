/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  HelpCircle,
  Plus,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  ShieldCheck,
  UserCheck,
  BookOpen,
  Info,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Question, InterviewTier } from '../types';
import { QuestionTableBody } from './questions/QuestionTableBody';
import {
  fetchQuestionsFromSupabase,
  insertQuestionInSupabase,
  updateQuestionInSupabase,
  deleteQuestionInSupabase,
} from '../lib/questionsService';

const DEFAULT_SECTIONS: { code: string; title: string }[] = [
  { code: 'A', title: 'Section A: Strategy, Policy & Mandate' },
  { code: 'B', title: 'Section B: Legal Framework & Compliance' },
  { code: 'C', title: 'Section C: Institutional Capacity & Resources' },
  { code: 'D', title: 'Section D: Operations & Service Delivery' },
  { code: 'E', title: 'Section E: Digitalization & Technology' },
  { code: 'F', title: 'Section F: Monitoring, Evaluation & Reporting' },
  { code: 'G', title: 'Section G: Stakeholder & Inter-agency Collaboration' },
  { code: 'H', title: 'Section H: Governance, Ethics & Integrity' },
  { code: 'W', title: 'Section W: Workforce & HR Management' },
];

const ALL_TIERS: InterviewTier[] = ['Leadership', 'Management', 'Frontline', 'Support/IT'];

export const QuestionsManagerView: React.FC = () => {
  const { user, isAdmin } = useAuth();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sectionFilter, setSectionFilter] = useState<string>('ALL');
  const [tierFilter, setTierFilter] = useState<string>('ALL');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Delete modal state
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Form state
  const [formData, setFormData] = useState<{
    id: string;
    section_code: string;
    section_title: string;
    question_text: string;
    who_to_ask: string;
    prompt_hints: string;
    applicable_tiers: InterviewTier[];
    response_type: 'text' | 'structured' | 'composite';
    sort_order: number;
    statutory_reference: string;
  }>({
    id: '',
    section_code: 'A',
    section_title: 'Section A: Strategy, Policy & Mandate',
    question_text: '',
    who_to_ask: '',
    prompt_hints: '',
    applicable_tiers: ['Leadership', 'Management'],
    response_type: 'text',
    sort_order: 1,
    statutory_reference: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Load questions from Supabase on mount
  const loadQuestions = async (force = false) => {
    if (force) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMsg(null);

    try {
      const data = await fetchQuestionsFromSupabase({
        forceRefresh: force,
        allowDevFallback: true,
      });
      setQuestions(data);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load diagnostic questions from Supabase.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  // Filtered Questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      // Search Query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesText = q.question_text.toLowerCase().includes(query);
        const matchesId = q.id.toLowerCase().includes(query);
        const matchesWho = q.who_to_ask.toLowerCase().includes(query);
        const matchesSection = q.section_title.toLowerCase().includes(query);
        const matchesRef = q.statutory_reference?.toLowerCase().includes(query);
        if (!matchesText && !matchesId && !matchesWho && !matchesSection && !matchesRef) {
          return false;
        }
      }

      // Section Filter
      if (sectionFilter !== 'ALL' && q.section_code !== sectionFilter) {
        return false;
      }

      // Tier Filter
      if (tierFilter !== 'ALL' && !q.applicable_tiers.includes(tierFilter as InterviewTier)) {
        return false;
      }

      return true;
    });
  }, [questions, searchQuery, sectionFilter, tierFilter]);

  // Handle Section Code change in Form
  const handleSectionCodeChange = (code: string) => {
    const matched = DEFAULT_SECTIONS.find((s) => s.code === code);
    const title = matched ? matched.title : `Section ${code}: Custom Section`;
    setFormData((prev) => ({
      ...prev,
      section_code: code,
      section_title: title,
    }));
  };

  // Open modal for Create
  const handleOpenAddModal = () => {
    setEditingQuestion(null);

    // Calculate a good next sort order and default ID suggestion
    const nextSort = questions.length > 0 ? Math.max(...questions.map((q) => q.sort_order || 0)) + 1 : 1;
    const nextId = `Q${questions.length + 1}`;

    setFormData({
      id: nextId,
      section_code: 'A',
      section_title: 'Section A: Strategy, Policy & Mandate',
      question_text: '',
      who_to_ask: '',
      prompt_hints: '',
      applicable_tiers: ['Leadership', 'Management'],
      response_type: 'text',
      sort_order: nextSort,
      statutory_reference: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (q: Question) => {
    setEditingQuestion(q);
    setFormData({
      id: q.id,
      section_code: q.section_code,
      section_title: q.section_title,
      question_text: q.question_text,
      who_to_ask: q.who_to_ask,
      prompt_hints: q.prompt_hints || '',
      applicable_tiers: [...q.applicable_tiers],
      response_type: q.response_type,
      sort_order: q.sort_order,
      statutory_reference: q.statutory_reference || '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Form validation
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.id.trim()) {
      errors.id = 'Question ID is required (e.g. A10, B4)';
    } else if (!editingQuestion && questions.some((q) => q.id.toLowerCase() === formData.id.trim().toLowerCase())) {
      errors.id = 'Question ID already exists in the database';
    }

    if (!formData.question_text.trim()) {
      errors.question_text = 'Question text prompt is required';
    }

    if (!formData.who_to_ask.trim()) {
      errors.who_to_ask = 'Who to ask is required (target roles)';
    }

    if (formData.applicable_tiers.length === 0) {
      errors.applicable_tiers = 'At least one institutional tier must be selected';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save question handler (Insert or Update)
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const questionPayload: Question = {
      id: formData.id.trim(),
      section_code: formData.section_code.trim() as any,
      section_title: formData.section_title.trim(),
      question_text: formData.question_text.trim(),
      who_to_ask: formData.who_to_ask.trim(),
      prompt_hints: formData.prompt_hints.trim(),
      applicable_tiers: formData.applicable_tiers,
      response_type: formData.response_type,
      sort_order: Number(formData.sort_order) || 0,
      statutory_reference: formData.statutory_reference.trim() || undefined,
    };

    try {
      if (editingQuestion) {
        // Update existing question
        const { data, error } = await updateQuestionInSupabase(editingQuestion.id, questionPayload);
        if (error) throw error;

        setSuccessMsg(`Question "${questionPayload.id}" updated successfully in Supabase.`);
      } else {
        // Create new question
        const { data, error } = await insertQuestionInSupabase(questionPayload);
        if (error) throw error;

        setSuccessMsg(`New question "${questionPayload.id}" added successfully to Supabase.`);
      }

      setIsModalOpen(false);
      await loadQuestions(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save question to Supabase database.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete question handler (Admin only)
  const handleDeleteConfirm = async () => {
    if (!deletingQuestion || !isAdmin) return;

    setIsDeleting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await deleteQuestionInSupabase(deletingQuestion.id);
      if (error) throw error;

      setSuccessMsg(`Question "${deletingQuestion.id}" permanently deleted from Supabase.`);
      setDeletingQuestion(null);
      await loadQuestions(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to delete question from Supabase.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle tier selection
  const handleToggleTier = (tier: InterviewTier) => {
    setFormData((prev) => {
      const exists = prev.applicable_tiers.includes(tier);
      if (exists) {
        return { ...prev, applicable_tiers: prev.applicable_tiers.filter((t) => t !== tier) };
      } else {
        return { ...prev, applicable_tiers: [...prev.applicable_tiers, tier] };
      }
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Interview Questions Manager
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    isAdmin
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : 'bg-teal-100 text-teal-800 border border-teal-200'
                  }`}
                  data-testid="questions-manager-role-badge"
                >
                  {isAdmin ? 'Admin (Full Access)' : 'Interviewer (Add & Edit)'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                Configure, update, and manage diagnostic questions integrated with Supabase database.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            type="button"
            onClick={() => loadQuestions(true)}
            disabled={refreshing}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition flex items-center space-x-2 border border-slate-200 disabled:opacity-50"
            title="Refresh questions from Supabase"
            data-testid="refresh-questions-btn"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync Supabase</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md transition flex items-center space-x-2"
            data-testid="add-question-btn"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* Alert Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-sm animate-in fade-in">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="font-medium">{successMsg}</p>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-500 hover:text-emerald-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center justify-between text-sm animate-in fade-in">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="font-medium">{errorMsg}</p>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-500 hover:text-rose-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Questions</p>
          <p className="text-2xl font-bold text-slate-900" data-testid="total-questions-count">
            {questions.length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Sections</p>
          <p className="text-2xl font-bold text-teal-700">
            {new Set(questions.map((q) => q.section_code)).size}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filtered View</p>
          <p className="text-2xl font-bold text-indigo-700" data-testid="filtered-questions-count">
            {filteredQuestions.length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Role Permissions</p>
          <p className="text-sm font-bold text-slate-800 flex items-center space-x-1.5 mt-1">
            {isAdmin ? (
              <>
                <ShieldCheck className="w-4 h-4 text-purple-600 inline shrink-0" />
                <span>Full Admin CRUD</span>
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4 text-teal-600 inline shrink-0" />
                <span>Create & Edit</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Filters and Search Control Panel */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, prompt text, who to ask, or statutory reference..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
              data-testid="questions-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Section Filter */}
          <div className="w-full md:w-64">
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
              data-testid="questions-section-filter"
            >
              <option value="ALL">All Sections (A - W)</option>
              {DEFAULT_SECTIONS.map((sec) => (
                <option key={sec.code} value={sec.code}>
                  {sec.title}
                </option>
              ))}
            </select>
          </div>

          {/* Tier Filter */}
          <div className="w-full md:w-52">
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
              data-testid="questions-tier-filter"
            >
              <option value="ALL">All Institutional Tiers</option>
              {ALL_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Questions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-600">Loading diagnostic questions from Supabase...</p>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-700">No questions found</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              No diagnostic questions match your search or filter criteria. Try clearing filters or adding a new question.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" data-testid="questions-table">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-16">ID</th>
                  <th className="py-3 px-4 w-48">Section</th>
                  <th className="py-3 px-4">Question Prompt & Guidance</th>
                  <th className="py-3 px-4 w-44">Who To Ask</th>
                  <th className="py-3 px-4 w-44">Applicable Tiers</th>
                  <th className="py-3 px-4 w-28 text-center">Type</th>
                  <th className="py-3 px-4 w-24 text-center">Actions</th>
                </tr>
              </thead>
              <QuestionTableBody
                questions={filteredQuestions}
                isAdmin={isAdmin}
                onEdit={handleOpenEditModal}
                onDelete={setDeletingQuestion}
              />
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Question Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <BookOpen className="w-5 h-5 text-teal-400" />
                <h2 className="text-lg font-bold">
                  {editingQuestion ? `Edit Question ${editingQuestion.id}` : 'Add New Interview Question'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveQuestion} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Question ID */}
                <div>
                  <label htmlFor="question-id" className="block text-xs font-bold text-slate-700 mb-1">
                    Question ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="question-id"
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData((prev) => ({ ...prev, id: e.target.value }))}
                    disabled={Boolean(editingQuestion)}
                    placeholder="e.g. A10, B5, W2"
                    className={`w-full px-3 py-2 bg-slate-50 border ${
                      formErrors.id ? 'border-rose-500' : 'border-slate-300'
                    } rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100 disabled:text-slate-500`}
                    data-testid="input-question-id"
                  />
                  {formErrors.id && <p className="text-xs text-rose-600 mt-1">{formErrors.id}</p>}
                </div>

                {/* Section Code */}
                <div>
                  <label htmlFor="section-code" className="block text-xs font-bold text-slate-700 mb-1">
                    Section Code <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="section-code"
                    value={formData.section_code}
                    onChange={(e) => handleSectionCodeChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    data-testid="select-section-code"
                  >
                    {DEFAULT_SECTIONS.map((sec) => (
                      <option key={sec.code} value={sec.code}>
                        {sec.code} ({sec.title.split(':')[1]?.trim() || sec.title})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Section Title */}
              <div>
                <label htmlFor="section-title" className="block text-xs font-bold text-slate-700 mb-1">
                  Section Title
                </label>
                <input
                  id="section-title"
                  type="text"
                  value={formData.section_title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, section_title: e.target.value }))}
                  placeholder="Section title"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  data-testid="input-section-title"
                />
              </div>

              {/* Question Text */}
              <div>
                <label htmlFor="question-text" className="block text-xs font-bold text-slate-700 mb-1">
                  Question Prompt Text <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="question-text"
                  rows={3}
                  value={formData.question_text}
                  onChange={(e) => setFormData((prev) => ({ ...prev, question_text: e.target.value }))}
                  placeholder="Enter the main diagnostic question prompt..."
                  className={`w-full px-3 py-2 bg-slate-50 border ${
                    formErrors.question_text ? 'border-rose-500' : 'border-slate-300'
                  } rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500`}
                  data-testid="input-question-text"
                />
                {formErrors.question_text && (
                  <p className="text-xs text-rose-600 mt-1">{formErrors.question_text}</p>
                )}
              </div>

              {/* Who To Ask */}
              <div>
                <label htmlFor="who-to-ask" className="block text-xs font-bold text-slate-700 mb-1">
                  Who To Ask <span className="text-rose-500">*</span>
                </label>
                <input
                  id="who-to-ask"
                  type="text"
                  value={formData.who_to_ask}
                  onChange={(e) => setFormData((prev) => ({ ...prev, who_to_ask: e.target.value }))}
                  placeholder="e.g. Minister, Permanent Secretary, Labour Officers"
                  className={`w-full px-3 py-2 bg-slate-50 border ${
                    formErrors.who_to_ask ? 'border-rose-500' : 'border-slate-300'
                  } rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500`}
                  data-testid="input-who-to-ask"
                />
                {formErrors.who_to_ask && <p className="text-xs text-rose-600 mt-1">{formErrors.who_to_ask}</p>}
              </div>

              {/* Prompt Hints */}
              <div>
                <label htmlFor="prompt-hints" className="block text-xs font-bold text-slate-700 mb-1">
                  Prompt Hints / Interviewer Guidance (Optional)
                </label>
                <textarea
                  id="prompt-hints"
                  rows={2}
                  value={formData.prompt_hints}
                  onChange={(e) => setFormData((prev) => ({ ...prev, prompt_hints: e.target.value }))}
                  placeholder="Probe guidance, specific aspects or statutory clauses to look out for..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  data-testid="input-prompt-hints"
                />
              </div>

              {/* Applicable Tiers Checkboxes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Applicable Institutional Tiers <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  {ALL_TIERS.map((tier) => {
                    const isChecked = formData.applicable_tiers.includes(tier);
                    return (
                      <label
                        key={tier}
                        className="flex items-center space-x-2 text-xs font-medium text-slate-800 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleTier(tier)}
                          className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                          data-testid={`checkbox-tier-${tier.replace('/', '-')}`}
                        />
                        <span>{tier}</span>
                      </label>
                    );
                  })}
                </div>
                {formErrors.applicable_tiers && (
                  <p className="text-xs text-rose-600 mt-1">{formErrors.applicable_tiers}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Response Type */}
                <div>
                  <label htmlFor="response-type" className="block text-xs font-bold text-slate-700 mb-1">
                    Response Type
                  </label>
                  <select
                    id="response-type"
                    value={formData.response_type}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        response_type: e.target.value as 'text' | 'structured' | 'composite',
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    data-testid="select-response-type"
                  >
                    <option value="text">Text / Qualitative</option>
                    <option value="structured">Structured</option>
                    <option value="composite">Composite</option>
                  </select>
                </div>

                {/* Sort Order */}
                <div>
                  <label htmlFor="sort-order" className="block text-xs font-bold text-slate-700 mb-1">
                    Sort Order
                  </label>
                  <input
                    id="sort-order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sort_order: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    data-testid="input-sort-order"
                  />
                </div>

                {/* Statutory Reference */}
                <div>
                  <label htmlFor="statutory-ref" className="block text-xs font-bold text-slate-700 mb-1">
                    Statutory Ref.
                  </label>
                  <input
                    id="statutory-ref"
                    type="text"
                    value={formData.statutory_reference}
                    onChange={(e) => setFormData((prev) => ({ ...prev, statutory_reference: e.target.value }))}
                    placeholder="e.g. OSH Act 2006, Sec 8"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    data-testid="input-statutory-reference"
                  />
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md transition flex items-center space-x-2 disabled:opacity-50"
                  data-testid="save-question-submit"
                >
                  {isSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{editingQuestion ? 'Update Question' : 'Save Question'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal (Admin Only) */}
      {deletingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-full">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Confirm Deletion</h3>
                <p className="text-xs text-slate-500">Admin privileges required</p>
              </div>
            </div>

            <p className="text-sm text-slate-700">
              Are you sure you want to delete question <strong className="font-mono text-teal-800">{deletingQuestion.id}</strong>? This action will permanently remove the question from the Supabase database.
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 italic">
              "{deletingQuestion.question_text}"
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingQuestion(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md transition flex items-center space-x-2 disabled:opacity-50"
                data-testid="confirm-delete-question-btn"
              >
                {isDeleting && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>Delete Question</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
