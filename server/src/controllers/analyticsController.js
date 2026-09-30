import mongoose from 'mongoose';
import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import Category from '../models/Category.js';

/**
 * Utility: Generate array of YYYY-MM-DD date strings between start and end date
 */
const getDateRangeArray = (startDate, endDate) => {
  const dates = [];
  const curr = new Date(startDate);
  // Normalize curr to UTC midnight
  curr.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);

  while (curr <= end) {
    dates.push(curr.toISOString().split('T')[0]);
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return dates;
};

/**
 * Utility: Parse from and to query params with fallback to last 30 days
 */
const parseDateRange = (fromQuery, toQuery) => {
  const now = new Date();
  let endDate = toQuery ? new Date(toQuery) : new Date(now);
  if (isNaN(endDate.getTime())) {
    endDate = new Date(now);
  }
  endDate.setUTCHours(23, 59, 59, 999);

  let startDate;
  if (fromQuery) {
    startDate = new Date(fromQuery);
    if (isNaN(startDate.getTime())) {
      startDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    }
  } else {
    startDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
  }
  startDate.setUTCHours(0, 0, 0, 0);

  // Safety check: ensure start <= end
  if (startDate > endDate) {
    const temp = new Date(startDate);
    startDate = new Date(endDate);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate = temp;
    endDate.setUTCHours(23, 59, 59, 999);
  }

  return { startDate, endDate };
};

/**
 * @desc    Get executive Admin ITSM Analytics
 * @route   GET /api/analytics/admin
 * @access  Private (Admin only)
 */
