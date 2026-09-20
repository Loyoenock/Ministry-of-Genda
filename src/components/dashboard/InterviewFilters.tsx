/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Search } from 'lucide-react';

export interface InterviewFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  tierFilter: string;
  onTierChange: (tier: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  onClearFilters: () => void;
}

export const InterviewFilters: React.FC<InterviewFiltersProps> = ({
  searchQuery,
  onSearchChange,
  tierFilter,
  onTierChange,
  statusFilter,
  onStatusChange,
  onClearFilters,
}) => {
  const hasActiveFilters =
    Boolean(searchQuery) || tierFilter !== 'All Tiers' || statusFilter !== 'All Statuses';

  return (
    <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <h3 className="text-base font-bold text-slate-900">My Interviews</h3>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search Input */}
        <div className="relative min-w-[240px] flex-1 sm:flex-initial">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            data-testid="dashboard-search-input"
            placeholder="Search by interviewee, organisation..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none"
          />
        </div>

        {/* Tier Filter */}
        <select
          value={tierFilter}
          data-testid="dashboard-tier-filter"
          onChange={(e) => onTierChange(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="All Tiers">All Tiers</option>
          <option value="Leadership">Leadership</option>
          <option value="Management">Management</option>
          <option value="Frontline">Frontline</option>
          <option value="Support/IT">Support/IT</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          data-testid="dashboard-status-filter"
          onChange={(e) => onStatusChange(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="All Statuses">All Statuses</option>
          <option value="Completed">Completed</option>
          <option value="In Progress">In Progress</option>
          <option value="Draft">Draft</option>
        </select>

        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            data-testid="dashboard-clear-filters-btn"
            className="text-xs text-teal-700 hover:text-teal-900 font-semibold px-2 py-1.5"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};
