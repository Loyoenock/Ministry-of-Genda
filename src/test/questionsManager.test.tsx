/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuestionsManagerView } from '../components/QuestionsManagerView';
import * as AuthContextModule from '../context/AuthContext';
import * as questionsServiceModule from '../lib/questionsService';
import { Question } from '../types';

const mockQuestions: Question[] = [
  {
    id: 'A1',
    section_code: 'A',
    section_title: 'Section A: Strategy, Policy & Mandate',
    question_text: 'What is the statutory mandate of the Labour Directorate?',
    who_to_ask: 'Minister, Permanent Secretary',
    prompt_hints: 'Probe legal framework',
    applicable_tiers: ['Leadership', 'Management'],
    response_type: 'text',
    sort_order: 1,
    statutory_reference: 'Employment Act Cap 219',
  },
  {
    id: 'B1',
    section_code: 'B',
    section_title: 'Section B: Legal Framework & Compliance',
    question_text: 'Are statutory inspection quotas met?',
    who_to_ask: 'Labour Officers',
    prompt_hints: 'Check quarterly reports',
    applicable_tiers: ['Frontline'],
    response_type: 'text',
    sort_order: 2,
  },
];

describe('QuestionsManagerView Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(questionsServiceModule, 'fetchQuestionsFromSupabase').mockResolvedValue(mockQuestions);
    vi.spyOn(questionsServiceModule, 'insertQuestionInSupabase').mockImplementation(async (q) => ({
      data: q,
      error: null,
    }));
    vi.spyOn(questionsServiceModule, 'updateQuestionInSupabase').mockImplementation(async (id, updates) => ({
      data: { ...mockQuestions[0], ...updates },
      error: null,
    }));
    vi.spyOn(questionsServiceModule, 'deleteQuestionInSupabase').mockResolvedValue({ error: null });
  });

  it('renders questions and role permissions badge for Admin', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { id: 'admin-1', email: 'admin@mglsd.go.ug' } as any,
      profile: { id: 'admin-1', role: 'admin' } as any,
      role: 'admin',
      isAdmin: true,
      loading: false,
    } as any);

    render(<QuestionsManagerView />);

    await waitFor(() => {
      expect(screen.getByTestId('total-questions-count')).toHaveTextContent('2');
    });

    expect(screen.getByTestId('questions-manager-role-badge')).toHaveTextContent('Admin (Full Access)');
    expect(screen.getByTestId('question-row-A1')).toBeInTheDocument();
    expect(screen.getByTestId('question-row-B1')).toBeInTheDocument();

    // Admin should see active delete buttons
    expect(screen.getByTestId('delete-question-A1')).toBeInTheDocument();
  });

  it('renders questions and restricts delete capability for Interviewer', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { id: 'user-1', email: 'interviewer@mglsd.go.ug' } as any,
      profile: { id: 'user-1', role: 'interviewer' } as any,
      role: 'interviewer',
      isAdmin: false,
      loading: false,
    } as any);

    render(<QuestionsManagerView />);

    await waitFor(() => {
      expect(screen.getByTestId('total-questions-count')).toHaveTextContent('2');
    });

    expect(screen.getByTestId('questions-manager-role-badge')).toHaveTextContent('Interviewer (Add & Edit)');

    // Interviewer can see edit button
    expect(screen.getByTestId('edit-question-A1')).toBeInTheDocument();

    // Delete button should be disabled for Interviewer
    expect(screen.queryByTestId('delete-question-A1')).not.toBeInTheDocument();
    expect(screen.getByTestId('delete-disabled-A1')).toBeInTheDocument();
  });

  it('allows adding a new question following structure', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { id: 'user-1', email: 'interviewer@mglsd.go.ug' } as any,
      profile: { id: 'user-1', role: 'interviewer' } as any,
      role: 'interviewer',
      isAdmin: false,
      loading: false,
    } as any);

    render(<QuestionsManagerView />);

    await waitFor(() => {
      expect(screen.getByTestId('total-questions-count')).toHaveTextContent('2');
    });

    // Click Add Question
    fireEvent.click(screen.getByTestId('add-question-btn'));

    // Fill form
    fireEvent.change(screen.getByTestId('input-question-id'), { target: { value: 'A10' } });
    fireEvent.change(screen.getByTestId('input-question-text'), {
      target: { value: 'What are the main OSH risks in regional offices?' },
    });
    fireEvent.change(screen.getByTestId('input-who-to-ask'), { target: { value: 'Regional Inspectors' } });

    // Submit form
    fireEvent.click(screen.getByTestId('save-question-submit'));

    await waitFor(() => {
      expect(questionsServiceModule.insertQuestionInSupabase).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'A10',
          question_text: 'What are the main OSH risks in regional offices?',
          who_to_ask: 'Regional Inspectors',
        })
      );
    });
  });

  it('allows Admin to delete a question', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { id: 'admin-1', email: 'admin@mglsd.go.ug' } as any,
      profile: { id: 'admin-1', role: 'admin' } as any,
      role: 'admin',
      isAdmin: true,
      loading: false,
    } as any);

    render(<QuestionsManagerView />);

    await waitFor(() => {
      expect(screen.getByTestId('total-questions-count')).toHaveTextContent('2');
    });

    // Click delete
    fireEvent.click(screen.getByTestId('delete-question-A1'));

    // Confirm delete
    fireEvent.click(screen.getByTestId('confirm-delete-question-btn'));

    await waitFor(() => {
      expect(questionsServiceModule.deleteQuestionInSupabase).toHaveBeenCalledWith('A1');
    });
  });
});
