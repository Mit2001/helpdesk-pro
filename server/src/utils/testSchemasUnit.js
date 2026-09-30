import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Category from '../models/Category.js';
import SLA from '../models/SLA.js';
import Ticket from '../models/Ticket.js';
import Comment from '../models/Comment.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import Counter from '../models/Counter.js';
import { evaluateSlaStatus } from './slaCalculator.js';

const runUnitSchemaTests = async () => {
  console.log('====================================================');
  console.log('  HelpDesk Pro - Phase 2: Schema & Model Unit Tests');
  console.log('====================================================\n');

  const results = [];
  const recordTest = (name, passed, details = '') => {
    results.push({ name, passed, details });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${name} ${details ? `- ${details}` : ''}`);
  };

  // 1. User Validation & Required Fields
  const validUser = new User({
    name: 'Sarah Connor',
    email: 'sarah@helpdeskpro.com',
    password: 'SecurePassword123!',
    role: 'Support Engineer',
    department: 'DevOps',
  });
  const userValidationError = validUser.validateSync();
  recordTest('1. User Schema Validation (Valid)', !userValidationError, 'Valid user schema passes validation');

  const invalidUser = new User({
    name: '',
    email: 'invalid-email-address',
    role: 'SuperMaster', // Invalid role
  });
  const invalidUserErr = invalidUser.validateSync();
  const hasNameErr = !!invalidUserErr?.errors?.name;
  const hasEmailErr = !!invalidUserErr?.errors?.email;
  const hasRoleErr = !!invalidUserErr?.errors?.role;
  recordTest('2. User Schema Validation (Invalid Constraints)', hasNameErr && hasEmailErr && hasRoleErr, 'Name, Email regex, and Role enum rejected properly');

  // 3. User Password Hash & Comparison
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('SecurePassword123!', salt);
  validUser.password = hashedPassword;
  const isMatch = await validUser.comparePassword('SecurePassword123!');
  const isWrongMatch = await validUser.comparePassword('WrongPassword');
  recordTest('3. User Password Comparison Method', isMatch && !isWrongMatch, 'comparePassword() accurately validates bcrypt hashes');

  // 4. Category Schema Validation
  const validCategory = new Category({
    name: 'Hardware & Infrastructure',
    description: 'Workstations, laptops, monitors, and peripherals',
    subcategories: [
      { name: 'Laptop Hardware Issue', description: 'Screen, keyboard, battery' },
      { name: 'Monitor & Peripherals', description: 'Monitors, docks, mice' },
    ],
  });
  const categoryValidationError = validCategory.validateSync();
  recordTest('4. Category & Subcategories Validation', !categoryValidationError && validCategory.subcategories.length === 2, 'Subcategory embedded schema valid');

  // 5. SLA Schema Validation & Enums
  const validSLA = new SLA({
    priority: 'Critical',
    responseTimeHours: 0.5,
    resolutionTimeHours: 4,
    description: 'Critical business outage SLA policy',
  });
  const slaValidationError = validSLA.validateSync();
  recordTest('5. SLA Schema Validation', !slaValidationError && validSLA.resolutionTimeHours === 4, 'Valid SLA policy schema');

  const invalidSLA = new SLA({
    priority: 'UltraUrgent', // Invalid enum
    responseTimeHours: -5,   // Negative
  });
  const invalidSLAErr = invalidSLA.validateSync();
  recordTest('6. SLA Invalid Constraints Rejected', !!invalidSLAErr?.errors?.priority && !!invalidSLAErr?.errors?.responseTimeHours, 'Enum and min value validated');

  // 7. Ticket Schema Validation
  const validTicket = new Ticket({
    ticketNumber: 'HD-1001',
    subject: 'Production Database Connection Timeout',
    description: 'Application server cannot reach the primary replica set.',
    category: validCategory._id,
    subcategory: 'Database Issue',
    priority: 'Critical',
    status: 'Open',
    createdBy: validUser._id,
    department: 'DevOps',
    slaDueAt: new Date(Date.now() + 4 * 3600 * 1000),
  });
  const ticketValidationError = validTicket.validateSync();
  recordTest('7. Ticket Schema Validation (Valid)', !ticketValidationError, `Ticket ${validTicket.ticketNumber} schema validated`);

  const invalidTicket = new Ticket({
    subject: '', // Required
    priority: 'SuperLow', // Invalid enum
    status: 'ArchivedForever', // Invalid status
  });
  const invalidTicketErr = invalidTicket.validateSync();
  recordTest('8. Ticket Invalid Enum & Required Validation', !!invalidTicketErr?.errors?.subject && !!invalidTicketErr?.errors?.priority && !!invalidTicketErr?.errors?.status, 'Subject, priority, and status constraints enforced');

  // 9. Comment Schema Validation (Public & Internal Visibility)
  const publicComment = new Comment({
    ticket: validTicket._id,
    author: validUser._id,
    message: 'We are rebooting the secondary replica.',
    visibility: 'Public',
  });
  const publicCommentErr = publicComment.validateSync();

  const internalComment = new Comment({
    ticket: validTicket._id,
    author: validUser._id,
    message: 'Root cause: AWS EBS IOPS quota reached.',
    visibility: 'Internal',
  });
  const internalCommentErr = internalComment.validateSync();
  recordTest('9. Comment Schema & Visibility', !publicCommentErr && !internalCommentErr && internalComment.visibility === 'Internal', 'Public and Internal note schemas validated');

  // 10. Notification Schema Validation & Types
  const validNotification = new Notification({
    recipient: validUser._id,
    type: 'TICKET_ASSIGNED',
    title: 'Ticket Assigned',
    message: 'You have been assigned ticket HD-1001',
    ticket: validTicket._id,
  });
  const notificationErr = validNotification.validateSync();
  recordTest('10. Notification Schema & Types', !notificationErr && validNotification.type === 'TICKET_ASSIGNED', 'Notification type validated');

  // 11. AuditLog Schema Validation
  const validAuditLog = new AuditLog({
    user: validUser._id,
    action: 'STATUS_CHANGED',
    entityType: 'Ticket',
    entityId: validTicket._id,
    description: 'Changed status from Open to In Progress',
    metadata: { oldStatus: 'Open', newStatus: 'In Progress' },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 Chrome',
  });
  const auditLogErr = validAuditLog.validateSync();
  recordTest('11. AuditLog Schema & Append-Only Format', !auditLogErr && validAuditLog.entityType === 'Ticket', 'Audit log schema validated');

  // 12. SLA Status Evaluation Utility Logic
  const healthy = evaluateSlaStatus(new Date(Date.now() + 8 * 3600 * 1000));
  const approaching = evaluateSlaStatus(new Date(Date.now() + 1 * 3600 * 1000));
  const breached = evaluateSlaStatus(new Date(Date.now() - 3600 * 1000));
  const slaStatusPass = healthy === 'Healthy' && approaching === 'Approaching' && breached === 'Breached';
  recordTest('12. SLA Status Calculation Function', slaStatusPass, `Calculates: ${healthy}, ${approaching}, ${breached}`);

  // 13. Index definitions presence
  const userIndexes = User.schema.indexes();
  const ticketIndexes = Ticket.schema.indexes();
  const commentIndexes = Comment.schema.indexes();
  const notificationIndexes = Notification.schema.indexes();
  const auditLogIndexes = AuditLog.schema.indexes();

  const hasTicketCompound = ticketIndexes.some(idx => idx[0].status && idx[0].priority);
  const hasNotifRecipient = notificationIndexes.some(idx => idx[0].recipient && idx[0].isRead);
  recordTest('13. Index Definitions on Schemas', hasTicketCompound && hasNotifRecipient && userIndexes.length > 0, `Configured ${ticketIndexes.length} ticket indexes, ${notificationIndexes.length} notification indexes`);

  console.log('\n====================================================');
  console.log(`  Unit Test Summary: ${results.filter(r => r.passed).length}/${results.length} Schema Tests Passed`);
  console.log('====================================================\n');

  const allPassed = results.every(r => r.passed);
  process.exit(allPassed ? 0 : 1);
};

runUnitSchemaTests();
