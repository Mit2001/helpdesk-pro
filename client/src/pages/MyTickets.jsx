import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Inbox, 
  PlusCircle, 
  Search, 
  Filter, 
  RotateCcw, 
  Loader2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Calendar 
} from 'lucide-react';
import { ticketService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PriorityBadge from '../components/common/PriorityBadge';
import TicketStatusBadge from '../components/common/TicketStatusBadge';
import SlaStatusBadge from '../components/common/SlaStatusBadge';

const MyTickets = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  const fetchMyTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page,
        limit: 10,
        ...(search.trim() && { search: search.trim() }),
        ...(status !== 'all' && { status }),
        ...(priority !== 'all' && { priority }),
      };

      const res = await ticketService.getMyTickets(params);
      if (res.data.success) {
        setTickets(res.data.data.tickets);
        setPagination(res.data.data.pagination);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch personal tickets');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, priority]);

  useEffect(() => {
    fetchMyTickets();
  }, [fetchMyTickets]);

  const getPageTitle = () => {
    if (user?.role === 'Support Engineer') return 'Assigned Tickets';
    return 'My Support Requests';
  };

  const getPageSubtitle = () => {
    if (user?.role === 'Support Engineer') {
      return 'Tickets currently assigned to you for diagnosis and resolution.';
    }
    return 'Track status, updates, and SLA resolution times for your submitted tickets.';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Inbox className="w-6 h-6 text-brand-400" />
            {getPageTitle()}
          </h1>
          <p className="text-slate-400 text-sm mt-1">{getPageSubtitle()}</p>
        </div>

        <div className="flex items-center gap-3">
          {(user?.role === 'Employee' || user?.role === 'Admin') && (
            <Link
              to="/tickets/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-lg shadow-brand-600/20 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              New Ticket
            </Link>
          )}

          <button
            onClick={() => fetchMyTickets()}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition-all"
            title="Refresh"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-center gap-3">
        <div className="w-full md:flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search your tickets..."
            className="w-full pl-10 pr-4 py-2 bg-slate-850 border border-slate-750 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          />
        </div>

        <div className="w-full md:w-48">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-slate-850 border border-slate-750 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          >
            <option value="all">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending Customer">Pending Customer</option>
            <option value="Escalated">Escalated</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        <div className="w-full md:w-40">
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-slate-850 border border-slate-750 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          >
            <option value="all">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-950/60 border border-red-800 text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Ticket List / Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            <p className="text-sm font-medium">Loading your tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">No Tickets Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You currently do not have any tickets matching your filter criteria.
            </p>
            {(user?.role === 'Employee' || user?.role === 'Admin') && (
              <Link
                to="/tickets/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-xs font-semibold text-white hover:bg-brand-500 shadow-md transition-all"
              >
                <PlusCircle className="w-4 h-4" /> Create Ticket Now
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-850/80 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4">Ticket #</th>
                  <th className="px-5 py-4">Subject</th>
                  <th className="px-5 py-4">Category</th>
                  <th className="px-5 py-4">Priority</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Created Date</th>
                  <th className="px-5 py-4">SLA Target</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {tickets.map((ticket) => (
                  <tr
                    key={ticket._id}
                    className="hover:bg-slate-850/60 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/tickets/${ticket._id}`)}
                  >
                    <td className="px-5 py-4 font-mono font-bold text-brand-400 whitespace-nowrap">
                      {ticket.ticketNumber}
                    </td>

                    <td className="px-5 py-4">
                      <div className="max-w-xs sm:max-w-sm truncate font-semibold text-white group-hover:text-brand-300 transition-colors">
                        {ticket.subject}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>{ticket.department || 'General'}</span>
                        {ticket.assignedTo && <span>• Assigned to {ticket.assignedTo.name}</span>}
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-xs text-slate-300 font-medium">
                        {ticket.category?.name || 'General'}
                      </span>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <PriorityBadge priority={ticket.priority} />
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <TicketStatusBadge status={ticket.status} />
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-400">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <SlaStatusBadge slaStatus={ticket.slaStatus} slaDueAt={ticket.slaDueAt} />
                    </td>

                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/tickets/${ticket._id}`);
                        }}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-brand-600 text-slate-400 hover:text-white transition-all border border-slate-700"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && pagination.total > 0 && (
          <div className="px-6 py-4 bg-slate-850/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              Showing <strong className="text-white">{(pagination.page - 1) * pagination.limit + 1}</strong> to{' '}
              <strong className="text-white">{Math.min(pagination.page * pagination.limit, pagination.total)}</strong> of{' '}
              <strong className="text-white">{pagination.total}</strong> tickets
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-white font-semibold">
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTickets;
