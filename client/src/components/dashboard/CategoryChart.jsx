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

const PALETTE = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#6366f1', // indigo
];

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
          <span className="font-medium text-slate-300">{data.payload.category}:</span>
          <span className="font-bold text-white">{data.value} tickets</span>
        </div>
      </div>
    );
  }
  return null;
};

export const CategoryChart = ({ data = [] }) => {
  const chartData = data.map((item, index) => ({
    category: item.category,
    count: item.count,
    fill: PALETTE[index % PALETTE.length],
  }));

  const totalCount = chartData.reduce((sum, item) => sum + item.count, 0);
  if (totalCount === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-xs text-slate-500">
        No category distribution data available
      </div>
    );
  }

  return (
    <div className="w-full h-64 sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 15, right: 10, left: -20, bottom: 25 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
          <XAxis
            dataKey="category"
            stroke="#64748b"
            tick={{ fontSize: 10 }}
            tickLine={false}
            angle={-20}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            stroke="#64748b"
            tick={{ fontSize: 11 }}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {chartData.map((entry, index) => (
              <Cell key={`bar-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CategoryChart;
