/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { Question } from '../../types';

interface QuestionTableBodyProps {
  questions: Question[];
  isAdmin: boolean;
  onEdit: (q: Question) => void;
  onDelete: (q: Question) => void;
}

export const QuestionTableBody: React.FC<QuestionTableBodyProps> = ({
  questions,
  isAdmin,
  onEdit,
  onDelete,
}) => {
  return (
    <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
      {questions.map((q) => (
        <tr
          key={q.id}
          className="hover:bg-slate-50/80 transition group"
          data-testid={`question-row-${q.id}`}
        >
          <td className="py-3.5 px-4 font-bold text-teal-800 align-top">
            <span className="px-2 py-1 bg-teal-50 border border-teal-200 rounded-md font-mono text-xs">
              {q.id}
            </span>
          </td>
          <td className="py-3.5 px-4 text-slate-700 align-top">
            <p className="font-semibold text-xs text-slate-900">{q.section_title}</p>
            <p className="text-[10px] text-slate-400 font-mono">Code: {q.section_code}</p>
          </td>
          <td className="py-3.5 px-4 text-slate-800 align-top space-y-1">
            <p className="font-medium text-slate-900 leading-snug">{q.question_text}</p>
            {q.prompt_hints && (
              <p className="text-xs text-slate-500 bg-amber-50/60 border border-amber-100 p-2 rounded-lg italic">
                <span className="font-semibold text-amber-800 not-italic">Hint: </span>
                {q.prompt_hints}
              </p>
            )}
            {q.statutory_reference && (
              <p className="text-[11px] text-indigo-700 font-semibold flex items-center space-x-1">
                <span>Ref:</span>
                <span>{q.statutory_reference}</span>
              </p>
            )}
          </td>
          <td className="py-3.5 px-4 text-slate-600 align-top text-xs">
            <span className="font-medium text-slate-700">{q.who_to_ask}</span>
          </td>
          <td className="py-3.5 px-4 align-top">
            <div className="flex flex-wrap gap-1">
              {q.applicable_tiers.map((tier) => (
                <span
                  key={tier}
                  className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-[10px] font-semibold"
                >
                  {tier}
                </span>
              ))}
            </div>
          </td>
          <td className="py-3.5 px-4 align-top text-center">
            <span className="px-2 py-1 bg-slate-100 text-slate-700 text-[11px] font-medium rounded-md uppercase tracking-wider">
              {q.response_type}
            </span>
          </td>
          <td className="py-3.5 px-4 align-top text-center">
            <div className="flex items-center justify-center space-x-1.5">
              {/* Edit Button for both Admin and Interviewer */}
              <button
                type="button"
                onClick={() => onEdit(q)}
                className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                title="Edit question structure"
                data-testid={`edit-question-${q.id}`}
              >
                <Edit className="w-4 h-4" />
              </button>

              {/* Delete Button - Admin ONLY */}
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => onDelete(q)}
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Delete question (Admin privilege)"
                  data-testid={`delete-question-${q.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <span
                  className="p-1.5 text-slate-300 cursor-not-allowed"
                  title="Delete capability restricted to Admin"
                  data-testid={`delete-disabled-${q.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </span>
              )}
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  );
};
