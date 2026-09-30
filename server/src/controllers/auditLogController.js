import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog.js';

/**
 * @desc    Get audit logs with filtering, search, and pagination
 * @route   GET /api/audit-logs
 * @access  Private (Admin only)
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      action,
      entityType,
      user,
      search,
      from,
      to,
    } = req.query;

    const filter = {};

    if (action && action !== 'all') {
      filter.action = action;
    }

    if (entityType && entityType !== 'all') {
      filter.entityType = entityType;
    }

    if (user && user !== 'all' && mongoose.Types.ObjectId.isValid(user)) {
      filter.user = new mongoose.Types.ObjectId(user);
    }

    if (search && search.trim()) {
      filter.description = new RegExp(search.trim(), 'i');
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) {
        const fromDate = new Date(from);
        if (!isNaN(fromDate.getTime())) {
          fromDate.setUTCHours(0, 0, 0, 0);
          filter.createdAt.$gte = fromDate;
        }
      }
      if (to) {
        const toDate = new Date(to);
        if (!isNaN(toDate.getTime())) {
          toDate.setUTCHours(23, 59, 59, 999);
          filter.createdAt.$lte = toDate;
        }
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('user', 'name email role avatar department')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum) || 1,
        limit: limitNum,
      },
    });
  } catch (error) {
    next(error);
  }
};
