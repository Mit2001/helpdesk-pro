import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  RotateCcw,
  Calendar,
  Ticket as TicketIcon,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Users,
  ShieldCheck,
  UserCheck,
  Briefcase,
  PlusCircle,
  Zap,
  Activity,
  Layers,
  ChevronRight,
  FolderTree,
  History,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { analyticsService } from '../services/api';
import StatCard from '../components/dashboard/StatCard';
import ChartCard from '../components/dashboard/ChartCard';
import TicketTrendChart from '../components/dashboard/TicketTrendChart';
import StatusChart from '../components/dashboard/StatusChart';
import PriorityChart from '../components/dashboard/PriorityChart';
import CategoryChart from '../components/dashboard/CategoryChart';
import EngineerWorkloadChart from '../components/dashboard/EngineerWorkloadChart';
import ResolutionChart from '../components/dashboard/ResolutionChart';
import CriticalTickets from '../components/dashboard/CriticalTickets';
import TicketStatusBadge from '../components/common/TicketStatusBadge';
import PriorityBadge from '../components/common/PriorityBadge';
import SlaStatusBadge from '../components/common/SlaStatusBadge';

const DATE_RANGE_OPTIONS = [
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
];

const Dashboard = () => {
  const { user } = useAuth();
  const [selectedRangeDays, setSelectedRangeDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const calculateDateRange = (days) => {
    const now = new Date();
    const start = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    return {
      from: start.toISOString().split('T')[0],
      to: now.toISOString().split('T')[0],
    };
  };

  const fetchAnalytics = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const { from, to } = calculateDateRange(selectedRangeDays);
      let res;
      if (user?.role === 'Admin') {
        res = await analyticsService.getAdminAnalytics({ from, to });
      } else if (user?.role === 'Support Engineer') {
        res = await analyticsService.getEngineerAnalytics({ from, to });
      } else {
        res = await analyticsService.getEmployeeAnalytics();
      }

      if (res.data?.success) {
        setAnalyticsData(res.data.data);
      } else {
        setError('Failed to load analytics data.');
      }
    } catch (err) {
      console.error('[Dashboard Error]', err);
      setError(err.response?.data?.message || 'Error loading dashboard analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.role, selectedRangeDays]);

  useEffect(() => {
    if (user?.role) {
      fetchAnalytics();
    }
  }, [fetchAnalytics, user?.role, selectedRangeDays]);

  const handleRefresh = () => {
    fetchAnalytics(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {getGreeting()}, {user?.name || 'User'}
            </h1>
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              {user?.role}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            {user?.role === 'Admin' && 'Executive ITSM Dashboard • Enterprise Performance Overview'}
            {user?.role === 'Support Engineer' && 'Personal Support Dashboard • Workload & SLA Performance'}
            {user?.role === 'Employee' && 'Personal Service Desk • Track Requests & Activity'}
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Date Range Selector (for Admin and Support Engineer) */}
          {(user?.role === 'Admin' || user?.role === 'Support Engineer') && (
            <div className="flex items-center bg-slate-850 border border-slate-700/80 rounded-lg p-1 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1" />
              <select
                value={selectedRangeDays}
                onChange={(e) => setSelectedRangeDays(Number(e.target.value))}
                className="bg-transparent text-slate-200 focus:outline-none pr-2 py-1 font-medium cursor-pointer"
              >
                {DATE_RANGE_OPTIONS.map((opt) => (
                  <option key={opt.days} value={opt.days} className="bg-slate-900 text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors disabled:opacity-50"
            title="Refresh analytics data"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Quick Create Ticket for Employees */}
          {user?.role === 'Employee' && (
            <Link
              to="/tickets/new"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Ticket</span>
            </Link>
          )}
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl flex items-center space-x-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ROLE 1: ADMIN EXECUTIVE DASHBOARD */}
      {user?.role === 'Admin' && (
        <div className="space-y-6">
          {/* Admin Quick Action Shortcuts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              to="/admin/users"
              className="flex items-center space-x-3 p-3.5 bg-slate-900/60 border border-slate-800 hover:border-purple-500/50 rounded-xl transition backdrop-blur-sm group shadow-sm"
            >
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-white block truncate">Manage Users</span>
                <span className="text-[10px] text-slate-400 block truncate">Provision & Roles</span>
              </div>
            </Link>

            <Link
              to="/admin/categories"
              className="flex items-center space-x-3 p-3.5 bg-slate-900/60 border border-slate-800 hover:border-blue-500/50 rounded-xl transition backdrop-blur-sm group shadow-sm"
            >
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition">
                <FolderTree className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-white block truncate">Categories</span>
                <span className="text-[10px] text-slate-400 block truncate">Taxonomy Setup</span>
              </div>
            </Link>

            <Link
              to="/admin/sla"
              className="flex items-center space-x-3 p-3.5 bg-slate-900/60 border border-slate-800 hover:border-amber-500/50 rounded-xl transition backdrop-blur-sm group shadow-sm"
            >
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-white block truncate">SLA Policies</span>
                <span className="text-[10px] text-slate-400 block truncate">Response Targets</span>
              </div>
            </Link>

            <Link
              to="/admin/audit-logs"
              className="flex items-center space-x-3 p-3.5 bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 rounded-xl transition backdrop-blur-sm group shadow-sm"
            >
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition">
                <History className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-white block truncate">Audit Logs</span>
                <span className="text-[10px] text-slate-400 block truncate">Security Trail</span>
              </div>
            </Link>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Tickets"
              value={analyticsData?.kpis?.totalTickets ?? 0}
              icon={TicketIcon}
              color="blue"
              loading={loading}
              subtext="All tickets in system"
            />
            <StatCard
              title="Open & In Progress"
              value={(analyticsData?.kpis?.openTickets ?? 0) + (analyticsData?.kpis?.inProgress ?? 0)}
              icon={Clock}
              color="amber"
              loading={loading}
              subtext={`${analyticsData?.kpis?.openTickets ?? 0} Open • ${analyticsData?.kpis?.inProgress ?? 0} In Progress`}
            />
            <StatCard
              title="SLA Breached"
              value={analyticsData?.kpis?.slaBreached ?? 0}
              icon={AlertTriangle}
              color="rose"
              loading={loading}
              subtext={`${analyticsData?.slaStats?.approaching ?? 0} approaching deadline`}
            />
            <StatCard
              title="SLA Compliance"
              value={analyticsData?.kpis?.slaComplianceRate ?? 100}
              suffix="%"
              icon={ShieldCheck}
              color={analyticsData?.kpis?.slaComplianceRate >= 95 ? 'emerald' : 'amber'}
              loading={loading}
              subtext={`Target: ≥ 95% • Total with SLA: ${analyticsData?.slaStats?.totalWithSla ?? 0}`}
            />
          </div>

          {/* Secondary KPIs: Resolution Speed & First Response */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Resolved Tickets"
              value={analyticsData?.kpis?.resolved ?? 0}
              icon={CheckCircle2}
              color="emerald"
              loading={loading}
              subtext={`${analyticsData?.kpis?.closed ?? 0} Closed`}
            />
            <StatCard
              title="Avg Resolution Time"
              value={analyticsData?.kpis?.averageResolutionHours ?? 0}
              suffix=" hrs"
              icon={TrendingUp}
              color="purple"
              loading={loading}
              subtext={`~${analyticsData?.kpis?.averageResolutionMinutes ?? 0} total minutes`}
            />
            <StatCard
              title="Avg First Response"
              value={analyticsData?.kpis?.averageFirstResponseMinutes ?? 0}
              suffix=" mins"
              icon={Zap}
              color="cyan"
              loading={loading}
              subtext={analyticsData?.kpis?.averageFirstResponseHours ? `${analyticsData?.kpis?.averageFirstResponseHours} hrs` : 'Fast response time'}
            />
            <StatCard
              title="Pending / Escalated"
              value={(analyticsData?.kpis?.pendingCustomer ?? 0) + (analyticsData?.kpis?.escalated ?? 0)}
              icon={Activity}
              color="indigo"
              loading={loading}
              subtext={`${analyticsData?.kpis?.pendingCustomer ?? 0} Pending • ${analyticsData?.kpis?.escalated ?? 0} Escalated`}
            />
          </div>

          {/* Chart Section 1: Ticket Creation Trend & Status Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ChartCard
              title="Ticket Activity Trend"
              subtitle={`Created vs Resolved tickets over the last ${selectedRangeDays} days`}
              icon={TrendingUp}
              loading={loading}
              isEmpty={!analyticsData?.ticketTrend?.some((d) => d.created > 0 || d.resolved > 0)}
              className="lg:col-span-2"
            >
              <TicketTrendChart data={analyticsData?.ticketTrend} showResolved={true} />
            </ChartCard>

            <ChartCard
              title="Tickets by Status"
              subtitle="Distribution across lifecycle"
              icon={Layers}
              loading={loading}
              isEmpty={!analyticsData?.ticketsByStatus?.some((s) => s.count > 0)}
            >
              <StatusChart data={analyticsData?.ticketsByStatus} />
            </ChartCard>
          </div>

          {/* Chart Section 2: Priority & Category Breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title="Tickets by Priority"
              subtitle="Severity volume breakdown"
              icon={AlertTriangle}
              loading={loading}
              isEmpty={!analyticsData?.ticketsByPriority?.some((p) => p.count > 0)}
            >
              <PriorityChart data={analyticsData?.ticketsByPriority} />
            </ChartCard>

            <ChartCard
              title="Tickets by Category"
              subtitle="Service domain distribution"
              icon={Briefcase}
              loading={loading}
              isEmpty={!analyticsData?.ticketsByCategory || analyticsData.ticketsByCategory.length === 0}
            >
              <CategoryChart data={analyticsData?.ticketsByCategory} />
            </ChartCard>
          </div>

          {/* Chart Section 3: Engineer Workload Matrix */}
          <div className="grid grid-cols-1 gap-6">
            <ChartCard
              title="Support Engineer Workload & Resolution Matrix"
              subtitle="Assigned ticket volume, progress, and SLA compliance per engineer"
              icon={Users}
              loading={loading}
              isEmpty={!analyticsData?.engineerWorkload || analyticsData.engineerWorkload.length === 0}
              emptyMessage="No tickets currently assigned to support engineers."
            >
              <EngineerWorkloadChart data={analyticsData?.engineerWorkload} />
            </ChartCard>
          </div>
        </div>
      )}

      {/* ROLE 2: SUPPORT ENGINEER DASHBOARD */}
      {user?.role === 'Support Engineer' && (
        <div className="space-y-6">
          {/* Personal KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="My Assigned Tickets"
              value={analyticsData?.kpis?.assignedTickets ?? 0}
              icon={TicketIcon}
              color="blue"
              loading={loading}
              subtext="Total workload assigned to me"
            />
            <StatCard
              title="My Active Queue"
              value={(analyticsData?.kpis?.openTickets ?? 0) + (analyticsData?.kpis?.inProgress ?? 0)}
              icon={Clock}
              color="amber"
              loading={loading}
              subtext={`${analyticsData?.kpis?.openTickets ?? 0} Open • ${analyticsData?.kpis?.inProgress ?? 0} In Progress`}
            />
            <StatCard
              title="My SLA Breached"
              value={analyticsData?.kpis?.slaBreached ?? 0}
              icon={AlertTriangle}
              color="rose"
              loading={loading}
              subtext="Requires immediate resolution"
            />
            <StatCard
              title="My SLA Compliance"
              value={analyticsData?.kpis?.slaComplianceRate ?? 100}
              suffix="%"
              icon={ShieldCheck}
              color={analyticsData?.kpis?.slaComplianceRate >= 95 ? 'emerald' : 'amber'}
              loading={loading}
              subtext={`Avg Res: ${analyticsData?.kpis?.averageResolutionHours ?? 0} hrs`}
            />
          </div>

          {/* Critical Tickets Requiring Attention */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/80">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-md bg-rose-500/10 text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    Critical Tickets Requiring Attention
                  </h4>
                  <p className="text-xs text-slate-400">
                    Highest severity incidents sorted by earliest SLA due date
                  </p>
                </div>
              </div>
              <Link
                to="/tickets?priority=Critical"
                className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center"
              >
                <span>View All Critical</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Link>
            </div>

            <CriticalTickets
              tickets={analyticsData?.criticalTickets}
              loading={loading}
            />
          </div>

          {/* Personal Charts: Status, Priority, Resolution Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ChartCard
              title="My Tickets by Status"
              subtitle="Current status breakdown"
              icon={Layers}
              loading={loading}
              isEmpty={!analyticsData?.ticketsByStatus?.some((s) => s.count > 0)}
            >
              <StatusChart data={analyticsData?.ticketsByStatus} />
            </ChartCard>

            <ChartCard
              title="My Tickets by Priority"
              subtitle="Workload severity distribution"
              icon={AlertTriangle}
              loading={loading}
              isEmpty={!analyticsData?.ticketsByPriority?.some((p) => p.count > 0)}
            >
              <PriorityChart data={analyticsData?.ticketsByPriority} />
            </ChartCard>

            <ChartCard
              title="My Resolution Trend"
              subtitle={`Resolved tickets over last ${selectedRangeDays} days`}
              icon={TrendingUp}
              loading={loading}
              isEmpty={!analyticsData?.resolutionTrend?.some((r) => r.resolved > 0)}
            >
              <ResolutionChart data={analyticsData?.resolutionTrend} />
            </ChartCard>
          </div>
        </div>
      )}

      {/* ROLE 3: EMPLOYEE DASHBOARD */}
      {user?.role === 'Employee' && (
        <div className="space-y-6">
          {/* Employee Personal KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="My Total Requests"
              value={analyticsData?.kpis?.myTotalTickets ?? 0}
              icon={TicketIcon}
              color="blue"
              loading={loading}
              subtext="All service tickets submitted"
            />
            <StatCard
              title="Active & In Progress"
              value={(analyticsData?.kpis?.myOpenTickets ?? 0) + (analyticsData?.kpis?.myInProgressTickets ?? 0)}
              icon={Clock}
              color="amber"
              loading={loading}
              subtext={`${analyticsData?.kpis?.myOpenTickets ?? 0} Open • ${analyticsData?.kpis?.myInProgressTickets ?? 0} In Progress`}
            />
            <StatCard
              title="Resolved Requests"
              value={analyticsData?.kpis?.myResolvedTickets ?? 0}
              icon={CheckCircle2}
              color="emerald"
              loading={loading}
              subtext={`${analyticsData?.kpis?.myClosedTickets ?? 0} Closed`}
            />
            <StatCard
              title="Action Required"
              value={analyticsData?.kpis?.myPendingTickets ?? 0}
              icon={AlertCircle}
              color="purple"
              loading={loading}
              subtext="Awaiting your reply or confirmation"
            />
          </div>

          {/* Recent Tickets & Visual Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Tickets Table (2 cols) */}
            <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/80">
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400">
                    <TicketIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Recent Service Requests</h4>
                    <p className="text-xs text-slate-400">Latest tickets submitted by you</p>
                  </div>
                </div>
                <Link
                  to="/my-tickets"
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center"
                >
                  <span>View All Requests</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Link>
              </div>

              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Loading recent requests...
                </div>
              ) : !analyticsData?.recentTickets || analyticsData.recentTickets.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center text-center text-slate-400">
                  <TicketIcon className="w-8 h-8 text-slate-500 mb-2" />
                  <p className="text-sm font-medium text-slate-300">No service requests yet</p>
                  <p className="text-xs text-slate-500 mt-0.5 mb-3">
                    Need IT assistance or have an issue? Submit a ticket anytime.
                  </p>
                  <Link
                    to="/tickets/new"
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
                  >
                    Submit New Ticket
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-slate-400 uppercase bg-slate-800/60 text-[10px] tracking-wider">
                      <tr>
                        <th className="px-3 py-2.5 rounded-l-lg">Ticket</th>
                        <th className="px-3 py-2.5">Subject</th>
                        <th className="px-3 py-2.5">Priority</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5">SLA</th>
                        <th className="px-3 py-2.5 text-right rounded-r-lg">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {analyticsData.recentTickets.map((ticket) => (
                        <tr key={ticket._id} className="transition-colors hover:bg-slate-800/40">
                          <td className="px-3 py-3 font-mono font-semibold text-blue-400 whitespace-nowrap">
                            <Link to={`/tickets/${ticket._id}`} className="hover:underline">
                              {ticket.ticketNumber}
                            </Link>
                          </td>
                          <td className="px-3 py-3 font-medium text-slate-200 max-w-[200px] truncate">
                            <Link
                              to={`/tickets/${ticket._id}`}
                              className="hover:text-blue-400 transition-colors"
                              title={ticket.subject}
                            >
                              {ticket.subject}
                            </Link>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <PriorityBadge priority={ticket.priority} />
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <TicketStatusBadge status={ticket.status} />
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <SlaStatusBadge
                              slaStatus={ticket.slaStatus}
                              slaDueAt={ticket.slaDueAt}
                            />
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
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Status Breakdown (1 col) */}
            <ChartCard
              title="Request Status Breakdown"
              subtitle="Overview of your tickets"
              icon={Layers}
              loading={loading}
              isEmpty={!analyticsData?.ticketsByStatus?.some((s) => s.count > 0)}
              emptyMessage="No ticket status history available."
            >
              <StatusChart data={analyticsData?.ticketsByStatus} />
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
