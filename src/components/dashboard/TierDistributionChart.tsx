/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export interface TierChartItem {
  name: string;
  value: number;
  color: string;
}

export interface TierDistributionChartProps {
  totalInterviews: number;
  tierCounts: Record<string, number>;
  tierChartData: TierChartItem[];
}

export const TierDistributionChart: React.FC<TierDistributionChartProps> = ({
  totalInterviews,
  tierCounts,
  tierChartData,
}) => {
  return (
    <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-900">Interviews by Tier</h3>
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          4 Tiers
        </span>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
        {/* Donut Chart with Centered Total */}
        <div className="relative w-28 h-28 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={tierChartData}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={48}
                paddingAngle={3}
                dataKey="value"
              >
                {tierChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  borderRadius: '8px',
                  fontSize: '11px',
                  border: 'none',
                  padding: '4px 8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Total in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-base font-extrabold text-slate-900 leading-none">{totalInterviews}</span>
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">Total</span>
          </div>
        </div>

        {/* Legend list - Guaranteed no text overlap */}
        <div className="space-y-2 flex-1 min-w-0">
          {tierChartData.map((entry) => {
            const count = tierCounts[entry.name] ?? entry.value;
            const pct = totalInterviews > 0 ? Math.round((count / totalInterviews) * 100) : 0;
            return (
              <div key={entry.name} className="flex items-center justify-between gap-1.5 min-w-0">
                <div className="flex items-center space-x-1.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-slate-600 font-medium truncate text-xs">
                    {entry.name}
                  </span>
                </div>
                <div className="text-right shrink-0 whitespace-nowrap text-xs leading-none">
                  <span className="font-bold text-slate-900 tabular-nums">{count}</span>
                  <span className="text-slate-400 font-normal ml-1 tabular-nums">
                    ({pct}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
