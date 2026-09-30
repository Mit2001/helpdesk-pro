import React from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle } from 'lucide-react';

export const SlaStatusBadge = ({ slaStatus, slaDueAt }) => {
  const formatRemainingTime = (dueDate) => {
    if (!dueDate) return '';
    const diffMs = new Date(dueDate).getTime() - Date.now();
    if (diffMs <= 0) return 'Breached';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h left`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  };

  const remaining = formatRemainingTime(slaDueAt);

  switch (slaStatus) {
    case 'Breached':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-950/80 text-red-300 border border-red-700/80 shadow-sm shadow-red-950">
          <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
          SLA BREACHED
        </span>
      );
    case 'Approaching':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/70 text-amber-300 border border-amber-800/80">
          <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
          Approaching ({remaining})
        </span>
      );
    case 'Healthy':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/50 text-emerald-300 border border-emerald-800/60">
          <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
          {remaining ? remaining : 'Healthy'}
        </span>
      );
  }
};

export default SlaStatusBadge;
