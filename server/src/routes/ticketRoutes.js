import express from 'express';
import {
  createTicket,
  getTickets,
  getMyTickets,
  getTicketById,
  updateTicket,
  escalateTicket,
  resolveTicket,
  closeTicket,
  reopenTicket,
} from '../controllers/ticketController.js';
import { addComment, addInternalNote } from '../controllers/commentController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// All ticket routes require JWT authentication
router.use(authenticateToken);

// Create ticket (Employee, Support Engineer, Admin)
router.post('/', createTicket);

// Global ticket queue (Admin, Support Engineer only - Employee gets 403)
router.get('/', authorizeRoles('Admin', 'Support Engineer'), getTickets);

// My Tickets (Personal queue for all authenticated users)
router.get('/my', getMyTickets);

// Get single ticket by ID (Access verified in controller by role/creator)
router.get('/:id', getTicketById);

// Update ticket metadata/fields (Admin, Support Engineer only)
router.patch('/:id', authorizeRoles('Admin', 'Support Engineer'), updateTicket);

// Comment & Conversation routes
router.post('/:id/comments', addComment);
router.post('/:id/internal-notes', authorizeRoles('Admin', 'Support Engineer'), addInternalNote);

// Dedicated Workflow Action endpoints
router.post('/:id/escalate', authorizeRoles('Admin', 'Support Engineer'), escalateTicket);
router.post('/:id/resolve', authorizeRoles('Admin', 'Support Engineer'), resolveTicket);
router.post('/:id/close', authorizeRoles('Admin', 'Support Engineer'), closeTicket);
router.post('/:id/reopen', reopenTicket);

export default router;
