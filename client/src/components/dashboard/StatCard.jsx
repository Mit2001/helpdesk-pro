import React from 'react';
import { Loader2 } from 'lucide-react';

const colorMap = {
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
    iconBg: 'bg-blue-500/20',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    iconBg: 'bg-emerald-500/20',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    iconBg: 'bg-amber-500/20',
  },
  rose: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    text: 'text-rose-400',
    iconBg: 'bg-rose-500/20',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    text: 'text-purple-400',
    iconBg: 'bg-purple-500/20',
  },
  indigo: {
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    text: 'text-indigo-400',
    iconBg: 'bg-indigo-500/20',
  },
  cyan: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    text: 'text-cyan-400',
    iconBg: 'bg-cyan-500/20',
  },
};

export const StatCard = ({
  title,
  value,
  subtext,
  icon: Icon,
  color = 'blue',
  loading = false,
  suffix = '',
  prefix = '',
}) => {
  const theme = colorMap[color] || colorMap.blue;

  return (
    <div
      className={`bg-slate-900/70 border ${theme.border} rounded-xl p-5 backdrop-blur-sm relative overflow-hidden transition-all duration-200 hover:border-slate-700 shadow-sm`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
            {title}
          </p>
          {loading ? (
            <div className="flex items-center space-x-2 py-1">
              <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
            </div>
          ) : (
            <h3 className="text-2xl font-bold text-white tracking-tight">
              {prefix}
              {typeof value === 'number' ? value.toLocaleString() : value ?? 0}
              {suffix}
            </h3>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${theme.iconBg} ${theme.text}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      {subtext && (
        <div className="mt-3 flex items-center text-xs text-slate-400 border-t border-slate-800/80 pt-2.5">
          <span>{subtext}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
