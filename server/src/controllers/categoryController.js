import mongoose from 'mongoose';
import Category from '../models/Category.js';
import AuditLog from '../models/AuditLog.js';

/**
 * @desc    Get categories with search, status filtering, and pagination
 * @route   GET /api/categories
 * @access  Private / Authenticated
 */
export const getCategories = async (req, res, next) => {
  try {
    const { status, search, page, limit, sortBy = 'name', sortOrder = 'asc' } = req.query;
    const filter = {};

    // Only Admin can view all/inactive categories; others get only Active
    if (req.user?.role === 'Admin' && status && status !== 'all') {
      filter.status = status;
    } else if (req.user?.role === 'Admin' && status === 'all') {
      // no status filter, return all
    } else {
      filter.status = 'Active';
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: regex }, { description: regex }];
    }

    if (page || limit) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
      const skip = (pageNum - 1) * limitNum;

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const [categories, total] = await Promise.all([
        Category.find(filter)
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Category.countDocuments(filter),
      ]);

      return res.status(200).json({
        success: true,
        data: categories,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum) || 1,
          limit: limitNum,
        },
      });
    }

    const categories = await Category.find(filter)
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new category (Admin only)
 * @route   POST /api/categories
 * @access  Private / Admin
 */
export const createCategory = async (req, res, next) => {
  try {
    const { name, description = '', subcategories = [], status = 'Active' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required',
      });
    }

    const normalizedName = name.trim();
    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${normalizedName}$`, 'i') },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A category with the name "${normalizedName}" already exists`,
      });
    }

    const category = new Category({
      name: normalizedName,
      description: description.trim(),
      subcategories: Array.isArray(subcategories)
        ? subcategories.map((s) => (typeof s === 'string' ? { name: s.trim() } : s))
        : [],
      status: status === 'Inactive' ? 'Inactive' : 'Active',
      createdBy: req.user?._id,
    });

    await category.save();

    // Create Audit Log
    await AuditLog.create({
      user: req.user._id,
      action: 'CATEGORY_CREATED',
      entityType: 'Category',
      entityId: category._id,
      description: `Administrator ${req.user.name} created category "${category.name}"`,
      metadata: {
        categoryName: category.name,
        status: category.status,
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update category (Admin only)
 * @route   PATCH /api/categories/:id
 * @access  Private / Admin
 */
export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, subcategories } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID format',
      });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    if (name && name.trim()) {
      const normalizedName = name.trim();
      const duplicate = await Category.findOne({
        name: { $regex: new RegExp(`^${normalizedName}$`, 'i') },
        _id: { $ne: category._id },
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Another category with the name "${normalizedName}" already exists`,
        });
      }
      category.name = normalizedName;
    }

    if (description !== undefined) {
      category.description = description.trim();
    }

    if (subcategories !== undefined && Array.isArray(subcategories)) {
      category.subcategories = subcategories.map((s) => (typeof s === 'string' ? { name: s.trim() } : s));
    }

    await category.save();

    // Create Audit Log
    await AuditLog.create({
      user: req.user._id,
      action: 'CATEGORY_UPDATED',
      entityType: 'Category',
      entityId: category._id,
      description: `Administrator ${req.user.name} updated category "${category.name}"`,
      metadata: {
        categoryName: category.name,
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    return res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle category status (Active / Inactive) (Admin only)
 * @route   PATCH /api/categories/:id/status
 * @access  Private / Admin
 */
export const updateCategoryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { status, active } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID format',
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

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    const oldStatus = category.status;
    category.status = newStatus;
    await category.save();

    // Create Audit Log
    const auditAction = newStatus === 'Active' ? 'CATEGORY_ACTIVATED' : 'CATEGORY_DEACTIVATED';
    await AuditLog.create({
      user: req.user._id,
      action: auditAction,
      entityType: 'Category',
      entityId: category._id,
      description: `Administrator ${req.user.name} ${newStatus === 'Active' ? 'activated' : 'deactivated'} category "${category.name}"`,
      metadata: {
        categoryName: category.name,
        oldStatus,
        newStatus,
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    return res.status(200).json({
      success: true,
      message: `Category successfully ${newStatus === 'Active' ? 'activated' : 'deactivated'}`,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};
