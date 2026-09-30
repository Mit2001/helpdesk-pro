import express from 'express';
import {
  getProfile,
  updateProfile,
  changePassword,
  updateSettings,
} from '../controllers/profileController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getProfile);
router.patch('/', updateProfile);
router.patch('/password', changePassword);
router.patch('/settings', updateSettings);

export default router;
