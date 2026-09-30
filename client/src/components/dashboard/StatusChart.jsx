import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

const STATUS_COLORS = {
  Open: '#3b82f6', // blue-500
  Assigned: '#6366f1', // indigo-500
  'In Progress': '#f59e0b', // amber-500
  'Pending Customer': '#a855f7', // purple-500
  Escalated: '#f43f5e', // rose-500
  Resolved: '#10b981', // emerald-500
  Closed: '#64748b', // slate-500
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
          <span className="font-medium text-slate-300">{data.name}:</span>
          <span className="font-bold text-white">{data.value}</span>
        </div>
      </div>
    );
  }
  return null;
};

export const StatusChart = ({ data = [] }) => {
  const filteredData = data.filter((item) => item.count > 0);

  if (filteredData.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-xs text-slate-500">
        No ticket status data available
      </div>
    );
  }

  const chartData = filteredData.map((item) => ({
    name: item.status,
    value: item.count,
    fill: STATUS_COLORS[item.status] || '#94a3b8',
  }));

  return (
    <div className="w-full h-64 sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span className="text-xs text-slate-300 font-medium mr-2">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StatusChart;
