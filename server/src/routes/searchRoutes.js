import express from 'express';
import { searchGlobal } from '../controllers/searchController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', searchGlobal);

export default router;
