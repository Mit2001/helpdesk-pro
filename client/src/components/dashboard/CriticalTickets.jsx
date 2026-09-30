import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, ChevronRight, Inbox } from 'lucide-react';
import TicketStatusBadge from '../common/TicketStatusBadge.jsx';
import SlaStatusBadge from '../common/SlaStatusBadge.jsx';
import PriorityBadge from '../common/PriorityBadge.jsx';

export const CriticalTickets = ({ tickets = [], loading = false }) => {
  if (loading) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        Loading critical tickets...
      </div>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <div className="py-8 flex flex-col items-center justify-center text-center text-slate-400">
        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-full mb-2">
          <Inbox className="w-5 h-5" />
        </div>
        <p className="text-sm font-medium text-slate-300">No Critical Tickets Pending</p>
        <p className="text-xs text-slate-500 mt-0.5">
          All high-priority incidents are currently resolved or under normal SLA.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="text-slate-400 uppercase bg-slate-800/60 text-[10px] tracking-wider">
          <tr>
            <th className="px-3 py-2.5 rounded-l-lg">Ticket</th>
            <th className="px-3 py-2.5">Subject</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="px-3 py-2.5">Priority</th>
            <th className="px-3 py-2.5">SLA Health</th>
            <th className="px-3 py-2.5">Assigned</th>
            <th className="px-3 py-2.5 text-right rounded-r-lg">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {tickets.map((ticket) => {
            const isBreached = ticket.slaStatus === 'Breached';
            return (
              <tr
                key={ticket._id}
                className={`transition-colors hover:bg-slate-800/40 ${
                  isBreached ? 'bg-rose-500/5' : ''
                }`}
              >
                <td className="px-3 py-3 font-mono font-semibold text-blue-400 whitespace-nowrap">
                  <Link
                    to={`/tickets/${ticket._id}`}
                    className="hover:underline flex items-center space-x-1"
                  >
                    <span>{ticket.ticketNumber}</span>
                  </Link>
                </td>
                <td className="px-3 py-3 font-medium text-slate-200 max-w-[220px] truncate">
                  <Link
                    to={`/tickets/${ticket._id}`}
                    className="hover:text-blue-400 transition-colors"
                    title={ticket.subject}
                  >
                    {ticket.subject}
                  </Link>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <TicketStatusBadge status={ticket.status} />
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <PriorityBadge priority={ticket.priority} />
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <SlaStatusBadge
                    slaStatus={ticket.slaStatus}
                    slaDueAt={ticket.slaDueAt}
                  />
                </td>
                <td className="px-3 py-3 text-slate-300 whitespace-nowrap">
                  {ticket.assignedTo?.name ? (
                    <span className="text-slate-300">{ticket.assignedTo.name}</span>
                  ) : (
                    <span className="text-amber-400 font-medium italic">Unassigned</span>
                  )}
                </td>
                <td className="px-3 py-3 text-right whitespace-nowrap">
                  <Link
                    to={`/tickets/${ticket._id}`}
                    className="inline-flex items-center px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 transition text-[11px] font-medium"
                  >
                    <span>View</span>
                    <ChevronRight className="w-3 h-3 ml-0.5" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default CriticalTickets;
