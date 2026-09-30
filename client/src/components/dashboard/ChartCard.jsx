import React from 'react';
import { Loader2, AlertCircle, Inbox } from 'lucide-react';

export const ChartCard = ({
  title,
  subtitle,
  icon: Icon,
  action,
  loading = false,
  error = null,
  isEmpty = false,
  emptyMessage = 'No ticket activity found for this period.',
  children,
  className = '',
  minHeight = 'min-h-[320px]',
}) => {
  return (
    <div
      className={`bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col backdrop-blur-sm transition-all duration-200 hover:border-slate-700/80 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/80">
        <div className="flex items-center space-x-2.5">
          {Icon && (
            <div className="p-1.5 rounded-md bg-slate-800 text-blue-400">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <div>
            <h4 className="text-sm font-semibold text-slate-100">{title}</h4>
            {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>

      <div className={`flex-1 flex flex-col justify-center items-center relative ${minHeight}`}>
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-2 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-xs">Loading analytics data...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center space-y-2 text-rose-400 p-4 text-center">
            <AlertCircle className="w-8 h-8" />
            <span className="text-xs font-medium">{error}</span>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center space-y-2 text-slate-400 p-4 text-center">
            <Inbox className="w-8 h-8 text-slate-500" />
            <span className="text-xs">{emptyMessage}</span>
          </div>
        ) : (
          <div className="w-full h-full">{children}</div>
        )}
      </div>
    </div>
  );
};

export default ChartCard;
