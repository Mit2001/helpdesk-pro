import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  Search,
  Filter,
  RotateCcw,
  Calendar,
  ShieldCheck,
  UserCheck,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Code,
  X,
  Layers,
  Clock,
  Ticket,
  User as UserIcon,
} from 'lucide-react';
import { auditLogService } from '../../services/api';

const EVENT_TYPE_OPTIONS = [
  { label: 'All Event Types', value: 'all' },
  { label: 'User Created (USER_CREATED)', value: 'USER_CREATED' },
  { label: 'User Updated (USER_UPDATED)', value: 'USER_UPDATED' },
  { label: 'User Role Changed (USER_ROLE_CHANGED)', value: 'USER_ROLE_CHANGED' },
  { label: 'User Activated (USER_ACTIVATED)', value: 'USER_ACTIVATED' },
  { label: 'User Deactivated (USER_DEACTIVATED)', value: 'USER_DEACTIVATED' },
  { label: 'Category Created (CATEGORY_CREATED)', value: 'CATEGORY_CREATED' },
  { label: 'Category Updated (CATEGORY_UPDATED)', value: 'CATEGORY_UPDATED' },
  { label: 'Category Activated (CATEGORY_ACTIVATED)', value: 'CATEGORY_ACTIVATED' },
  { label: 'Category Deactivated (CATEGORY_DEACTIVATED)', value: 'CATEGORY_DEACTIVATED' },
  { label: 'SLA Created (SLA_CREATED)', value: 'SLA_CREATED' },
  { label: 'SLA Updated (SLA_UPDATED)', value: 'SLA_UPDATED' },
  { label: 'SLA Activated (SLA_ACTIVATED)', value: 'SLA_ACTIVATED' },
  { label: 'SLA Deactivated (SLA_DEACTIVATED)', value: 'SLA_DEACTIVATED' },
  { label: 'Comment Added (COMMENT_ADDED)', value: 'COMMENT_ADDED' },
  { label: 'Internal Note Added (INTERNAL_NOTE_ADDED)', value: 'INTERNAL_NOTE_ADDED' },
  { label: 'Ticket Escalated (TICKET_ESCALATED)', value: 'TICKET_ESCALATED' },
  { label: 'Ticket Resolved (TICKET_RESOLVED)', value: 'TICKET_RESOLVED' },
  { label: 'Ticket Closed (TICKET_CLOSED)', value: 'TICKET_CLOSED' },
  { label: 'Ticket Reopened (TICKET_REOPENED)', value: 'TICKET_REOPENED' },
];

const ENTITY_TYPE_OPTIONS = [
  { label: 'All Entities', value: 'all' },
  { label: 'User', value: 'User' },
  { label: 'Category', value: 'Category' },
  { label: 'SLA', value: 'SLA' },
  { label: 'Ticket', value: 'Ticket' },
  { label: 'System', value: 'System' },
];

