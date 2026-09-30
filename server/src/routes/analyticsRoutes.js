import express from 'express';
import {
  getAdminAnalytics,
  getEngineerAnalytics,
  getEmployeeAnalytics,
} from '../controllers/analyticsController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// All analytics routes require authentication
router.use(authenticateToken);

// Admin Analytics (Executive ITSM Dashboard) - Admin only
router.get('/admin', authorizeRoles('Admin'), getAdminAnalytics);

// Support Engineer Analytics (Personal Workload + Resolution Dashboard) - Support Engineer & Admin
router.get('/engineer', authorizeRoles('Support Engineer', 'Admin'), getEngineerAnalytics);

// Employee Analytics (Personal Service Dashboard) - All authenticated roles
router.get('/employee', getEmployeeAnalytics);

export default router;
