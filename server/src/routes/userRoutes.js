import express from 'express';
import {
  getUsers,
  getAssignableUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserRole,
  updateUserStatus,
} from '../controllers/userController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// All user routes require authentication
router.use(authenticateToken);

// Assignable staff directory (Support Engineers & Admins only)
router.get('/assignable', authorizeRoles('Admin', 'Support Engineer'), getAssignableUsers);

// Full user directory (Strictly Admin only)
router.get('/', authorizeRoles('Admin'), getUsers);

// User details
router.get('/:id', getUserById);

// Admin-only User Management operations
router.post('/', authorizeRoles('Admin'), createUser);
router.patch('/:id', authorizeRoles('Admin'), updateUser);
router.patch('/:id/role', authorizeRoles('Admin'), updateUserRole);
router.patch('/:id/status', authorizeRoles('Admin'), updateUserStatus);

export default router;