export const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 20 });

  // Metadata Modal
  const [selectedMeta, setSelectedMeta] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await auditLogService.getAuditLogs({
        page,
        limit: 20,
        search,
        action: actionFilter !== 'all' ? actionFilter : undefined,
        entityType: entityFilter !== 'all' ? entityFilter : undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      });

      if (res.data?.success) {
        setLogs(res.data.data || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      console.error('[AuditLogs Error]', err);
      setError(err.response?.data?.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [page, search, actionFilter, entityFilter, fromDate, toDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleClearFilters = () => {
    setSearch('');
    setActionFilter('all');
    setEntityFilter('all');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const getActionBadge = (action) => {
    if (action.includes('USER_CREATED') || action.includes('CATEGORY_CREATED') || action.includes('SLA_CREATED')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-950 text-emerald-300 border border-emerald-800">
          {action}
        </span>
      );
    }
    if (action.includes('DEACTIVATED') || action.includes('CLOSED')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-rose-950 text-rose-300 border border-rose-800">
          {action}
        </span>
      );
    }
    if (action.includes('ROLE_CHANGED') || action.includes('ESCALATED')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-purple-950 text-purple-300 border border-purple-800">
          {action}
        </span>
      );
    }
    if (action.includes('RESOLVED') || action.includes('ACTIVATED')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-950 text-blue-300 border border-blue-800">
          {action}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
        {action}
      </span>
    );
  };

  const getEntityIcon = (entityType) => {
    switch (entityType) {
      case 'User':
        return <UserIcon className="w-3.5 h-3.5 text-purple-400" />;
      case 'Category':
        return <Layers className="w-3.5 h-3.5 text-blue-400" />;
      case 'SLA':
        return <Clock className="w-3.5 h-3.5 text-amber-400" />;
      case 'Ticket':
        return <Ticket className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <History className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Enterprise Audit Trail
            </h1>
            <p className="text-xs text-slate-400">
              Immutable record of all administrative, user provisioning, security, and ticket workflow events ({pagination.total} entries)
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchLogs()}
          className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 transition"
          title="Refresh audit trail"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl flex items-center space-x-3 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search audit descriptions..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Event Filter */}
            <div className="flex items-center space-x-1.5 bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-slate-200 focus:outline-none pr-1 py-1 cursor-pointer font-medium max-w-[200px]"
              >
                {EVENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Entity Filter */}
            <div className="flex items-center space-x-1.5 bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
              <select
                value={entityFilter}
                onChange={(e) => {
                  setEntityFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-slate-200 focus:outline-none pr-1 py-1 cursor-pointer font-medium"
              >
                {ENTITY_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date from */}
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
            />

            {/* Date to */}
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
            />

            {(search || actionFilter !== 'all' || entityFilter !== 'all' || fromDate || toDate) && (
              <button
                onClick={handleClearFilters}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm shadow-sm">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            <span className="text-xs">Loading audit logs...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
            <History className="w-10 h-10 text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">No audit records found</p>
            <p className="text-xs text-slate-500 mt-1">
              Events will be captured automatically as administrative and ticket actions occur.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase bg-slate-850/80 text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor / User</th>
                  <th className="px-4 py-3">Action Event</th>
                  <th className="px-4 py-3">Target Entity</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {logs.map((log) => (
                  <tr key={log._id} className="transition-colors hover:bg-slate-800/40">
                    {/* Timestamp */}
                    <td className="px-4 py-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>

                    {/* Actor */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.user ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300">
                            {log.user.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <span className="font-semibold text-white block">{log.user.name}</span>
                            <span className="text-[10px] text-slate-400 block">{log.user.role}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">System / Automation</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>

                    {/* Target Entity */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5 text-slate-300">
                        {getEntityIcon(log.entityType)}
                        <span className="font-medium">{log.entityType}</span>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3 text-slate-300 max-w-[340px] truncate" title={log.description}>
                      {log.description}
                    </td>

                    {/* Details modal trigger */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {log.metadata && Object.keys(log.metadata).length > 0 ? (
                        <button
                          onClick={() => setSelectedMeta(log)}
                          className="inline-flex items-center px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-[11px] font-mono"
                        >
                          <Code className="w-3 h-3 mr-1" />
                          <span>JSON</span>
                        </button>
                      ) : (
                        <span className="text-slate-600 text-[10px]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-slate-800 bg-slate-850/40 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing Page <span className="font-semibold text-white">{page}</span> of{' '}
              <span className="font-semibold text-white">{pagination.pages}</span> ({pagination.total} records)
            </span>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages || loading}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* METADATA INSPECTOR MODAL */}
      {selectedMeta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 relative shadow-2xl">
            <button
              onClick={() => setSelectedMeta(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-slate-800 text-purple-400 rounded-xl border border-slate-700">
                <Code className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Audit Event Metadata</h3>
                <p className="text-xs text-slate-400">{selectedMeta.action}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs mb-4">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-300">
                <p className="font-semibold text-white mb-1">{selectedMeta.description}</p>
                <p className="text-[11px] text-slate-500">
                  Actor: {selectedMeta.user?.name} ({selectedMeta.user?.email}) • IP: {selectedMeta.ipAddress || 'Internal'}
                </p>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Payload Metadata</label>
                <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-60">
                  {JSON.stringify(selectedMeta.metadata, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedMeta(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
