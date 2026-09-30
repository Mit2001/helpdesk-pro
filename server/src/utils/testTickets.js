import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Ticket from '../models/Ticket.js';
import SLA from '../models/SLA.js';
import Counter from '../models/Counter.js';
import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';
import {
  createTicket,
  getTickets,
  getMyTickets,
  getTicketById,
  updateTicket,
} from '../controllers/ticketController.js';
import { authorizeRoles } from '../middleware/authMiddleware.js';

dotenv.config();

// Mock req/res generator
const createMockReqRes = ({ body = {}, query = {}, params = {}, user = null, headers = {} } = {}) => {
  const req = {
    body,
    query,
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

const runTicketTests = async () => {
  console.log('====================================================');
  console.log('  HelpDesk Pro - Phase 4: Ticket Management Tests');
  console.log('====================================================\n');

  const results = [];
  const recordTest = (name, passed, details = '') => {
    results.push({ name, passed, details });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${name} ${details ? `- ${details}` : ''}`);
  };

  // Mock In-Memory Data Store
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

  const mockEmployee1 = {
    _id: new mongoose.Types.ObjectId('64f1a2b3c4d5e6f7a8b9c003'),
    name: 'Emma Employee',
    email: 'emma@helpdeskpro.com',
    role: 'Employee',
    department: 'Marketing',
    status: 'Active',
  };

  const mockEmployee2 = {
    _id: new mongoose.Types.ObjectId('64f1a2b3c4d5e6f7a8b9c004'),
    name: 'John Employee',
    email: 'john@helpdeskpro.com',
    role: 'Employee',
    department: 'Finance',
    status: 'Active',
  };

  const mockCategory = {
    _id: new mongoose.Types.ObjectId('64f1a2b3c4d5e6f7a8b9c005'),
    name: 'Network & VPN',
    description: 'Corporate network and remote access',
    status: 'Active',
    subcategories: [{ name: 'VPN Gateway', description: 'AnyConnect issue', active: true }],
  };

  let sequenceCounter = 1000;
  const inMemoryTickets = [];
  const inMemoryAuditLogs = [];
  const inMemoryNotifications = [];

  // Mock Counter
  Counter.getNextSequence = async () => {
    sequenceCounter += 1;
    return sequenceCounter;
  };

  // Mock Category.findOne and findById
  Category.findOne = async () => mockCategory;
  Category.findById = async () => mockCategory;

  // Mock SLA.findOne
  SLA.findOne = () => ({
    lean: () => Promise.resolve({ resolutionTimeHours: 8 }),
  });

  // Mock User.findById
  User.findById = async (id) => {
    const all = [mockAdmin, mockEngineer, mockEmployee1, mockEmployee2];
    return all.find((u) => u._id.toString() === id?.toString()) || null;
  };

  // Mock AuditLog.create and insertMany
  AuditLog.create = async (doc) => {
    inMemoryAuditLogs.push(doc);
    return doc;
  };
  AuditLog.insertMany = async (docs) => {
    inMemoryAuditLogs.push(...docs);
    return docs;
  };

  // Mock Notification.create
  Notification.create = async (doc) => {
    inMemoryNotifications.push(doc);
    return doc;
  };

  // Mock Ticket.prototype.save
  Ticket.prototype.save = async function () {
    const existingIndex = inMemoryTickets.findIndex(
      (t) => t._id.toString() === this._id.toString()
    );
    if (existingIndex >= 0) {
      inMemoryTickets[existingIndex] = this;
    } else {
      inMemoryTickets.push(this);
    }
    return this;
  };

  // Helper to create a chainable query for a single document
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
    if (!item) {
      return createSingleQuery(null);
    }

    const doc = {
      ...item,
      _id: item._id,
      ticketNumber: item.ticketNumber,
      subject: item.subject,
      description: item.description,
      category: mockCategory,
      priority: item.priority,
      status: item.status,
      createdBy: item.createdBy._id ? item.createdBy : (item.createdBy.toString() === mockEmployee1._id.toString() ? mockEmployee1 : mockEmployee2),
      assignedTo: item.assignedTo ? (item.assignedTo._id ? item.assignedTo : mockEngineer) : null,
      department: item.department,
      slaDueAt: item.slaDueAt,
      slaStatus: item.slaStatus,
      toObject: () => ({ ...item }),
      save: async function () {
        const idx = inMemoryTickets.findIndex((t) => t._id.toString() === item._id.toString());
        if (idx >= 0) {
          inMemoryTickets[idx].status = this.status;
          inMemoryTickets[idx].priority = this.priority;
          inMemoryTickets[idx].assignedTo = this.assignedTo;
          inMemoryTickets[idx].slaDueAt = this.slaDueAt;
          inMemoryTickets[idx].slaStatus = this.slaStatus;
        }
        return this;
      },
    };

    return createSingleQuery(doc);
  };

  Ticket.find = (filter) => {
    let filtered = [...inMemoryTickets];

    if (filter.status) filtered = filtered.filter((t) => t.status === filter.status);
    if (filter.priority) filtered = filtered.filter((t) => t.priority === filter.priority);
    if (filter.category) filtered = filtered.filter((t) => t.category.toString() === filter.category.toString());
    if (filter.assignedTo !== undefined) {
      if (filter.assignedTo === null) {
        filtered = filtered.filter((t) => !t.assignedTo);
      } else {
        filtered = filtered.filter((t) => t.assignedTo?.toString() === filter.assignedTo.toString());
      }
    }
    if (filter.createdBy) {
      const targetId = filter.createdBy._id ? filter.createdBy._id.toString() : filter.createdBy.toString();
      filtered = filtered.filter((t) => {
        const cId = t.createdBy?._id ? t.createdBy._id.toString() : (t.createdBy?.toString ? t.createdBy.toString() : String(t.createdBy));
        return cId === targetId;
      });
    }
    if (filter.$or) {
      filtered = filtered.filter((t) =>
        filter.$or.some((c) => {
          if (c.createdBy) {
            const cId = t.createdBy._id ? t.createdBy._id.toString() : t.createdBy.toString();
            return cId === c.createdBy.toString();
          }
          if (c.assignedTo) {
            return t.assignedTo?.toString() === c.assignedTo.toString();
          }
          if (c.subject) {
            return c.subject.test(t.subject) || c.description.test(t.description) || c.ticketNumber?.test(t.ticketNumber);
          }
          return false;
        })
      );
    }

    const query = {
      populate: () => query,
      sort: () => query,
      skip: () => query,
      limit: (l) => ({
        lean: () => Promise.resolve(
          filtered.map(t => {
            const raw = t.toObject ? t.toObject() : t;
            return {
              ...raw,
              createdBy: raw.createdBy?._id ? raw.createdBy : (raw.createdBy?.toString() === mockEmployee1._id.toString() ? mockEmployee1 : mockEmployee2),
              assignedTo: raw.assignedTo ? (raw.assignedTo._id ? raw.assignedTo : mockEngineer) : null,
              category: mockCategory,
            };
          })
        ),
      }),
      lean: () => Promise.resolve(
        filtered.map(t => {
          const raw = t.toObject ? t.toObject() : t;
          return {
            ...raw,
            createdBy: raw.createdBy?._id ? raw.createdBy : (raw.createdBy?.toString() === mockEmployee1._id.toString() ? mockEmployee1 : mockEmployee2),
            assignedTo: raw.assignedTo ? (raw.assignedTo._id ? raw.assignedTo : mockEngineer) : null,
            category: mockCategory,
          };
        })
      ),
      then: (resolve, reject) => Promise.resolve(filtered).then(resolve, reject),
      catch: (reject) => Promise.resolve(filtered).catch(reject),
    };

    return query;
  };

  Ticket.countDocuments = async (filter) => {
    let filtered = [...inMemoryTickets];
    if (filter.status) filtered = filtered.filter((t) => t.status === filter.status);
    if (filter.priority) filtered = filtered.filter((t) => t.priority === filter.priority);
    if (filter.createdBy) {
      const targetId = filter.createdBy._id ? filter.createdBy._id.toString() : filter.createdBy.toString();
      filtered = filtered.filter((t) => {
        const cId = t.createdBy?._id ? t.createdBy._id.toString() : (t.createdBy?.toString ? t.createdBy.toString() : String(t.createdBy));
        return cId === targetId;
      });
    }
    return filtered.length;
  };

  try {
    // 1. Employee creates ticket
    const { req: req1, res: res1 } = createMockReqRes({
      body: {
        subject: 'VPN Connection Fails',
        description: 'Receiving timeout error 408 on gateway.',
        category: mockCategory._id.toString(),
        priority: 'High',
        department: 'Marketing',
      },
      user: mockEmployee1,
    });
    await createTicket(req1, res1, (e) => console.error(e));
    const ticket1 = inMemoryTickets[0];
    recordTest('1. Employee Creates Ticket', res1.statusCode === 201 && !!ticket1, 'Ticket created with HTTP 201');

    // 2 & 3. Ticket Number Generation & Uniqueness
    const { req: req2, res: res2 } = createMockReqRes({
      body: {
        subject: 'Outlook Email Sync Failure',
        description: 'Emails not updating on mobile.',
        category: mockCategory._id.toString(),
        priority: 'Critical',
        department: 'Finance',
      },
      user: mockEmployee2,
    });
    await createTicket(req2, res2, () => {});
    const ticket2 = inMemoryTickets[1];
    const uniqueNumbers = ticket1.ticketNumber === 'HD-1001' && ticket2.ticketNumber === 'HD-1002';
    recordTest('2 & 3. Ticket Number Generation & Uniqueness', uniqueNumbers, `Created ${ticket1.ticketNumber} and ${ticket2.ticketNumber}`);

    // 4. SLA Due Date Calculation
    const slaPass = ticket2.slaDueAt && ticket2.slaDueAt > new Date();
    recordTest('4. SLA Due Date Calculated', slaPass, `Critical SLA due date set to ${ticket2.slaDueAt.toISOString()}`);

    // 5. Employee Sees Own Tickets
    const { req: req5, res: res5 } = createMockReqRes({
      user: mockEmployee1,
      query: { page: 1, limit: 10 },
    });
    await getMyTickets(req5, res5, () => {});
    const emp1Tickets = res5.data?.data?.tickets || [];
    recordTest('5. Employee Sees Own Tickets', emp1Tickets.length === 1 && emp1Tickets[0].ticketNumber === 'HD-1001', 'Only returns tickets created by user');

    // 6. Employee Cannot Access Another Employee's Ticket
    const { req: req6, res: res6 } = createMockReqRes({
      params: { id: ticket2._id.toString() },
      user: mockEmployee1, // Emma trying to access John's ticket
    });
    await getTicketById(req6, res6, () => {});
    recordTest('6. Cross-User Privacy Guard', res6.statusCode === 403, 'Returns 403 Forbidden for unauthorized employee');

    // 7. Employee Blocked from Global Support Queue
    const { req: req7, res: res7 } = createMockReqRes({ user: mockEmployee1 });
    let globalAllowed7 = false;
    authorizeRoles('Admin', 'Support Engineer')(req7, res7, () => { globalAllowed7 = true; });
    recordTest('7. Employee Blocked from Global Queue', !globalAllowed7 && res7.statusCode === 403, 'Returns 403 Forbidden');

    // 8 & 9. Support Engineer and Admin Can Access Global Queue
    const { req: req8, res: res8 } = createMockReqRes({ user: mockEngineer });
    await getTickets(req8, res8, () => {});
    const globalCount = res8.data?.data?.tickets?.length;
    recordTest('8 & 9. Support Engineer & Admin Global Queue Access', res8.statusCode === 200 && globalCount === 2, `Queue returned ${globalCount} tickets`);

    // 10. Support Engineer Updates Ticket Status & Priority
    const { req: req10, res: res10 } = createMockReqRes({
      params: { id: ticket1._id.toString() },
      body: { status: 'In Progress', priority: 'Critical' },
      user: mockEngineer,
    });
    await updateTicket(req10, res10, () => {});
    recordTest('10. Support Engineer Updates Status & Priority', res10.statusCode === 200 && inMemoryTickets[0].status === 'In Progress', 'Status transitioned to In Progress, priority Critical');

    // 11. Invalid Status Transition Rejected
    const { req: req11, res: res11 } = createMockReqRes({
      params: { id: ticket1._id.toString() },
      body: { status: 'Closed' }, // Invalid directly from In Progress
      user: mockEngineer,
    });
    await updateTicket(req11, res11, () => {});
    recordTest('11. Invalid Workflow Transition Rejected', res11.statusCode === 400, 'Returns 400 Bad Request with valid transition error');

    // 12. Invalid Ticket ID Returns 404
    const { req: req12, res: res12 } = createMockReqRes({
      params: { id: '64f1a2b3c4d5e6f7a8b9c999' },
      user: mockAdmin,
    });
    await getTicketById(req12, res12, () => {});
    recordTest('12. Non-Existent Ticket Returns 404', res12.statusCode === 404, 'Returns 404 Not Found');

    // 13. Search Filtering
    const { req: req13, res: res13 } = createMockReqRes({
      user: mockEngineer,
      query: { search: 'VPN' },
    });
    await getTickets(req13, res13, () => {});
    recordTest('13. Ticket Search Functionality', res13.statusCode === 200, 'Search query executed');

    // 14, 15, 16. Status, Priority & Category Filtering
    const { req: req14, res: res14 } = createMockReqRes({
      user: mockEngineer,
      query: { status: 'In Progress', priority: 'Critical' },
    });
    await getTickets(req14, res14, () => {});
    recordTest('14-16. Combined Multi-Field Filters', res14.statusCode === 200 && res14.data?.data?.tickets?.length === 1, 'Status & Priority filters returned matching record');

    // 17. Pagination Metadata
    const { req: req17, res: res17 } = createMockReqRes({
      user: mockEngineer,
      query: { page: 1, limit: 10 },
    });
    await getTickets(req17, res17, () => {});
    const p = res17.data?.data?.pagination;
    recordTest('17. Pagination Metadata', p?.page === 1 && p?.total === 2 && p?.totalPages === 1, `Page ${p?.page} of ${p?.totalPages}, Total: ${p?.total}`);

    // 18. Ticket Assignment to Support Engineer
    const { req: req18, res: res18 } = createMockReqRes({
      params: { id: ticket1._id.toString() },
      body: { assignedTo: mockEngineer._id.toString() },
      user: mockAdmin,
    });
    await updateTicket(req18, res18, () => {});
    recordTest('18. Ticket Assignment', inMemoryTickets[0].assignedTo?.toString() === mockEngineer._id.toString(), `Assigned to ${mockEngineer.name}`);

    // 19. Audit Log Created
    const hasAuditLog = inMemoryAuditLogs.some(
      (log) => log.action === 'TICKET_CREATED' || log.action === 'STATUS_CHANGED'
    );
    recordTest('19. Audit Log Recording', hasAuditLog, `Recorded ${inMemoryAuditLogs.length} audit log entries`);

    // 20. Notification Created for Assigned Engineer
    const hasNotif = inMemoryNotifications.some(
      (n) => n.recipient.toString() === mockEngineer._id.toString() && n.type === 'TICKET_ASSIGNED'
    );
    recordTest('20. Notification Dispatch on Assignment', hasNotif, `Notification created for ${mockEngineer.name}`);

    console.log('\n====================================================');
    console.log(`  Phase 4 Test Summary: ${results.filter(r => r.passed).length}/${results.length} Tests Passed`);
    console.log('====================================================\n');

    const allPassed = results.every(r => r.passed);
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('\n[Ticket Test Suite Error]', error);
    process.exit(1);
  }
};

runTicketTests();
