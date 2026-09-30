import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Generate signed JWT token for an authenticated user
 */
const generateToken = (userId, role) => {
  const secret = process.env.JWT_SECRET || 'supersecretjwtkey_helpdeskpro_dev_2025';
  const expiresIn = process.env.JWT_EXPIRES_IN || '1d';

  return jwt.sign({ userId, role }, secret, { expiresIn });
};

/**
 * @desc    Authenticate user & get JWT token
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Query user and explicitly select password hash
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if user account is deactivated
    if (user.status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Please contact your administrator.',
      });
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Update last login timestamp without re-validating whole document
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate JWT
    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          phone: user.phone || '',
          avatar: user.avatar || '',
          lastLoginAt: user.lastLoginAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current authenticated user profile
 * @route   GET /api/auth/me
 * @access  Private (Authenticated)
 */
export const getMe = async (req, res, next) => {
  try {
    // req.user is attached by authenticateToken middleware
    const user = req.user;

    return res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone || '',
        avatar: user.avatar || '',
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
