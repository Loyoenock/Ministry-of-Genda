/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface AudioLevelMeterProps {
  level: number; // 0 to 1
  isRecording: boolean;
}

export const AudioLevelMeter: React.FC<AudioLevelMeterProps> = ({ level, isRecording }) => {
  // Generate 5 bars with varying heights based on level
  const clampedLevel = Math.max(0, Math.min(1, level));

  const bars = [
    Math.min(1, clampedLevel * 1.4),
    Math.min(1, clampedLevel * 1.8),
    Math.min(1, clampedLevel * 2.2),
    Math.min(1, clampedLevel * 1.6),
    Math.min(1, clampedLevel * 1.2),
  ];

  return (
    <div
      data-testid="audio-level-meter"
      className="flex items-center space-x-0.5 h-4 px-1"
      aria-label={`Audio input level: ${Math.round(clampedLevel * 100)}%`}
    >
      {bars.map((barLevel, i) => {
        const heightPct = isRecording ? Math.max(15, Math.round(barLevel * 100)) : 15;
        return (
          <div
            key={i}
            className={`w-0.5 rounded-full transition-all duration-75 ${
              isRecording
                ? barLevel > 0.75
                  ? 'bg-rose-500'
                  : barLevel > 0.35
                  ? 'bg-emerald-500'
                  : 'bg-teal-600'
                : 'bg-slate-300'
            }`}
            style={{ height: `${heightPct}%` }}
          />
        );
      })}
    </div>
  );
};
