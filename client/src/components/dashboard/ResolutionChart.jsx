import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 shadow-xl text-xs">
        <p className="font-semibold text-slate-200 mb-1">{label}</p>
        <div className="flex items-center space-x-2 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Resolved:</span>
          <span className="font-bold text-white">{payload[0].value}</span>
        </div>
      </div>
    );
  }
  return null;
};

export const ResolutionChart = ({ data = [] }) => {
  if (!data || data.length === 0) return null;

  const formattedData = data.map((item) => {
    const parts = item.date.split('-');
    const shortDate = parts.length === 3 ? `${parts[1]}/${parts[2]}` : item.date;
    return {
      ...item,
      displayDate: shortDate,
    };
  });

  return (
    <div className="w-full h-64 sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={formattedData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="resGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
          <XAxis
            dataKey="displayDate"
            stroke="#64748b"
            tick={{ fontSize: 11 }}
            tickLine={false}
          />
          <YAxis
            stroke="#64748b"
            tick={{ fontSize: 11 }}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="resolved"
            name="Tickets Resolved"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#resGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ResolutionChart;
