import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Ticket, 
  Search, 
  Filter, 
  RotateCcw, 
  Loader2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  UserCheck, 
  Inbox, 
  Calendar 
} from 'lucide-react';
import { ticketService, categoryService } from '../services/api';
import PriorityBadge from '../components/common/PriorityBadge';
import TicketStatusBadge from '../components/common/TicketStatusBadge';
import SlaStatusBadge from '../components/common/SlaStatusBadge';

const Tickets = () => {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Fetch Categories for Filter Dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoryService.getCategories();
        if (res.data.success) {
          setCategories(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch Tickets from API
  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page,
        limit: 10,
        ...(search.trim() && { search: search.trim() }),
        ...(status !== 'all' && { status }),
        ...(priority !== 'all' && { priority }),
        ...(category !== 'all' && { category }),
      };

      const res = await ticketService.getTickets(params);
      if (res.data.success) {
        setTickets(res.data.data.tickets);
        setPagination(res.data.data.pagination);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, priority, category]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleClearFilters = () => {
    setSearch('');
    setStatus('all');
    setPriority('all');
    setCategory('all');
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Ticket className="w-6 h-6 text-brand-400" />
            Global Support Queue
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Enterprise incident management and ticket triage dashboard.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchTickets()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-sm font-medium border border-slate-700 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Refresh Queue
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="md:col-span-4 relative">
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
              placeholder="Search by ticket #, subject, or description..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-850 border border-slate-750 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 bg-slate-850 border border-slate-750 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
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

          {/* Priority Filter */}
          <div className="md:col-span-2">
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 bg-slate-850 border border-slate-750 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
            >
              <option value="all">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="md:col-span-2">
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 bg-slate-850 border border-slate-750 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          <div className="md:col-span-2 flex items-center">
            <button
              onClick={handleClearFilters}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-sm font-medium border border-slate-700 transition-all flex items-center justify-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-950/60 border border-red-800 text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            <p className="text-sm font-medium">Fetching support queue tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">No Tickets Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No tickets match your search query or active filter criteria. Try resetting filters.
            </p>
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-brand-300 hover:bg-slate-750 border border-slate-700"
            >
              Clear All Filters
            </button>
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
                  <th className="px-5 py-4">Assigned Engineer</th>
                  <th className="px-5 py-4">SLA Target</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {tickets.map((ticket) => (
                  <tr
                    key={ticket._id}
                    className="hover:bg-slate-850/60 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/tickets/${ticket._id}`)}
                  >
                    {/* Ticket # */}
                    <td className="px-5 py-4 font-mono font-bold text-brand-400 whitespace-nowrap">
                      {ticket.ticketNumber}
                    </td>

                    {/* Subject */}
                    <td className="px-5 py-4">
                      <div className="max-w-xs sm:max-w-sm truncate font-semibold text-white group-hover:text-brand-300 transition-colors">
                        {ticket.subject}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>By {ticket.createdBy?.name || 'Unknown'}</span>
                        <span>•</span>
                        <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-xs text-slate-300 font-medium">
                        {ticket.category?.name || 'General'}
                      </span>
                      {ticket.subcategory && (
                        <div className="text-[10px] text-slate-500">{ticket.subcategory}</div>
                      )}
                    </td>

                    {/* Priority */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <PriorityBadge priority={ticket.priority} />
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <TicketStatusBadge status={ticket.status} />
                    </td>

                    {/* Assigned Engineer */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      {ticket.assignedTo ? (
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-brand-500/20 text-brand-400 text-[10px] font-bold flex items-center justify-center">
                            {ticket.assignedTo.name?.charAt(0)}
                          </div>
                          <span className="text-xs text-slate-200">{ticket.assignedTo.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-400/80 italic font-medium">Unassigned</span>
                      )}
                    </td>

                    {/* SLA Target */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <SlaStatusBadge slaStatus={ticket.slaStatus} slaDueAt={ticket.slaDueAt} />
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/tickets/${ticket._id}`);
                        }}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-brand-600 text-slate-400 hover:text-white transition-all border border-slate-700 hover:border-brand-500"
                        title="View Details"
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
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-white font-semibold">
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 transition-all"
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

export default Tickets;
