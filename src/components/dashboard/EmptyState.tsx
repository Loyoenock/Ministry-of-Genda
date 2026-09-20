/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface EmptyStateProps {
  message?: string;
  isTableRow?: boolean;
  colSpan?: number;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  message = 'No interviews match the current filter criteria.',
  isTableRow = false,
  colSpan = 9,
}) => {
  if (isTableRow) {
    return (
      <tr>
        <td
          colSpan={colSpan}
          className="py-8 text-center text-slate-400"
          data-testid="no-interviews-matched"
        >
          {message}
        </td>
      </tr>
    );
  }

  return (
    <div
      className="p-8 text-center text-slate-400 text-xs"
      data-testid="no-interviews-matched-mobile"
    >
      {message}
    </div>
  );
};
