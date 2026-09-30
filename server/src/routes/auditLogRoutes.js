import express from 'express';
import { getAuditLogs } from '../controllers/auditLogController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// All audit log routes require authentication and Admin role
router.use(authenticateToken);
router.use(authorizeRoles('Admin'));

router.get('/', getAuditLogs);

export default router;
