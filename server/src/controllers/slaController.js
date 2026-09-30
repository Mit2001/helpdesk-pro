import mongoose from 'mongoose';
import SLA from '../models/SLA.js';
import AuditLog from '../models/AuditLog.js';

const DEFAULT_SLA_POLICIES = [
  {
    priority: 'Low',
    responseTimeHours: 12,
    resolutionTimeHours: 48,
    description: 'Non-urgent requests, general inquiries and cosmetic issues.',
    status: 'Active',
  },
  {
    priority: 'Medium',
    responseTimeHours: 6,
    resolutionTimeHours: 24,
    description: 'Standard technical requests, single user workflow interruptions.',
    status: 'Active',
  },
  {
    priority: 'High',
    responseTimeHours: 2,
    resolutionTimeHours: 8,
    description: 'Critical business functions degraded, multiple users affected.',
    status: 'Active',
  },
  {
    priority: 'Critical',
    responseTimeHours: 1,
    resolutionTimeHours: 4,
    description: 'Complete system outage, security breach, production down.',
    status: 'Active',
  },
];

/**
 * @desc    Get all SLA configuration policies
 * @route   GET /api/sla
 * @access  Private (Authenticated)
 */
export const getSLAs = async (req, res, next) => {
  try {
    let slas = await SLA.find().sort({ resolutionTimeHours: 1 }).lean();

    // Auto-seed default policies if empty
    if (slas.length === 0) {
      await SLA.insertMany(DEFAULT_SLA_POLICIES);
      slas = await SLA.find().sort({ resolutionTimeHours: 1 }).lean();
    }

    return res.status(200).json({
      success: true,
      data: slas,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get SLA policy by ID
 * @route   GET /api/sla/:id
 * @access  Private (Admin only)
 */
export const getSLAById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid SLA ID format',
      });
    }

    const sla = await SLA.findById(id).lean();
    if (!sla) {
      return res.status(404).json({
        success: false,
        message: 'SLA policy not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: sla,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new SLA policy (Admin only)
 * @route   POST /api/sla
 * @access  Private (Admin only)
 */
export const createSLA = async (req, res, next) => {
  try {
    const { priority, responseTimeHours, resolutionTimeHours, description = '', status = 'Active' } = req.body;

    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
    if (!priority || !validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: `Valid priority is required (${validPriorities.join(', ')})`,
      });
    }

    const respHours = Number(responseTimeHours);
    const resHours = Number(resolutionTimeHours);

    if (isNaN(respHours) || respHours <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Response time must be a positive number greater than 0',
      });
    }

    if (isNaN(resHours) || resHours <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Resolution time must be a positive number greater than 0',
      });
    }

    const existing = await SLA.findOne({ priority });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `An SLA policy for priority "${priority}" already exists`,
      });
    }

    const sla = new SLA({
      priority,
      responseTimeHours: respHours,
      resolutionTimeHours: resHours,
      description: description.trim(),
      status: status === 'Inactive' ? 'Inactive' : 'Active',
    });

    await sla.save();

    // Create Audit Log
    await AuditLog.create({
      user: req.user._id,
      action: 'SLA_CREATED',
      entityType: 'SLA',
      entityId: sla._id,
      description: `Administrator ${req.user.name} created SLA policy for ${sla.priority} (${sla.resolutionTimeHours}h target)`,
      metadata: {
        priority: sla.priority,
        responseTimeHours: sla.responseTimeHours,
        resolutionTimeHours: sla.resolutionTimeHours,
        status: sla.status,
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    return res.status(201).json({
      success: true,
      message: 'SLA policy created successfully',
      data: sla,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update SLA policy target hours and description (Admin only)
 * @route   PATCH /api/sla/:id
 * @access  Private (Admin only)
 */
export const updateSLA = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { responseTimeHours, resolutionTimeHours, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid SLA ID format',
      });
    }

    const sla = await SLA.findById(id);
    if (!sla) {
      return res.status(404).json({
        success: false,
        message: 'SLA policy not found',
      });
    }

    if (responseTimeHours !== undefined) {
      const respHours = Number(responseTimeHours);
      if (isNaN(respHours) || respHours <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Response time must be a positive number greater than 0',
        });
      }
      sla.responseTimeHours = respHours;
    }

    if (resolutionTimeHours !== undefined) {
      const resHours = Number(resolutionTimeHours);
      if (isNaN(resHours) || resHours <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Resolution time must be a positive number greater than 0',
        });
      }
      sla.resolutionTimeHours = resHours;
    }

    if (description !== undefined) {
      sla.description = description.trim();
    }

    await sla.save();

    // Create Audit Log
    await AuditLog.create({
      user: req.user._id,
      action: 'SLA_UPDATED',
      entityType: 'SLA',
      entityId: sla._id,
      description: `Administrator ${req.user.name} updated SLA policy for ${sla.priority} (${sla.resolutionTimeHours}h target)`,
      metadata: {
        priority: sla.priority,
        responseTimeHours: sla.responseTimeHours,
        resolutionTimeHours: sla.resolutionTimeHours,
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    return res.status(200).json({
      success: true,
      message: 'SLA policy updated successfully',
      data: sla,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle SLA policy status (Active / Inactive) (Admin only)
 * @route   PATCH /api/sla/:id/status
 * @access  Private (Admin only)
 */
export const updateSLAStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { status, active } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid SLA ID format',
      });
    }

    let newStatus;
    if (status !== undefined) {
      newStatus = status === 'Active' ? 'Active' : 'Inactive';
    } else if (active !== undefined) {
      newStatus = active ? 'Active' : 'Inactive';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Status or active flag is required',
      });
    }

    const sla = await SLA.findById(id);
    if (!sla) {
      return res.status(404).json({
        success: false,
        message: 'SLA policy not found',
      });
    }

    const oldStatus = sla.status;
    sla.status = newStatus;
    await sla.save();

    // Create Audit Log
    const auditAction = newStatus === 'Active' ? 'SLA_ACTIVATED' : 'SLA_DEACTIVATED';
    await AuditLog.create({
      user: req.user._id,
      action: auditAction,
      entityType: 'SLA',
      entityId: sla._id,
      description: `Administrator ${req.user.name} ${newStatus === 'Active' ? 'activated' : 'deactivated'} SLA policy for ${sla.priority}`,
      metadata: {
        priority: sla.priority,
        oldStatus,
        newStatus,
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    return res.status(200).json({
      success: true,
      message: `SLA policy successfully ${newStatus === 'Active' ? 'activated' : 'deactivated'}`,
      data: sla,
    });
  } catch (error) {
    next(error);
  }
};