export const getAdminAnalytics = async (req, res) => {
  try {
    const { from, to } = req.query;
    const { startDate, endDate } = parseDateRange(from, to);

    // Filter for date-range specific metrics
    const dateMatch = {
      createdAt: { $gte: startDate, $lte: endDate },
    };

    // Consolidated aggregation pipeline with $facet
    const [results] = await Ticket.aggregate([
      {
        $facet: {
          // Overall KPIs
          kpiMetrics: [
            {
              $group: {
                _id: null,
                totalTickets: { $sum: 1 },
                openTickets: {
                  $sum: { $cond: [{ $in: ['$status', ['Open', 'Assigned']] }, 1, 0] },
                },
                rawOpenTickets: {
                  $sum: { $cond: [{ $eq: ['$status', 'Open'] }, 1, 0] },
                },
                assignedTickets: {
                  $sum: { $cond: [{ $eq: ['$status', 'Assigned'] }, 1, 0] },
                },
                inProgress: {
                  $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] },
                },
                pendingCustomer: {
                  $sum: { $cond: [{ $eq: ['$status', 'Pending Customer'] }, 1, 0] },
                },
                escalated: {
                  $sum: { $cond: [{ $eq: ['$status', 'Escalated'] }, 1, 0] },
                },
                resolved: {
                  $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] },
                },
                closed: {
                  $sum: { $cond: [{ $eq: ['$status', 'Closed'] }, 1, 0] },
                },
                slaBreached: {
                  $sum: { $cond: [{ $eq: ['$slaStatus', 'Breached'] }, 1, 0] },
                },
                slaHealthy: {
                  $sum: { $cond: [{ $eq: ['$slaStatus', 'Healthy'] }, 1, 0] },
                },
                slaApproaching: {
                  $sum: { $cond: [{ $eq: ['$slaStatus', 'Approaching'] }, 1, 0] },
                },
                ticketsWithSla: {
                  $sum: { $cond: [{ $ifNull: ['$slaDueAt', false] }, 1, 0] },
                },
              },
            },
          ],

          // Resolution Time metrics (only tickets with resolvedAt)
          resolutionTimeMetrics: [
            {
              $match: {
                resolvedAt: { $ne: null, $exists: true },
                createdAt: { $ne: null, $exists: true },
              },
            },
            {
              $project: {
                durationMs: { $subtract: ['$resolvedAt', '$createdAt'] },
              },
            },
            {
              $match: { durationMs: { $gte: 0 } },
            },
            {
              $group: {
                _id: null,
                avgResolutionMs: { $avg: '$durationMs' },
                count: { $sum: 1 },
              },
            },
          ],

          // First Response Time metrics (only tickets with firstResponseAt)
          firstResponseMetrics: [
            {
              $match: {
                firstResponseAt: { $ne: null, $exists: true },
                createdAt: { $ne: null, $exists: true },
              },
            },
            {
              $project: {
                responseMs: { $subtract: ['$firstResponseAt', '$createdAt'] },
              },
            },
            {
              $match: { responseMs: { $gte: 0 } },
            },
            {
              $group: {
                _id: null,
                avgFirstResponseMs: { $avg: '$responseMs' },
                count: { $sum: 1 },
              },
            },
          ],

          // Status Breakdown
          statusDistribution: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ],

          // Priority Breakdown
          priorityDistribution: [
            {
              $group: {
                _id: '$priority',
                count: { $sum: 1 },
              },
            },
          ],

          // Category Breakdown
          categoryDistribution: [
            {
              $group: {
                _id: '$category',
                count: { $sum: 1 },
              },
            },
            {
              $lookup: {
                from: 'categories',
                localField: '_id',
                foreignField: '_id',
                as: 'categoryDoc',
              },
            },
            {
              $unwind: {
                path: '$categoryDoc',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                category: { $ifNull: ['$categoryDoc.name', 'Uncategorized'] },
                count: 1,
              },
            },
            { $sort: { count: -1 } },
          ],

          // Ticket Creation Trend (within date range)
          creationTrend: [
            { $match: dateMatch },
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                },
                created: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],

          // Ticket Resolution Trend (within date range)
          resolutionTrend: [
            {
              $match: {
                resolvedAt: { $gte: startDate, $lte: endDate },
              },
            },
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d', date: '$resolvedAt' },
                },
                resolved: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],

          // Engineer Workload Matrix
          engineerWorkload: [
            {
              $match: {
                assignedTo: { $ne: null, $exists: true },
              },
            },
            {
              $group: {
                _id: '$assignedTo',
                assigned: { $sum: 1 },
                open: {
                  $sum: { $cond: [{ $in: ['$status', ['Open', 'Assigned']] }, 1, 0] },
                },
                inProgress: {
                  $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] },
                },
                resolved: {
                  $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] },
                },
                closed: {
                  $sum: { $cond: [{ $eq: ['$status', 'Closed'] }, 1, 0] },
                },
                slaBreached: {
                  $sum: { $cond: [{ $eq: ['$slaStatus', 'Breached'] }, 1, 0] },
                },
              },
            },
            {
              $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'userDoc',
              },
            },
            {
              $unwind: {
                path: '$userDoc',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                engineerId: '$_id',
                engineer: { $ifNull: ['$userDoc.name', 'Unassigned'] },
                email: { $ifNull: ['$userDoc.email', ''] },
                avatar: { $ifNull: ['$userDoc.avatar', ''] },
                assigned: 1,
                open: 1,
                inProgress: 1,
                resolved: 1,
                closed: 1,
                slaBreached: 1,
              },
            },
            { $sort: { assigned: -1 } },
          ],
        },
      },
    ]);

    // Format KPIs
    const kpiRaw = results.kpiMetrics[0] || {
      totalTickets: 0,
      openTickets: 0,
      rawOpenTickets: 0,
      assignedTickets: 0,
      inProgress: 0,
      pendingCustomer: 0,
      escalated: 0,
      resolved: 0,
      closed: 0,
      slaBreached: 0,
      slaHealthy: 0,
      slaApproaching: 0,
      ticketsWithSla: 0,
    };

    const resTimeRaw = results.resolutionTimeMetrics[0];
    const avgResMs = resTimeRaw ? resTimeRaw.avgResolutionMs : 0;
    const averageResolutionMinutes = Math.round(avgResMs / (1000 * 60));
    const averageResolutionHours = Number((avgResMs / (1000 * 60 * 60)).toFixed(1));

    const firstRespRaw = results.firstResponseMetrics[0];
    const avgFirstRespMs = firstRespRaw ? firstRespRaw.avgFirstResponseMs : 0;
    const averageFirstResponseMinutes = Math.round(avgFirstRespMs / (1000 * 60));
    const averageFirstResponseHours = Number((avgFirstRespMs / (1000 * 60 * 60)).toFixed(1));

    const totalWithSla = kpiRaw.ticketsWithSla || kpiRaw.totalTickets;
    const breached = kpiRaw.slaBreached || 0;
    const slaComplianceRate =
      totalWithSla > 0
        ? Number((((totalWithSla - breached) / totalWithSla) * 100).toFixed(1))
        : 100.0;

    const kpis = {
      totalTickets: kpiRaw.totalTickets,
      openTickets: kpiRaw.rawOpenTickets || kpiRaw.openTickets,
      assignedTickets: kpiRaw.assignedTickets,
      inProgress: kpiRaw.inProgress,
      pendingCustomer: kpiRaw.pendingCustomer,
      escalated: kpiRaw.escalated,
      resolved: kpiRaw.resolved,
      closed: kpiRaw.closed,
      slaBreached: kpiRaw.slaBreached,
      slaComplianceRate,
      averageResolutionHours,
      averageResolutionMinutes,
      averageFirstResponseMinutes,
      averageFirstResponseHours,
    };

    // Format Status Distribution (all 7 statuses represented)
    const allStatuses = [
      'Open',
      'Assigned',
      'In Progress',
      'Pending Customer',
      'Escalated',
      'Resolved',
      'Closed',
    ];
    const statusMap = new Map(results.statusDistribution.map((s) => [s._id, s.count]));
    const ticketsByStatus = allStatuses.map((status) => ({
      status,
      count: statusMap.get(status) || 0,
    }));

    // Format Priority Distribution (all 4 priorities represented)
    const allPriorities = ['Low', 'Medium', 'High', 'Critical'];
    const priorityMap = new Map(results.priorityDistribution.map((p) => [p._id, p.count]));
    const ticketsByPriority = allPriorities.map((priority) => ({
      priority,
      count: priorityMap.get(priority) || 0,
    }));

    // Format Category Distribution
    const ticketsByCategory = results.categoryDistribution.map((c) => ({
      category: c.category,
      count: c.count,
    }));

    // Format Time-Series Trends (fill continuous date range)
    const dateRangeList = getDateRangeArray(startDate, endDate);
    const creationMap = new Map(results.creationTrend.map((t) => [t._id, t.created]));
    const resolutionMap = new Map(results.resolutionTrend.map((t) => [t._id, t.resolved]));

    const ticketTrend = dateRangeList.map((date) => ({
      date,
      created: creationMap.get(date) || 0,
      resolved: resolutionMap.get(date) || 0,
    }));

    const resolutionTrend = dateRangeList.map((date) => ({
      date,
      resolved: resolutionMap.get(date) || 0,
    }));

    // SLA breakdown
    const slaStats = {
      totalWithSla,
      healthy: kpiRaw.slaHealthy || 0,
      approaching: kpiRaw.slaApproaching || 0,
      breached: kpiRaw.slaBreached || 0,
      complianceRate: slaComplianceRate,
    };

    return res.status(200).json({
      success: true,
      data: {
        dateRange: {
          from: startDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0],
        },
        kpis,
        ticketsByStatus,
        ticketsByPriority,
        ticketsByCategory,
        ticketTrend,
        resolutionTrend,
        slaStats,
        engineerWorkload: results.engineerWorkload || [],
      },
    });
  } catch (error) {
    console.error('[Admin Analytics Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate admin analytics',
      error: error.message,
    });
  }
};

