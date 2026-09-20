/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Building, ExternalLink } from 'lucide-react';
import ministryHqImage from '../../assets/images/ministry_headquarters_1789463353720.jpg';

export const MinistryCard: React.FC = () => {
  const [headquartersImgError, setHeadquartersImgError] = useState(false);

  return (
    <div className="bg-[#0b132b] rounded-2xl overflow-hidden shadow-sm border border-slate-800 text-white group">
      <div className="relative h-44 overflow-hidden bg-slate-900">
        {!headquartersImgError ? (
          <img
            src={ministryHqImage}
            alt="Ministry Headquarters Building - Simbamanyo House, Kampala"
            referrerPolicy="no-referrer"
            onError={() => setHeadquartersImgError(true)}
            className="w-full h-full object-cover brightness-90 group-hover:scale-105 transition duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 flex flex-col items-center justify-center p-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mb-2">
              <Building className="w-6 h-6 text-amber-400" />
            </div>
            <p className="text-xs font-bold text-white tracking-wide">Ministry Headquarters Building</p>
            <p className="text-[11px] text-slate-300">Plot 2, Simbamanyo House, Kampala</p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b132b] via-[#0b132b]/40 to-transparent pointer-events-none" />

        {/* Uganda Flag accent strip */}
        <div className="absolute top-3 left-3 flex items-center space-x-1 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/20">
          <span className="w-2.5 h-2.5 rounded-full bg-black border border-white/40" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
          <span className="text-[10px] font-bold text-white tracking-wide ml-1">UGANDA</span>
        </div>

        {/* Building location tag */}
        <div className="absolute top-3 right-3 bg-slate-950/70 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/10 text-[10px] text-slate-300 font-medium flex items-center space-x-1">
          <Building className="w-3 h-3 text-amber-400" />
          <span>Simbamanyo House</span>
        </div>
      </div>

      <div className="p-4 space-y-2.5">
        <div className="flex items-center space-x-3 pb-2.5 border-b border-slate-800">
          <img
            src="/Coat_of_arms_of_Uganda.svg"
            alt="Republic of Uganda Coat of Arms"
            className="w-9 h-9 object-contain shrink-0 drop-shadow"
          />
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
              The Republic of Uganda
            </p>
            <p className="text-xs font-bold text-white truncate">
              Ministry of Gender, Labour and Social Dev.
            </p>
          </div>
        </div>

        <div>
          <a
            href="https://mglsd.go.ug"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-white hover:text-teal-300 transition group/link"
            title="Visit official Ministry of Gender, Labour and Social Development portal (mglsd.go.ug)"
          >
            <span>Ministry Headquarters Building</span>
            <ExternalLink className="w-3.5 h-3.5 text-teal-400 group-hover/link:translate-x-0.5 transition shrink-0" />
          </a>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Plot 2, Simbamanyo House, George Street, Kampala
          </p>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
            MGLSD • TRANSFORMATIVE
          </span>
          <a
            href="https://mglsd.go.ug"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
          >
            <span>Official Portal</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed pt-1">
          "To promote gender equality, decent work, social protection and sustainable livelihoods for all."
        </p>
      </div>
    </div>
  );
};
