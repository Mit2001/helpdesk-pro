import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl text-xs">
        <p className="font-semibold text-slate-200 mb-1.5">{label}</p>
        {payload.map((entry, index) => (
          <div key={`tooltip-${index}`} className="flex items-center justify-between space-x-4 py-0.5">
            <span className="flex items-center space-x-1.5 text-slate-300">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.name}:</span>
            </span>
            <span className="font-bold text-white">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const TicketTrendChart = ({ data = [], showResolved = true }) => {
  if (!data || data.length === 0) return null;

  // Format short date for X-axis (e.g. Sep 01)
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
            <linearGradient id="createdGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="resolvedGradient" x1="0" y1="0" x2="0" y2="1">
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
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value) => (
              <span className="text-xs text-slate-300 font-medium mr-3">{value}</span>
            )}
          />
          <Area
            type="monotone"
            dataKey="created"
            name="Tickets Created"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#createdGradient)"
          />
          {showResolved && (
            <Area
              type="monotone"
              dataKey="resolved"
              name="Tickets Resolved"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#resolvedGradient)"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TicketTrendChart;
