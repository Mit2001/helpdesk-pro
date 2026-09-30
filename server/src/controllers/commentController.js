import mongoose from 'mongoose';
import Ticket from '../models/Ticket.js';
import Comment from '../models/Comment.js';
import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';

/**
 * @desc    Add public customer comment to ticket
 * @route   POST /api/tickets/:id/comments
 * @access  Private (Employee, Support Engineer, Admin)
 */
export const addComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message, attachments = [] } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Comment message is required' });
    }

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Role-based access check
    if (req.user.role === 'Employee') {
      const creatorId = ticket.createdBy._id ? ticket.createdBy._id.toString() : ticket.createdBy.toString();
      if (creatorId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access forbidden: You cannot comment on another user\'s ticket',
        });
      }
    }

    // Force public visibility
    const comment = new Comment({
      ticket: ticket._id,
      author: req.user._id,
      message: message.trim(),
      visibility: 'Public',
      attachments: attachments || [],
    });

    await comment.save();

    // Track First Response from Support Engineer / Admin
    if (req.user.role !== 'Employee' && !ticket.firstResponseAt) {
      ticket.firstResponseAt = new Date();
      if (ticket.status === 'Open' || ticket.status === 'Assigned') {
        ticket.status = 'In Progress';
      }
      await ticket.save();
    }

    // Create Audit Log
    await AuditLog.create({
      user: req.user._id,
      action: 'COMMENT_ADDED',
      entityType: 'Ticket',
      entityId: ticket._id,
      description: `${req.user.name} added a reply on ticket ${ticket.ticketNumber}`,
      metadata: { commentId: comment._id, visibility: 'Public' },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    // Create Notification
    if (req.user.role !== 'Employee') {
      // Notify ticket creator
      await Notification.create({
        recipient: ticket.createdBy,
        type: 'TICKET_COMMENT',
        title: 'New Reply on Your Ticket',
        message: `${req.user.name} replied to ticket ${ticket.ticketNumber}`,
        ticket: ticket._id,
      });
    } else if (ticket.assignedTo) {
      // Notify assigned engineer
      await Notification.create({
        recipient: ticket.assignedTo,
        type: 'TICKET_COMMENT',
        title: 'Customer Replied',
        message: `${req.user.name} replied to ticket ${ticket.ticketNumber}`,
        ticket: ticket._id,
      });
    }

    const populatedComment = await Comment.findById(comment._id).populate(
      'author',
      'name email role department avatar'
    );

    return res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: populatedComment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add private internal note to ticket (hidden from customer)
 * @route   POST /api/tickets/:id/internal-notes
 * @access  Private (Support Engineer, Admin only)
 */
export const addInternalNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message, attachments = [] } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Internal note message is required' });
    }

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Force internal visibility - never accept visibility from client
    const note = new Comment({
      ticket: ticket._id,
      author: req.user._id,
      message: message.trim(),
      visibility: 'Internal',
      attachments: attachments || [],
    });

    await note.save();

    // Create Audit Log
    await AuditLog.create({
      user: req.user._id,
      action: 'INTERNAL_NOTE_ADDED',
      entityType: 'Ticket',
      entityId: ticket._id,
      description: `${req.user.name} added an internal note on ticket ${ticket.ticketNumber}`,
      metadata: { commentId: note._id, visibility: 'Internal' },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    const populatedNote = await Comment.findById(note._id).populate(
      'author',
      'name email role department avatar'
    );

    return res.status(201).json({
      success: true,
      message: 'Internal note saved successfully',
      data: populatedNote,
    });
  } catch (error) {
    next(error);
  }
};
