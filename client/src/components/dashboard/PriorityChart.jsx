import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

const PRIORITY_COLORS = {
  Low: '#10b981', // emerald-500
  Medium: '#3b82f6', // blue-500
  High: '#f59e0b', // amber-500
  Critical: '#f43f5e', // rose-500
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 shadow-xl text-xs">
        <div className="flex items-center space-x-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: data.payload.fill }}
          />
          <span className="font-medium text-slate-300">{data.payload.priority}:</span>
          <span className="font-bold text-white">{data.value} tickets</span>
        </div>
      </div>
    );
  }
  return null;
};

export const PriorityChart = ({ data = [] }) => {
  const chartData = data.map((item) => ({
    priority: item.priority,
    count: item.count,
    fill: PRIORITY_COLORS[item.priority] || '#3b82f6',
  }));

  const totalCount = chartData.reduce((sum, item) => sum + item.count, 0);
  if (totalCount === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-xs text-slate-500">
        No priority distribution data available
      </div>
    );
  }

  return (
    <div className="w-full h-64 sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
          <XAxis
            dataKey="priority"
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
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={45}>
            {chartData.map((entry, index) => (
              <Cell key={`bar-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriorityChart;
