import React from 'react';
import { 
  CircleDot, 
  UserCheck, 
  Clock, 
  HelpCircle, 
  AlertOctagon, 
  CheckCircle2, 
  Archive 
} from 'lucide-react';

export const TicketStatusBadge = ({ status }) => {
  switch (status) {
    case 'Open':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-950/70 text-sky-300 border border-sky-800/80">
          <CircleDot className="w-3 h-3 text-sky-400 shrink-0" />
          Open
        </span>
      );
    case 'Assigned':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950/70 text-indigo-300 border border-indigo-800/80">
          <UserCheck className="w-3 h-3 text-indigo-400 shrink-0" />
          Assigned
        </span>
      );
    case 'In Progress':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950/70 text-blue-300 border border-blue-800/80">
          <Clock className="w-3 h-3 text-blue-400 shrink-0 animate-spin-slow" />
          In Progress
        </span>
      );
    case 'Pending Customer':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/70 text-amber-300 border border-amber-800/80">
          <HelpCircle className="w-3 h-3 text-amber-400 shrink-0" />
          Pending Customer
        </span>
      );
    case 'Escalated':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-950/70 text-purple-300 border border-purple-800/80 shadow-sm shadow-purple-900/40 animate-pulse">
          <AlertOctagon className="w-3 h-3 text-purple-400 shrink-0" />
          Escalated
        </span>
      );
    case 'Resolved':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-800/80">
          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
          Resolved
        </span>
      );
    case 'Closed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
          <Archive className="w-3 h-3 text-slate-500 shrink-0" />
          Closed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
          {status}
        </span>
      );
  }
};

export default TicketStatusBadge;
