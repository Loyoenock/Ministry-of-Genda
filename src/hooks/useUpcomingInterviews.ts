/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { useInterviews } from '../context/InterviewContext';
import { parseInterviewDate } from '../lib/interviewCalculations';
import { Interview } from '../types';

export function useUpcomingInterviews(): Interview[] {
  const { interviews } = useInterviews();

  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = interviews.filter((it) => {
      if (it.status === 'Completed') return false;
      const d = parseInterviewDate(it.interview_date);
      d.setHours(0, 0, 0, 0);
      return d >= today;
    });

    upcoming.sort((a, b) => {
      const da = parseInterviewDate(a.interview_date).getTime();
      const db = parseInterviewDate(b.interview_date).getTime();
      if (da !== db) return da - db;
      return (a.interview_time || '').localeCompare(b.interview_time || '');
    });

    return upcoming;
  }, [interviews]);
}
