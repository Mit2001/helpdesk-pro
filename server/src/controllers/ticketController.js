import mongoose from 'mongoose';
import Ticket from '../models/Ticket.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import Comment from '../models/Comment.js';
import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';
import { generateTicketNumber } from '../utils/ticketNumber.js';
import { calculateSlaDueDate, evaluateSlaStatus } from '../utils/slaCalculator.js';

// Valid ticket status transitions
const ALLOWED_STATUS_TRANSITIONS = {
  Open: ['Assigned', 'In Progress', 'Closed'],
  Assigned: ['In Progress', 'Pending Customer', 'Escalated', 'Resolved', 'Open'],
  'In Progress': ['Pending Customer', 'Escalated', 'Resolved', 'Assigned'],
  'Pending Customer': ['In Progress', 'Resolved', 'Escalated'],
  Escalated: ['In Progress', 'Resolved', 'Assigned'],
  Resolved: ['Closed', 'Open'],
  Closed: ['Open'],
};

/**
 * @desc    Create a new support ticket
 * @route   POST /api/tickets
 * @access  Private (Employee, Support Engineer, Admin)
 */
export const createTicket = async (req, res, next) => {
  try {
    const {
      subject,
      description,
      category: categoryId,
      subcategory,
      priority = 'Medium',
      department,
      attachments = [],
    } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, message: 'Ticket subject is required' });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: 'Ticket description is required' });
    }

    if (!categoryId) {
      return res.status(400).json({ success: false, message: 'Ticket category is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID' });
    }

    const categoryDoc = await Category.findOne({ _id: categoryId, status: 'Active' });
    if (!categoryDoc) {
      return res.status(400).json({ success: false, message: 'Selected category does not exist or is inactive' });
    }

    const ticketNumber = await generateTicketNumber();
    const slaDueAt = await calculateSlaDueDate(priority);

    const ticket = new Ticket({
      ticketNumber,
      subject: subject.trim(),
      description: description.trim(),
      category: categoryDoc._id,
      subcategory: subcategory?.trim() || '',
      priority,
      status: 'Open',
      createdBy: req.user._id,
      department: department?.trim() || req.user.department || 'General',
      attachments: attachments || [],
      slaDueAt,
      slaStatus: 'Healthy',
    });

    await ticket.save();

    await AuditLog.create({
      user: req.user._id,
      action: 'TICKET_CREATED',
      entityType: 'Ticket',
      entityId: ticket._id,
      description: `Created ticket ${ticketNumber}: "${ticket.subject}"`,
      metadata: {
        ticketNumber,
        priority,
        category: categoryDoc.name,
        department: ticket.department,
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('createdBy', 'name email role department avatar')
      .populate('category', 'name description');

    return res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      data: {
        ticket: populatedTicket,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get global ticket queue
 * @route   GET /api/tickets
 * @access  Private (Admin, Support Engineer)
 */
export const getTickets = async (req, res, next) => {
  try {
    const {
      search,
      status,
      priority,
      category,
      assignedTo,
      department,
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (priority && priority !== 'all') {
      filter.priority = priority;
    }

    if (category && category !== 'all' && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    }

    if (assignedTo && assignedTo !== 'all') {
      if (assignedTo === 'unassigned') {
        filter.assignedTo = null;
      } else if (mongoose.Types.ObjectId.isValid(assignedTo)) {
        filter.assignedTo = assignedTo;
      }
    }

    if (department && department !== 'all') {
      filter.department = department;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { ticketNumber: searchRegex },
        { subject: searchRegex },
        { description: searchRegex },
      ];
    }

    const total = await Ticket.countDocuments(filter);
    const tickets = await Ticket.find(filter)
      .populate('createdBy', 'name email role department avatar')
      .populate('assignedTo', 'name email role department avatar')
      .populate('category', 'name description')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const enrichedTickets = tickets.map((t) => {
      if (t.status !== 'Resolved' && t.status !== 'Closed') {
        return {
          ...t,
          slaStatus: evaluateSlaStatus(t.slaDueAt),
        };
      }
      return t;
    });

    return res.status(200).json({
      success: true,
      data: {
        tickets: enrichedTickets,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get personal tickets
 * @route   GET /api/tickets/my
 * @access  Private (Employee, Support Engineer, Admin)
 */
export const getMyTickets = async (req, res, next) => {
  try {
    const {
      search,
      status,
      priority,
      category,
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (req.user.role === 'Employee') {
      filter.createdBy = req.user._id;
    } else if (req.user.role === 'Support Engineer') {
      filter.assignedTo = req.user._id;
    } else {
      filter.$or = [
        { createdBy: req.user._id },
        { assignedTo: req.user._id },
      ];
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (priority && priority !== 'all') {
      filter.priority = priority;
    }

    if (category && category !== 'all' && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      const searchConditions = [
        { ticketNumber: searchRegex },
        { subject: searchRegex },
        { description: searchRegex },
      ];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    const total = await Ticket.countDocuments(filter);
    const tickets = await Ticket.find(filter)
      .populate('createdBy', 'name email role department avatar')
      .populate('assignedTo', 'name email role department avatar')
      .populate('category', 'name description')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const enrichedTickets = tickets.map((t) => {
      if (t.status !== 'Resolved' && t.status !== 'Closed') {
        return {
          ...t,
          slaStatus: evaluateSlaStatus(t.slaDueAt),
        };
      }
      return t;
    });

    return res.status(200).json({
      success: true,
      data: {
        tickets: enrichedTickets,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single ticket details with comments & timeline (Server-side privacy filtering for internal notes)
 * @route   GET /api/tickets/:id
 * @access  Private (Ownership or Support/Admin role enforced)
 */
export const getTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const ticket = await Ticket.findById(id)
      .populate('createdBy', 'name email role department phone avatar')
      .populate('assignedTo', 'name email role department phone avatar')
      .populate('category', 'name description subcategories');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Role-based access permission check
    if (req.user.role === 'Employee') {
      const creatorId = ticket.createdBy._id ? ticket.createdBy._id.toString() : ticket.createdBy.toString();
      if (creatorId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access forbidden: You do not have permission to view this ticket',
        });
      }
    }

    // Fetch conversation comments with strict backend role visibility filter
    const commentFilter = { ticket: ticket._id };
    if (req.user.role === 'Employee') {
      // Employees NEVER receive internal support notes from the backend
      commentFilter.visibility = 'Public';
    }

    const comments = await Comment.find(commentFilter)
      .populate('author', 'name email role department avatar')
      .sort({ createdAt: 1 })
      .lean();

    // Fetch audit timeline events for ticket
    const auditTimeline = await AuditLog.find({ entityId: ticket._id })
      .populate('user', 'name role')
      .sort({ createdAt: 1 })
      .lean();

    const ticketObj = ticket.toObject();
    if (ticketObj.status !== 'Resolved' && ticketObj.status !== 'Closed') {
      ticketObj.slaStatus = evaluateSlaStatus(ticketObj.slaDueAt);
    }

    ticketObj.comments = comments;
    ticketObj.timeline = auditTimeline;

    return res.status(200).json({
      success: true,
      data: ticketObj,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update ticket details, status, priority, or assignment
 * @route   PATCH /api/tickets/:id
 * @access  Private (Admin, Support Engineer)
 */
export const updateTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      status,
      priority,
      assignedTo,
      category: categoryId,
      subcategory,
      subject,
      description,
      department,
      resolution,
      reopenReason,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const auditLogs = [];

    // 1. Status Transition Validation
    if (status && status !== ticket.status) {
      const allowedNext = ALLOWED_STATUS_TRANSITIONS[ticket.status] || [];
      if (!allowedNext.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status transition from "${ticket.status}" to "${status}". Allowed transitions: ${allowedNext.join(', ') || 'None'}`,
        });
      }

      const oldStatus = ticket.status;
      ticket.status = status;

      if (status === 'Resolved') {
        ticket.resolvedAt = ticket.resolvedAt || new Date();
        if (resolution) ticket.resolution = resolution.trim();
      } else if (status === 'Closed') {
        ticket.closedAt = new Date();
      } else if (status === 'Open' && (oldStatus === 'Resolved' || oldStatus === 'Closed')) {
        ticket.reopenedAt = new Date();
        ticket.reopenReason = reopenReason?.trim() || 'Reopened by support team';
      }

      auditLogs.push({
        user: req.user._id,
        action: 'STATUS_CHANGED',
        entityType: 'Ticket',
        entityId: ticket._id,
        description: `Changed status of ${ticket.ticketNumber} from "${oldStatus}" to "${status}"`,
        metadata: { oldStatus, newStatus: status, resolution: ticket.resolution },
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      });
    }

    // 2. Priority Change & SLA Recalculation
    if (priority && priority !== ticket.priority) {
      const oldPriority = ticket.priority;
      ticket.priority = priority;
      ticket.slaDueAt = await calculateSlaDueDate(priority, ticket.createdAt);
      ticket.slaStatus = evaluateSlaStatus(ticket.slaDueAt);

      auditLogs.push({
        user: req.user._id,
        action: 'PRIORITY_CHANGED',
        entityType: 'Ticket',
        entityId: ticket._id,
        description: `Changed priority of ${ticket.ticketNumber} from "${oldPriority}" to "${priority}"`,
        metadata: { oldPriority, newPriority: priority, newSlaDueAt: ticket.slaDueAt },
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      });
    }

    // 3. Ticket Assignment
    if (assignedTo !== undefined && assignedTo !== (ticket.assignedTo ? ticket.assignedTo.toString() : null)) {
      if (assignedTo === null || assignedTo === '') {
        ticket.assignedTo = null;
        auditLogs.push({
          user: req.user._id,
          action: 'TICKET_UNASSIGNED',
          entityType: 'Ticket',
          entityId: ticket._id,
          description: `Unassigned ticket ${ticket.ticketNumber}`,
          metadata: {},
          ipAddress: req.ip || '',
          userAgent: req.headers['user-agent'] || '',
        });
      } else {
        if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
          return res.status(400).json({ success: false, message: 'Invalid assigned user ID' });
        }

        const engineer = await User.findById(assignedTo);
        if (!engineer || (engineer.role !== 'Support Engineer' && engineer.role !== 'Admin')) {
          return res.status(400).json({
            success: false,
            message: 'Tickets can only be assigned to a Support Engineer or Admin',
          });
        }

        ticket.assignedTo = engineer._id;
        if (ticket.status === 'Open') {
          ticket.status = 'Assigned';
        }

        await Notification.create({
          recipient: engineer._id,
          type: 'TICKET_ASSIGNED',
          title: 'New Ticket Assigned',
          message: `Ticket ${ticket.ticketNumber} (${ticket.subject}) has been assigned to you.`,
          ticket: ticket._id,
        });

        auditLogs.push({
          user: req.user._id,
          action: 'TICKET_ASSIGNED',
          entityType: 'Ticket',
          entityId: ticket._id,
          description: `Assigned ticket ${ticket.ticketNumber} to ${engineer.name}`,
          metadata: { assignedTo: engineer.name, engineerId: engineer._id },
          ipAddress: req.ip || '',
          userAgent: req.headers['user-agent'] || '',
        });
      }
    }

    // 4. Other fields
    if (subject && subject.trim()) ticket.subject = subject.trim();
    if (description && description.trim()) ticket.description = description.trim();
    if (department && department.trim()) ticket.department = department.trim();
    if (subcategory !== undefined) ticket.subcategory = subcategory.trim();
    if (resolution !== undefined) ticket.resolution = resolution.trim();

    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      const cat = await Category.findById(categoryId);
      if (cat) ticket.category = cat._id;
    }

    await ticket.save();

    if (auditLogs.length > 0) {
      await AuditLog.insertMany(auditLogs);
    }

    const updatedTicket = await Ticket.findById(ticket._id)
      .populate('createdBy', 'name email role department avatar')
      .populate('assignedTo', 'name email role department avatar')
      .populate('category', 'name description subcategories');

    return res.status(200).json({
      success: true,
      message: 'Ticket updated successfully',
      data: updatedTicket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Escalate ticket to higher tier
 * @route   POST /api/tickets/:id/escalate
 * @access  Private (Support Engineer, Admin)
 */
export const escalateTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Escalation reason is required' });
    }

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    if (ticket.status === 'Closed' || ticket.status === 'Resolved') {
      return res.status(400).json({
        success: false,
        message: `Cannot escalate a ticket that is already ${ticket.status.toLowerCase()}`,
      });
    }

    const oldStatus = ticket.status;
    ticket.status = 'Escalated';
    await ticket.save();

    await AuditLog.create({
      user: req.user._id,
      action: 'TICKET_ESCALATED',
      entityType: 'Ticket',
      entityId: ticket._id,
      description: `${ticket.ticketNumber} escalated by ${req.user.name}`,
      metadata: { reason: reason.trim(), oldStatus, newStatus: 'Escalated' },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    await Notification.create({
      recipient: ticket.createdBy,
      type: 'TICKET_UPDATED',
      title: 'Ticket Escalated',
      message: `Your ticket ${ticket.ticketNumber} has been escalated for specialized technical review.`,
      ticket: ticket._id,
    });

    const updated = await Ticket.findById(ticket._id)
      .populate('createdBy', 'name email role department avatar')
      .populate('assignedTo', 'name email role department avatar')
      .populate('category', 'name description');

    return res.status(200).json({
      success: true,
      message: 'Ticket escalated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resolve support ticket with resolution notes
 * @route   POST /api/tickets/:id/resolve
 * @access  Private (Support Engineer, Admin)
 */
export const resolveTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    if (!resolution || !resolution.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Resolution summary is required to mark ticket as resolved',
      });
    }

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    if (ticket.status === 'Closed') {
      return res.status(400).json({
        success: false,
        message: 'Ticket is already closed. Please reopen if further action is needed.',
      });
    }

    ticket.status = 'Resolved';
    ticket.resolvedAt = new Date();
    ticket.resolution = resolution.trim();
    await ticket.save();

    await AuditLog.create({
      user: req.user._id,
      action: 'TICKET_RESOLVED',
      entityType: 'Ticket',
      entityId: ticket._id,
      description: `${ticket.ticketNumber} marked resolved by ${req.user.name}`,
      metadata: { resolution: resolution.trim() },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    await Notification.create({
      recipient: ticket.createdBy,
      type: 'TICKET_RESOLVED',
      title: 'Ticket Resolved',
      message: `Your ticket ${ticket.ticketNumber} has been resolved by the engineering team.`,
      ticket: ticket._id,
    });

    const updated = await Ticket.findById(ticket._id)
      .populate('createdBy', 'name email role department avatar')
      .populate('assignedTo', 'name email role department avatar')
      .populate('category', 'name description');

    return res.status(200).json({
      success: true,
      message: 'Ticket marked as resolved',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Close resolved ticket
 * @route   POST /api/tickets/:id/close
 * @access  Private (Support Engineer, Admin)
 */
export const closeTicket = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Only allow closing if already resolved
    if (ticket.status !== 'Resolved') {
      return res.status(400).json({
        success: false,
        message: `You cannot close a ticket in "${ticket.status}" status. It must be resolved first.`,
      });
    }

    ticket.status = 'Closed';
    ticket.closedAt = new Date();
    await ticket.save();

    await AuditLog.create({
      user: req.user._id,
      action: 'TICKET_CLOSED',
      entityType: 'Ticket',
      entityId: ticket._id,
      description: `${ticket.ticketNumber} closed by ${req.user.name}`,
      metadata: { closedAt: ticket.closedAt },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    await Notification.create({
      recipient: ticket.createdBy,
      type: 'TICKET_CLOSED',
      title: 'Ticket Closed',
      message: `Ticket ${ticket.ticketNumber} has been permanently closed.`,
      ticket: ticket._id,
    });

    const updated = await Ticket.findById(ticket._id)
      .populate('createdBy', 'name email role department avatar')
      .populate('assignedTo', 'name email role department avatar')
      .populate('category', 'name description');

    return res.status(200).json({
      success: true,
      message: 'Ticket closed successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reopen a resolved or closed ticket
 * @route   POST /api/tickets/:id/reopen
 * @access  Private (Employee, Support Engineer, Admin)
 */
export const reopenTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Reopen reason is required' });
    }

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    if (ticket.status !== 'Resolved' && ticket.status !== 'Closed') {
      return res.status(400).json({
        success: false,
        message: `Ticket is already in "${ticket.status}" state and does not need to be reopened`,
      });
    }

    // Role-based access permission check for employee
    if (req.user.role === 'Employee') {
      const creatorId = ticket.createdBy._id ? ticket.createdBy._id.toString() : ticket.createdBy.toString();
      if (creatorId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access forbidden: You cannot reopen another user\'s ticket',
        });
      }
    }

    const oldStatus = ticket.status;
    ticket.status = 'Open';
    ticket.reopenedAt = new Date();
    ticket.reopenReason = reason.trim();
    ticket.slaDueAt = await calculateSlaDueDate(ticket.priority, new Date());
    ticket.slaStatus = 'Healthy';
    await ticket.save();

    await AuditLog.create({
      user: req.user._id,
      action: 'TICKET_REOPENED',
      entityType: 'Ticket',
      entityId: ticket._id,
      description: `${ticket.ticketNumber} reopened by ${req.user.name}`,
      metadata: { reason: reason.trim(), oldStatus, newSlaDueAt: ticket.slaDueAt },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    if (ticket.assignedTo) {
      await Notification.create({
        recipient: ticket.assignedTo,
        type: 'TICKET_UPDATED',
        title: 'Ticket Reopened',
        message: `Ticket ${ticket.ticketNumber} was reopened by ${req.user.name}: "${reason.trim()}"`,
        ticket: ticket._id,
      });
    }

    const updated = await Ticket.findById(ticket._id)
      .populate('createdBy', 'name email role department avatar')
      .populate('assignedTo', 'name email role department avatar')
      .populate('category', 'name description');

    return res.status(200).json({
      success: true,
      message: 'Ticket reopened successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};