/**
 * @desc    Get Support Engineer personal workload & SLA analytics
 * @route   GET /api/analytics/engineer
 * @access  Private (Support Engineer, Admin)
 */
export const getEngineerAnalytics = async (req, res) => {
  try {
    const engineerId = new mongoose.Types.ObjectId(req.user._id);
    const { from, to } = req.query;
    const { startDate, endDate } = parseDateRange(from, to);

    // Personal aggregation scoped strictly to req.user._id
    const [results] = await Ticket.aggregate([
      {
        $match: { assignedTo: engineerId },
      },
      {
        $facet: {
          // KPIs for this engineer
          kpiMetrics: [
            {
              $group: {
                _id: null,
                assignedTickets: { $sum: 1 },
                openTickets: {
                  $sum: { $cond: [{ $in: ['$status', ['Open', 'Assigned']] }, 1, 0] },
                },
                rawOpenTickets: {
                  $sum: { $cond: [{ $eq: ['$status', 'Open'] }, 1, 0] },
                },
                inProgress: {
                  $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] },
                },
                pendingCustomer: {
                  $sum: { $cond: [{ $eq: ['$status', 'Pending Customer'] }, 1, 0] },
                },
                escalated: {
                  $sum: { $cond: [{ $eq: ['$status', 'Escalated'] }, 1, 0] },
                },
                resolved: {
                  $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] },
                },
                closed: {
                  $sum: { $cond: [{ $eq: ['$status', 'Closed'] }, 1, 0] },
                },
                slaBreached: {
                  $sum: { $cond: [{ $eq: ['$slaStatus', 'Breached'] }, 1, 0] },
                },
                slaHealthy: {
                  $sum: { $cond: [{ $eq: ['$slaStatus', 'Healthy'] }, 1, 0] },
                },
                slaApproaching: {
                  $sum: { $cond: [{ $eq: ['$slaStatus', 'Approaching'] }, 1, 0] },
                },
                ticketsWithSla: {
                  $sum: { $cond: [{ $ifNull: ['$slaDueAt', false] }, 1, 0] },
                },
              },
            },
          ],

          // Resolution time for this engineer
          resolutionTimeMetrics: [
            {
              $match: {
                resolvedAt: { $ne: null, $exists: true },
                createdAt: { $ne: null, $exists: true },
              },
            },
            {
              $project: {
                durationMs: { $subtract: ['$resolvedAt', '$createdAt'] },
              },
            },
            {
              $match: { durationMs: { $gte: 0 } },
            },
            {
              $group: {
                _id: null,
                avgResolutionMs: { $avg: '$durationMs' },
                count: { $sum: 1 },
              },
            },
          ],

          // First response time for this engineer
          firstResponseMetrics: [
            {
              $match: {
                firstResponseAt: { $ne: null, $exists: true },
                createdAt: { $ne: null, $exists: true },
              },
            },
            {
              $project: {
                responseMs: { $subtract: ['$firstResponseAt', '$createdAt'] },
              },
            },
            {
              $match: { responseMs: { $gte: 0 } },
            },
            {
              $group: {
                _id: null,
                avgFirstResponseMs: { $avg: '$responseMs' },
                count: { $sum: 1 },
              },
            },
          ],

          // Status Distribution
          statusDistribution: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ],

          // Priority Distribution
          priorityDistribution: [
            {
              $group: {
                _id: '$priority',
                count: { $sum: 1 },
              },
            },
          ],

          // Resolution Trend for this engineer
          resolutionTrend: [
            {
              $match: {
                resolvedAt: { $gte: startDate, $lte: endDate },
              },
            },
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d', date: '$resolvedAt' },
                },
                resolved: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]);

    // Critical Tickets Requiring Attention (Critical, not Closed or Resolved)
    // Query engineer's assigned critical tickets or active critical tickets in the queue
    const criticalTickets = await Ticket.find({
      priority: 'Critical',
      status: { $nin: ['Closed', 'Resolved'] },
      $or: [{ assignedTo: engineerId }, { assignedTo: null }],
    })
      .sort({ slaDueAt: 1, createdAt: 1 })
      .limit(10)
      .populate('category', 'name')
      .populate('createdBy', 'name email department avatar')
      .populate('assignedTo', 'name email avatar')
      .select('ticketNumber subject priority status slaDueAt slaStatus createdAt createdBy assignedTo category');

    const kpiRaw = results.kpiMetrics[0] || {
      assignedTickets: 0,
      openTickets: 0,
      rawOpenTickets: 0,
      inProgress: 0,
      pendingCustomer: 0,
      escalated: 0,
      resolved: 0,
      closed: 0,
      slaBreached: 0,
      slaHealthy: 0,
      slaApproaching: 0,
      ticketsWithSla: 0,
    };

    const resTimeRaw = results.resolutionTimeMetrics[0];
    const avgResMs = resTimeRaw ? resTimeRaw.avgResolutionMs : 0;
    const averageResolutionMinutes = Math.round(avgResMs / (1000 * 60));
    const averageResolutionHours = Number((avgResMs / (1000 * 60 * 60)).toFixed(1));

    const firstRespRaw = results.firstResponseMetrics[0];
    const avgFirstRespMs = firstRespRaw ? firstRespRaw.avgFirstResponseMs : 0;
    const averageFirstResponseMinutes = Math.round(avgFirstRespMs / (1000 * 60));
    const averageFirstResponseHours = Number((avgFirstRespMs / (1000 * 60 * 60)).toFixed(1));

    const totalWithSla = kpiRaw.ticketsWithSla || kpiRaw.assignedTickets;
    const breached = kpiRaw.slaBreached || 0;
    const slaComplianceRate =
      totalWithSla > 0
        ? Number((((totalWithSla - breached) / totalWithSla) * 100).toFixed(1))
        : 100.0;

    const kpis = {
      assignedTickets: kpiRaw.assignedTickets,
      openTickets: kpiRaw.rawOpenTickets || kpiRaw.openTickets,
      inProgress: kpiRaw.inProgress,
      pendingCustomer: kpiRaw.pendingCustomer,
      escalated: kpiRaw.escalated,
      resolved: kpiRaw.resolved,
      closed: kpiRaw.closed,
      slaBreached: kpiRaw.slaBreached,
      slaComplianceRate,
      averageResolutionHours,
      averageResolutionMinutes,
      averageFirstResponseMinutes,
      averageFirstResponseHours,
    };

    const allStatuses = [
      'Open',
      'Assigned',
      'In Progress',
      'Pending Customer',
      'Escalated',
      'Resolved',
      'Closed',
    ];
    const statusMap = new Map(results.statusDistribution.map((s) => [s._id, s.count]));
    const ticketsByStatus = allStatuses.map((status) => ({
      status,
      count: statusMap.get(status) || 0,
    }));

    const allPriorities = ['Low', 'Medium', 'High', 'Critical'];
    const priorityMap = new Map(results.priorityDistribution.map((p) => [p._id, p.count]));
    const ticketsByPriority = allPriorities.map((priority) => ({
      priority,
      count: priorityMap.get(priority) || 0,
    }));

    const dateRangeList = getDateRangeArray(startDate, endDate);
    const resolutionMap = new Map(results.resolutionTrend.map((t) => [t._id, t.resolved]));
    const resolutionTrend = dateRangeList.map((date) => ({
      date,
      resolved: resolutionMap.get(date) || 0,
    }));

    return res.status(200).json({
      success: true,
      data: {
        dateRange: {
          from: startDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0],
        },
        kpis,
        ticketsByStatus,
        ticketsByPriority,
        resolutionTrend,
        criticalTickets,
      },
    });
  } catch (error) {
    console.error('[Engineer Analytics Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate engineer analytics',
      error: error.message,
    });
  }
};

