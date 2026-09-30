import User from '../models/User.js';

/**
 * @desc    Get current user profile
 * @route   GET /api/profile
 * @access  Private (Authenticated)
 */
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone || '',
        avatar: user.avatar || '',
        status: user.status,
        preferences: user.preferences || {
          emailNotifications: true,
          inAppNotifications: true,
          ticketUpdatesAlert: true,
          theme: 'dark',
        },
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update current user profile (personal fields only)
 * @route   PATCH /api/profile
 * @access  Private (Authenticated)
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, department, avatar, role, status } = req.body;

    // Security guard: Non-admin or regular user cannot self-modify privileged role or status
    if (role !== undefined || status !== undefined) {
      if (req.user.role !== 'Admin') {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to modify your own role or account status',
        });
      }
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ success: false, message: 'Name cannot be empty' });
      }
      user.name = name.trim();
    }

    if (phone !== undefined) {
      user.phone = phone.trim();
    }

    if (department !== undefined) {
      user.department = department.trim();
    }

    if (avatar !== undefined) {
      user.avatar = avatar.trim();
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone || '',
        avatar: user.avatar || '',
        status: user.status,
        preferences: user.preferences,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change authenticated user password
 * @route   PATCH /api/profile/password
 * @access  Private (Authenticated)
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both current password and new password',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password does not match',
      });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user preferences/settings
 * @route   PATCH /api/profile/settings
 * @access  Private (Authenticated)
 */
export const updateSettings = async (req, res, next) => {
  try {
    const { emailNotifications, inAppNotifications, ticketUpdatesAlert, theme } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.preferences) {
      user.preferences = {};
    }

    if (emailNotifications !== undefined) user.preferences.emailNotifications = Boolean(emailNotifications);
    if (inAppNotifications !== undefined) user.preferences.inAppNotifications = Boolean(inAppNotifications);
    if (ticketUpdatesAlert !== undefined) user.preferences.ticketUpdatesAlert = Boolean(ticketUpdatesAlert);
    if (theme && ['dark', 'light', 'system'].includes(theme)) user.preferences.theme = theme;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        preferences: user.preferences,
      },
    });
  } catch (error) {
    next(error);
  }
};
