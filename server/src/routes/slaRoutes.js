import express from 'express';
import {
  getSLAs,
  getSLAById,
  createSLA,
  updateSLA,
  updateSLAStatus,
} from '../controllers/slaController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// All SLA routes require authentication
router.use(authenticateToken);

// Read SLA policies (all authenticated users can read current SLAs)
router.get('/', getSLAs);
router.get('/:id', authorizeRoles('Admin'), getSLAById);

// Admin-only SLA management
router.post('/', authorizeRoles('Admin'), createSLA);
router.patch('/:id', authorizeRoles('Admin'), updateSLA);
router.patch('/:id/status', authorizeRoles('Admin'), updateSLAStatus);

export default router;
