import mongoose from 'mongoose';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import AuditLog from '../models/AuditLog.js';

/**
 * @desc    Get assignable staff (Active Support Engineers & Admins) for ticket workflow
 * @route   GET /api/users/assignable
 * @access  Private (Admin, Support Engineer)
 */
export const getAssignableUsers = async (req, res, next) => {
  try {
    const assignableUsers = await User.find({
      status: 'Active',
      role: { $in: ['Support Engineer', 'Admin'] },
    })
      .select('_id name email role department avatar')
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: assignableUsers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all users with search, role/status filtering, and pagination
 * @route   GET /api/users
 * @access  Private (Admin only)
 */
export const getUsers = async (req, res, next) => {
  try {
    const { role, status, search, page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const filter = {};

    if (role && role !== 'all') {
      filter.role = role;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: regex }, { email: regex }, { department: regex }];
    }

    // If pagination requested (e.g. for admin table)
    if (page || limit) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
      const skip = (pageNum - 1) * limitNum;

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const [users, total] = await Promise.all([
        User.find(filter)
          .select('-password')
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        User.countDocuments(filter),
      ]);

      return res.status(200).json({
        success: true,
        data: users,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum) || 1,
          limit: limitNum,
        },
      });
    }

    // Default dropdown / select list behavior
    const users = await User.find(filter)
      .select('-password')
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user details by ID along with activity statistics
 * @route   GET /api/users/:id
 * @access  Private (Admin, or own profile)
 */
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    // Authorization: Admin can view any user; others can only view themselves
    if (req.user.role !== 'Admin' && req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view this user profile',
      });
    }

    const user = await User.findById(id).select('-password').lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found',
      });
    }

    // Calculate lightweight user ticket metrics
    const userObjectId = new mongoose.Types.ObjectId(id);
    const [ticketStats] = await Ticket.aggregate([
      {
        $facet: {
          createdStats: [
            { $match: { createdBy: userObjectId } },
            {
              $group: {
                _id: null,
                totalCreated: { $sum: 1 },
                openCreated: {
                  $sum: { $cond: [{ $in: ['$status', ['Open', 'Assigned', 'In Progress']] }, 1, 0] },
                },
                resolvedCreated: {
                  $sum: { $cond: [{ $in: ['$status', ['Resolved', 'Closed']] }, 1, 0] },
                },
              },
            },
          ],
          assignedStats: [
            { $match: { assignedTo: userObjectId } },
            {
              $group: {
                _id: null,
                totalAssigned: { $sum: 1 },
                openAssigned: {
                  $sum: { $cond: [{ $in: ['$status', ['Open', 'Assigned', 'In Progress']] }, 1, 0] },
                },
                resolvedAssigned: {
                  $sum: { $cond: [{ $in: ['$status', ['Resolved', 'Closed']] }, 1, 0] },
                },
                breachedAssigned: {
                  $sum: { $cond: [{ $eq: ['$slaStatus', 'Breached'] }, 1, 0] },
                },
              },
            },
          ],
        },
      },
    ]);

    const created = ticketStats?.createdStats[0] || { totalCreated: 0, openCreated: 0, resolvedCreated: 0 };
    const assigned = ticketStats?.assignedStats[0] || {
      totalAssigned: 0,
      openAssigned: 0,
      resolvedAssigned: 0,
      breachedAssigned: 0,
    };

    return res.status(200).json({
      success: true,
      data: user,
      stats: {
        created,
        assigned,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new user account (Admin only)
 * @route   POST /api/users
 * @access  Private (Admin only)
 */
export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role = 'Employee', department = 'General', phone = '', status = 'Active' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Full Name is required',
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const validRoles = ['Employee', 'Support Engineer', 'Admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role: ${role}. Allowed roles: ${validRoles.join(', ')}`,
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: `A user with email ${normalizedEmail} already exists`,
      });
    }

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password, // Password hashed automatically in User model pre-save hook
      role,
      department: department.trim() || 'General',
      phone: phone.trim() || '',
      status: status === 'Inactive' ? 'Inactive' : 'Active',
    });

    await user.save();

    // Create Audit Log
    await AuditLog.create({
      user: req.user._id,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user._id,
      description: `Administrator ${req.user.name} created user account ${user.name} (${user.email}) with role ${user.role}`,
      metadata: {
        targetUserId: user._id,
        email: user.email,
        role: user.role,
        department: user.department,
        status: user.status,
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(201).json({
      success: true,
      message: 'User account created successfully',
      data: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile details (Admin only)
 * @route   PATCH /api/users/:id
 * @access  Private (Admin only)
 */
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, department, phone, avatar, email } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found',
      });
    }

    if (email && email.trim().toLowerCase() !== user.email) {
      const normalizedEmail = email.trim().toLowerCase();
      const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: `Email ${normalizedEmail} is already in use by another account`,
        });
      }
      user.email = normalizedEmail;
    }

    if (name && name.trim()) user.name = name.trim();
    if (department !== undefined) user.department = department.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    // Create Audit Log
    await AuditLog.create({
      user: req.user._id,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: user._id,
      description: `Administrator ${req.user.name} updated profile for user ${user.name} (${user.email})`,
      metadata: {
        targetUserId: user._id,
        name: user.name,
        email: user.email,
        department: user.department,
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(200).json({
      success: true,
      message: 'User details updated successfully',
      data: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change user role (Admin only with self-demotion prevention)
 * @route   PATCH /api/users/:id/role
 * @access  Private (Admin only)
 */
export const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    const validRoles = ['Employee', 'Support Engineer', 'Admin'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role: ${role}. Allowed roles: ${validRoles.join(', ')}`,
      });
    }

    // Safety check: Prevent Admin self-demotion
    if (req.user._id.toString() === id && role !== 'Admin') {
      return res.status(400).json({
        success: false,
        message: 'Operation forbidden: You cannot remove your own Administrator privileges to prevent system lockout.',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found',
      });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    // Create Audit Log
    await AuditLog.create({
      user: req.user._id,
      action: 'USER_ROLE_CHANGED',
      entityType: 'User',
      entityId: user._id,
      description: `Administrator ${req.user.name} changed role of user ${user.name} from "${oldRole}" to "${role}"`,
      metadata: {
        targetUserId: user._id,
        targetEmail: user.email,
        oldRole,
        newRole: role,
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(200).json({
      success: true,
      message: `User role successfully changed to ${role}`,
      data: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle user account status (Active / Inactive) with self-deactivation prevention
 * @route   PATCH /api/users/:id/status
 * @access  Private (Admin only)
 */
export const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { status, active } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    // Accept either status ('Active' | 'Inactive') or active (boolean)
    let newStatus;
    if (status !== undefined) {
      newStatus = status === 'Active' ? 'Active' : 'Inactive';
    } else if (active !== undefined) {
      newStatus = active ? 'Active' : 'Inactive';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Account status or active flag is required',
      });
    }

    // Safety check: Prevent Admin self-deactivation
    if (req.user._id.toString() === id && newStatus === 'Inactive') {
      return res.status(400).json({
        success: false,
        message: 'Operation forbidden: You cannot deactivate your own administrative account to prevent system lockout.',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found',
      });
    }

    const oldStatus = user.status;
    user.status = newStatus;
    await user.save();

    // Create Audit Log
    const auditAction = newStatus === 'Active' ? 'USER_ACTIVATED' : 'USER_DEACTIVATED';
    await AuditLog.create({
      user: req.user._id,
      action: auditAction,
      entityType: 'User',
      entityId: user._id,
      description: `Administrator ${req.user.name} ${newStatus === 'Active' ? 'activated' : 'deactivated'} account for user ${user.name} (${user.email})`,
      metadata: {
        targetUserId: user._id,
        targetEmail: user.email,
        oldStatus,
        newStatus,
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(200).json({
      success: true,
      message: `User account successfully ${newStatus === 'Active' ? 'activated' : 'deactivated'}`,
      data: userResponse,
    });
  } catch (error) {
    next(error);
  }
};
