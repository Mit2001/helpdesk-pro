import express from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  updateCategoryStatus,
} from '../controllers/categoryController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// All category routes require authentication
router.use(authenticateToken);

// Publicly readable categories (defaults to active for non-admin)
router.get('/', getCategories);

// Admin-only Category Management operations
router.post('/', authorizeRoles('Admin'), createCategory);
router.patch('/:id', authorizeRoles('Admin'), updateCategory);
router.patch('/:id/status', authorizeRoles('Admin'), updateCategoryStatus);

export default router;
