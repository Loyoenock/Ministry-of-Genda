/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InterviewTier, InterviewStatus } from '../../types';

export function getTierBadge(tier: InterviewTier | string): string {
  switch (tier) {
    case 'Leadership':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'Management':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'Frontline':
      return 'bg-teal-100 text-teal-700 border-teal-200';
    case 'Support/IT':
      return 'bg-cyan-100 text-cyan-700 border-cyan-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export function getStatusBadge(status: InterviewStatus | string): string {
  switch (status) {
    case 'Completed':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'In Progress':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'Draft':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}
