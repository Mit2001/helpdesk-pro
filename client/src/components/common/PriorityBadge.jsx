import React from 'react';
import { AlertTriangle, ArrowUp, ArrowDown, Flame } from 'lucide-react';

export const PriorityBadge = ({ priority }) => {
  switch (priority) {
    case 'Critical':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/70 text-rose-300 border border-rose-800/80">
          <Flame className="w-3 h-3 text-rose-400 shrink-0" />
          Critical
        </span>
      );
    case 'High':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-950/70 text-orange-300 border border-orange-800/80">
          <ArrowUp className="w-3 h-3 text-orange-400 shrink-0" />
          High
        </span>
      );
    case 'Medium':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/70 text-amber-300 border border-amber-800/80">
          <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
          Medium
        </span>
      );
    case 'Low':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
          <ArrowDown className="w-3 h-3 text-slate-400 shrink-0" />
          Low
        </span>
      );
  }
};

export default PriorityBadge;
