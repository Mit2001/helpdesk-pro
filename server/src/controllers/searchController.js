import Ticket from '../models/Ticket.js';

/**
 * @desc    Global search across tickets with server-side authorization scoping
 * @route   GET /api/search
 * @access  Private (Authenticated)
 */
export const searchGlobal = async (req, res, next) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || !q.trim() || q.trim().length < 2) {
      return res.status(200).json({
        success: true,
        data: {
          tickets: [],
        },
      });
    }

    const searchQuery = q.trim();
    const searchRegex = new RegExp(searchQuery, 'i');
    const limitNum = Math.min(25, Math.max(1, parseInt(limit, 10) || 10));

    // Base query conditions for field matching
    const searchMatch = {
      $or: [
        { ticketNumber: searchRegex },
        { subject: searchRegex },
        { description: searchRegex },
        { department: searchRegex },
        { priority: searchRegex },
        { status: searchRegex },
      ],
    };

    // Role-based authorization scoping
    let filter = { ...searchMatch };

    if (req.user.role === 'Employee') {
      // Employees are strictly restricted to tickets created by themselves
      filter = {
        $and: [
          { createdBy: req.user._id },
          searchMatch,
        ],
      };
    }

    // Projections: Return only safe compact fields, omitting internal notes and sensitive details
    const tickets = await Ticket.find(filter)
      .select('_id ticketNumber subject priority status department createdAt category')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .lean();

    const formattedTickets = tickets.map((t) => ({
      _id: t._id,
      id: t._id,
      ticketNumber: t.ticketNumber,
      title: t.subject,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      department: t.department,
      categoryName: t.category?.name || 'General',
      createdAt: t.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data: {
        tickets: formattedTickets,
        count: formattedTickets.length,
      },
    });
  } catch (error) {
    next(error);
  }
};