/**
 * @desc    Get Employee personal service dashboard analytics
 * @route   GET /api/analytics/employee
 * @access  Private (Employee, Support Engineer, Admin)
 */
export const getEmployeeAnalytics = async (req, res) => {
  try {
    const employeeId = new mongoose.Types.ObjectId(req.user._id);

    // Personal aggregation scoped strictly to createdBy: req.user._id
    const [results] = await Ticket.aggregate([
      {
        $match: { createdBy: employeeId },
      },
      {
        $facet: {
          kpiMetrics: [
            {
              $group: {
                _id: null,
                myTotalTickets: { $sum: 1 },
                myOpenTickets: {
                  $sum: { $cond: [{ $in: ['$status', ['Open', 'Assigned']] }, 1, 0] },
                },
                rawOpenTickets: {
                  $sum: { $cond: [{ $eq: ['$status', 'Open'] }, 1, 0] },
                },
                myInProgressTickets: {
                  $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] },
                },
                myPendingTickets: {
                  $sum: { $cond: [{ $eq: ['$status', 'Pending Customer'] }, 1, 0] },
                },
                myResolvedTickets: {
                  $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] },
                },
                myClosedTickets: {
                  $sum: { $cond: [{ $eq: ['$status', 'Closed'] }, 1, 0] },
                },
                myReopenedTickets: {
                  $sum: { $cond: [{ $ne: ['$reopenedAt', null] }, 1, 0] },
                },
              },
            },
          ],
          statusDistribution: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    // Recent 5 tickets created by this employee
    const recentTickets = await Ticket.find({ createdBy: employeeId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('category', 'name')
      .populate('assignedTo', 'name email avatar')
      .select('ticketNumber subject priority status slaDueAt slaStatus createdAt category assignedTo');

    const kpiRaw = results.kpiMetrics[0] || {
      myTotalTickets: 0,
      myOpenTickets: 0,
      rawOpenTickets: 0,
      myInProgressTickets: 0,
      myPendingTickets: 0,
      myResolvedTickets: 0,
      myClosedTickets: 0,
      myReopenedTickets: 0,
    };

    const kpis = {
      myTotalTickets: kpiRaw.myTotalTickets,
      myOpenTickets: kpiRaw.rawOpenTickets || kpiRaw.myOpenTickets,
      myInProgressTickets: kpiRaw.myInProgressTickets,
      myPendingTickets: kpiRaw.myPendingTickets,
      myResolvedTickets: kpiRaw.myResolvedTickets,
      myClosedTickets: kpiRaw.myClosedTickets,
      myReopenedTickets: kpiRaw.myReopenedTickets,
    };

    const allStatuses = [
      'Open',
      'Assigned',
      'In Progress',
      'Pending Customer',
      'Escalated',
      'Resolved',
      'Closed',
    ];
    const statusMap = new Map(results.statusDistribution.map((s) => [s._id, s.count]));
    const ticketsByStatus = allStatuses.map((status) => ({
      status,
      count: statusMap.get(status) || 0,
    }));

    return res.status(200).json({
      success: true,
      data: {
        kpis,
        ticketsByStatus,
        recentTickets,
      },
    });
  } catch (error) {
    console.error('[Employee Analytics Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate employee analytics',
      error: error.message,
    });
  }
};
