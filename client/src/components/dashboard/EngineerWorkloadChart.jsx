import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl text-xs min-w-[140px]">
        <p className="font-semibold text-white mb-1.5">{label}</p>
        {payload.map((entry, index) => (
          <div key={`tooltip-${index}`} className="flex items-center justify-between py-0.5 space-x-3">
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

export const EngineerWorkloadChart = ({ data = [] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-xs text-slate-500">
        No engineer workload data available
      </div>
    );
  }

  return (
    <div className="w-full h-64 sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} horizontal={false} />
          <XAxis
            type="number"
            stroke="#64748b"
            tick={{ fontSize: 11 }}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="engineer"
            stroke="#64748b"
            tick={{ fontSize: 11 }}
            tickLine={false}
            width={90}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value) => (
              <span className="text-xs text-slate-300 font-medium mr-2">{value}</span>
            )}
          />
          <Bar dataKey="open" name="Open" fill="#3b82f6" stackId="a" />
          <Bar dataKey="inProgress" name="In Progress" fill="#f59e0b" stackId="a" />
          <Bar dataKey="resolved" name="Resolved" fill="#10b981" stackId="a" />
          <Bar dataKey="slaBreached" name="SLA Breached" fill="#f43f5e" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EngineerWorkloadChart;
