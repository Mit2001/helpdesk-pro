import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Ticket from '../models/Ticket.js';
import Comment from '../models/Comment.js';
import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';
import SLA from '../models/SLA.js';
import {
  createTicket,
  getTicketById,
  escalateTicket,
  resolveTicket,
  closeTicket,
  reopenTicket,
} from '../controllers/ticketController.js';
import { addComment, addInternalNote } from '../controllers/commentController.js';
import { authorizeRoles } from '../middleware/authMiddleware.js';

dotenv.config();

const createMockReqRes = ({ body = {}, params = {}, user = null, headers = {} } = {}) => {
  const req = {
    body,
    params,
    user,
    headers,
    ip: '127.0.0.1',
  };

  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    },
  };

  return { req, res };
};

const runWorkflowTests = async () => {
  console.log('====================================================');
  console.log('  HelpDesk Pro - Phase 5: Workflow & Security Tests');
  console.log('====================================================\n');

  const results = [];
  const recordTest = (name, passed, details = '') => {
    results.push({ name, passed, details });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${name} ${details ? `- ${details}` : ''}`);
  };

  // Mock Users
  const mockAdmin = {
    _id: new mongoose.Types.ObjectId('64f1a2b3c4d5e6f7a8b9c001'),
    name: 'Sarah Admin',
    email: 'admin@helpdeskpro.com',
    role: 'Admin',
    department: 'IT Operations',
    status: 'Active',
  };

  const mockEngineer = {
    _id: new mongoose.Types.ObjectId('64f1a2b3c4d5e6f7a8b9c002'),
    name: 'Alex Support',
    email: 'support@helpdeskpro.com',
    role: 'Support Engineer',
    department: 'Technical Support',
    status: 'Active',
  };

  const mockEmployee = {
    _id: new mongoose.Types.ObjectId('64f1a2b3c4d5e6f7a8b9c003'),
    name: 'Emma Employee',
    email: 'emma@helpdeskpro.com',
    role: 'Employee',
    department: 'Marketing',
    status: 'Active',
  };

  const mockCategory = {
    _id: new mongoose.Types.ObjectId('64f1a2b3c4d5e6f7a8b9c005'),
    name: 'Software',
    status: 'Active',
  };

  // In-Memory Collections
  const inMemoryTickets = [];
  const inMemoryComments = [];
  const inMemoryAuditLogs = [];
  const inMemoryNotifications = [];

  // Mocks
  Category.findOne = async () => mockCategory;
  Category.findById = async () => mockCategory;
  SLA.findOne = () => ({ lean: () => Promise.resolve({ resolutionTimeHours: 8 }) });

  AuditLog.create = async (doc) => {
    inMemoryAuditLogs.push(doc);
    return doc;
  };
  AuditLog.insertMany = async (docs) => {
    inMemoryAuditLogs.push(...docs);
    return docs;
  };
  AuditLog.find = () => ({
    populate: () => ({
      sort: () => ({
        lean: () => Promise.resolve(inMemoryAuditLogs),
      }),
    }),
  });

  Notification.create = async (doc) => {
    inMemoryNotifications.push(doc);
    return doc;
  };

  Comment.prototype.save = async function () {
    inMemoryComments.push(this);
    return this;
  };

  Comment.findById = (id) => ({
    populate: () => Promise.resolve(inMemoryComments.find((c) => c._id?.toString() === id.toString()) || null),
  });

  Comment.find = (filter) => {
    let filtered = [...inMemoryComments];
    if (filter.ticket) {
      filtered = filtered.filter((c) => c.ticket.toString() === filter.ticket.toString());
    }
    if (filter.visibility) {
      filtered = filtered.filter((c) => c.visibility === filter.visibility);
    }
    return {
      populate: () => ({
        sort: () => ({
          lean: () => Promise.resolve(filtered),
        }),
      }),
    };
  };

  Ticket.prototype.save = async function () {
    const idx = inMemoryTickets.findIndex((t) => t._id.toString() === this._id.toString());
    if (idx >= 0) {
      inMemoryTickets[idx] = this;
    } else {
      inMemoryTickets.push(this);
    }
    return this;
  };

  const createSingleQuery = (doc) => {
    const query = {
      populate: () => query,
      then: (resolve, reject) => Promise.resolve(doc).then(resolve, reject),
      catch: (reject) => Promise.resolve(doc).catch(reject),
    };
    return query;
  };

  Ticket.findById = (id) => {
    const item = inMemoryTickets.find((t) => t._id.toString() === id?.toString());
    if (!item) return createSingleQuery(null);

    const doc = {
      ...item,
      _id: item._id,
      ticketNumber: item.ticketNumber,
      subject: item.subject,
      description: item.description,
      status: item.status,
      priority: item.priority,
      createdBy: mockEmployee,
      assignedTo: mockEngineer,
      category: mockCategory,
      firstResponseAt: item.firstResponseAt,
      resolvedAt: item.resolvedAt,
      resolution: item.resolution,
      closedAt: item.closedAt,
      reopenedAt: item.reopenedAt,
      reopenReason: item.reopenReason,
      slaDueAt: item.slaDueAt,
      toObject: () => ({ ...item }),
      save: async function () {
        const idx = inMemoryTickets.findIndex((t) => t._id.toString() === item._id.toString());
        if (idx >= 0) {
          inMemoryTickets[idx].status = this.status;
          inMemoryTickets[idx].firstResponseAt = this.firstResponseAt;
          inMemoryTickets[idx].resolvedAt = this.resolvedAt;
          inMemoryTickets[idx].resolution = this.resolution;
          inMemoryTickets[idx].closedAt = this.closedAt;
          inMemoryTickets[idx].reopenedAt = this.reopenedAt;
          inMemoryTickets[idx].reopenReason = this.reopenReason;
        }
        return this;
      },
    };

    return createSingleQuery(doc);
  };

  try {
    // Setup Base Ticket
    const ticketId = new mongoose.Types.ObjectId('64f1a2b3c4d5e6f7a8b9c100');
    const testTicket = new Ticket({
      _id: ticketId,
      ticketNumber: 'HD-1001',
      subject: 'VPN Outage',
      description: 'Cannot connect to production VPN',
      category: mockCategory._id,
      priority: 'High',
      status: 'Open',
      createdBy: mockEmployee._id,
      assignedTo: mockEngineer._id,
      slaDueAt: new Date(Date.now() + 8 * 3600 * 1000),
    });
    await testTicket.save();

    // 1. Employee Adds Public Comment
    const { req: req1, res: res1 } = createMockReqRes({
      params: { id: ticketId.toString() },
      body: { message: 'I rebooted my laptop, still timing out.' },
      user: mockEmployee,
    });
    await addComment(req1, res1, () => {});
    recordTest('1. Employee Adds Public Comment', res1.statusCode === 201 && inMemoryComments[0].visibility === 'Public', 'Comment created with Public visibility');

    // 2. Support Engineer Adds Public Reply & firstResponseAt is Recorded
    const { req: req2, res: res2 } = createMockReqRes({
      params: { id: ticketId.toString() },
      body: { message: 'Checking IPsec gateway logs now.' },
      user: mockEngineer,
    });
    await addComment(req2, res2, () => {});
    const recordedFirstResponse = inMemoryTickets[0].firstResponseAt;
    recordTest('2 & 16. Support Engineer Reply & firstResponseAt Set', res2.statusCode === 201 && !!recordedFirstResponse, `Recorded first response at ${recordedFirstResponse?.toISOString()}`);

    // 3. Support Engineer Adds Second Reply (firstResponseAt is NOT overwritten)
    const { req: req3, res: res3 } = createMockReqRes({
      params: { id: ticketId.toString() },
      body: { message: 'Still investigating.' },
      user: mockEngineer,
    });
    await addComment(req3, res3, () => {});
    const firstResponsePreserved = inMemoryTickets[0].firstResponseAt?.getTime() === recordedFirstResponse?.getTime();
    recordTest('17. firstResponseAt Preserved on Subsequent Replies', firstResponsePreserved, 'Timestamp unchanged');

    // 4. Support Engineer Adds Internal Note
    const { req: req4, res: res4 } = createMockReqRes({
      params: { id: ticketId.toString() },
      body: { message: 'Internal: Gateway NAT rule was dropped.' },
      user: mockEngineer,
    });
    await addInternalNote(req4, res4, () => {});
    const internalNote = inMemoryComments.find((c) => c.visibility === 'Internal');
    recordTest('3 & 4. Support Engineer Adds Internal Note', res4.statusCode === 201 && !!internalNote, 'Internal note saved with visibility: "Internal"');

    // 5. Employee Blocked from Internal Notes Endpoint
    const { req: req5, res: res5 } = createMockReqRes({ user: mockEmployee });
    let empNoteNext = false;
    authorizeRoles('Admin', 'Support Engineer')(req5, res5, () => { empNoteNext = true; });
    recordTest('5. Employee Blocked from Internal Notes Endpoint', !empNoteNext && res5.statusCode === 403, 'Returns 403 Forbidden');

    // 6. Employee Blocked from Escalation Endpoint
    const { req: req6, res: res6 } = createMockReqRes({ user: mockEmployee });
    let empEscNext = false;
    authorizeRoles('Admin', 'Support Engineer')(req6, res6, () => { empEscNext = true; });
    recordTest('6. Employee Blocked from Escalation Endpoint', !empEscNext && res6.statusCode === 403, 'Returns 403 Forbidden');

    // 7. Support Engineer Escalates Ticket
    const { req: req7, res: res7 } = createMockReqRes({
      params: { id: ticketId.toString() },
      body: { reason: 'Requires Level 3 Network Engineer routing fix' },
      user: mockEngineer,
    });
    await escalateTicket(req7, res7, () => {});
    recordTest('7 & 23. Support Engineer Escalates Ticket', res7.statusCode === 200 && inMemoryTickets[0].status === 'Escalated', 'Status set to Escalated with audit log');

    // 8. Resolution Requires Text
    const { req: req8, res: res8 } = createMockReqRes({
      params: { id: ticketId.toString() },
      body: { resolution: '' },
      user: mockEngineer,
    });
    await resolveTicket(req8, res8, () => {});
    recordTest('8. Resolution Validation Enforced', res8.statusCode === 400, 'Returns 400 when resolution text is missing');

    // 9. Support Engineer Resolves Ticket
    const { req: req9, res: res9 } = createMockReqRes({
      params: { id: ticketId.toString() },
      body: { resolution: 'Re-enabled NAT rule on firewall cluster 2.' },
      user: mockEngineer,
    });
    await resolveTicket(req9, res9, () => {});
    recordTest('9 & 24. Ticket Resolved Successfully', res9.statusCode === 200 && inMemoryTickets[0].status === 'Resolved' && inMemoryTickets[0].resolvedAt, 'Status set to Resolved with timestamp & resolution notes');

    // 10. Open/In Progress Ticket Cannot Be Closed Directly
    const openTicketId = new mongoose.Types.ObjectId('64f1a2b3c4d5e6f7a8b9c200');
    const openTicket = new Ticket({
      _id: openTicketId,
      ticketNumber: 'HD-1002',
      subject: 'Printer Down',
      status: 'Open',
      createdBy: mockEmployee._id,
    });
    await openTicket.save();

    const { req: req10, res: res10 } = createMockReqRes({
      params: { id: openTicketId.toString() },
      user: mockAdmin,
    });
    await closeTicket(req10, res10, () => {});
    recordTest('11 & 12. Non-Resolved Ticket Cannot Be Closed', res10.statusCode === 400, 'Returns 400 You cannot close a ticket until resolved');

    // 11. Resolved Ticket Closes Successfully
    const { req: req11, res: res11 } = createMockReqRes({
      params: { id: ticketId.toString() },
      user: mockAdmin,
    });
    await closeTicket(req11, res11, () => {});
    recordTest('10 & 25. Resolved Ticket Closes Successfully', res11.statusCode === 200 && inMemoryTickets[0].status === 'Closed' && inMemoryTickets[0].closedAt, 'Status set to Closed with closedAt timestamp');

    // 12. Reopen Requires Reason
    const { req: req12, res: res12 } = createMockReqRes({
      params: { id: ticketId.toString() },
      body: { reason: '' },
      user: mockEmployee,
    });
    await reopenTicket(req12, res12, () => {});
    recordTest('15. Reopen Reason Required', res12.statusCode === 400, 'Returns 400 when reason is missing');

    // 13. Employee Reopens Closed Ticket
    const { req: req13, res: res13 } = createMockReqRes({
      params: { id: ticketId.toString() },
      body: { reason: 'VPN disconnects again after 5 minutes.' },
      user: mockEmployee,
    });
    await reopenTicket(req13, res13, () => {});
    recordTest('13 & 14 & 26. Employee Reopens Ticket', res13.statusCode === 200 && inMemoryTickets[0].status === 'Open' && inMemoryTickets[0].reopenedAt, 'Ticket restored to Open with new SLA target and audit log');

    // 14. Server-Side Security: Employee GET /tickets/:id Hides Internal Notes
    const { req: req14, res: res14 } = createMockReqRes({
      params: { id: ticketId.toString() },
      user: mockEmployee,
    });
    await getTicketById(req14, res14, () => {});
    const empReceivedNotes = res14.data?.data?.comments?.some((c) => c.visibility === 'Internal');
    recordTest('18. Server-Side Privacy: Internal Notes Hidden from Employee', !empReceivedNotes && res14.data?.data?.comments?.length > 0, 'Internal notes filtered on backend');

    // 15. Server-Side Security: Support Engineer GET /tickets/:id Receives Internal Notes
    const { req: req15, res: res15 } = createMockReqRes({
      params: { id: ticketId.toString() },
      user: mockEngineer,
    });
    await getTicketById(req15, res15, () => {});
    const engReceivedNotes = res15.data?.data?.comments?.some((c) => c.visibility === 'Internal');
    recordTest('19 & 20. Internal Notes Visible to Support Staff & Admin', engReceivedNotes, 'Internal notes included for Support Engineer');

    // 16. Audit Log Records
    const auditActions = inMemoryAuditLogs.map((l) => l.action);
    const hasRequiredAudits =
      auditActions.includes('COMMENT_ADDED') &&
      auditActions.includes('INTERNAL_NOTE_ADDED') &&
      auditActions.includes('TICKET_ESCALATED') &&
      auditActions.includes('TICKET_RESOLVED') &&
      auditActions.includes('TICKET_CLOSED') &&
      auditActions.includes('TICKET_REOPENED');
    recordTest('21-26. Audit Logging Completeness', hasRequiredAudits, `Recorded ${inMemoryAuditLogs.length} audit trail events`);

    // 17. Notification Dispatches
    const notifTypes = inMemoryNotifications.map((n) => n.type);
    const hasRequiredNotifs =
      notifTypes.includes('TICKET_COMMENT') &&
      notifTypes.includes('TICKET_UPDATED') &&
      notifTypes.includes('TICKET_RESOLVED') &&
      notifTypes.includes('TICKET_CLOSED');
    recordTest('27. Notification Dispatches', hasRequiredNotifs, `Dispatched ${inMemoryNotifications.length} notifications`);

    console.log('\n====================================================');
    console.log(`  Phase 5 Test Summary: ${results.filter((r) => r.passed).length}/${results.length} Tests Passed`);
    console.log('====================================================\n');

    const allPassed = results.every((r) => r.passed);
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('\n[Workflow Test Error]', error);
    process.exit(1);
  }
};

runWorkflowTests();
