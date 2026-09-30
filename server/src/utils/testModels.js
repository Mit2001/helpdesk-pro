import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  User,
  Category,
  SLA,
  Ticket,
  Comment,
  Notification,
  AuditLog,
  Counter,
} from '../models/index.js';
import { generateTicketNumber } from './ticketNumber.js';
import { calculateSlaDueDate, evaluateSlaStatus } from './slaCalculator.js';

dotenv.config();

const runVerificationTests = async () => {
  console.log('====================================================');
  console.log('  HelpDesk Pro - Phase 2: Database Models Test Suite');
  console.log('====================================================\n');

  let mongoServer;
  let uri = process.env.MONGO_URI;

  try {
    try {
      // Try connecting to existing local or configured MongoDB instance with a short timeout
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
      console.log(`[DB Connected] ${mongoose.connection.host}`);
    } catch (localErr) {
      console.log('[DB Info] External MongoDB not active, starting embedded in-memory MongoDB engine for test suite...');
      mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
      await mongoose.connect(uri);
      console.log(`[DB Connected] Embedded MongoMemoryServer connected at: ${uri}\n`);
    }

    const results = [];
    const recordTest = (name, passed, details = '') => {
      results.push({ name, passed, details });
      console.log(`[${passed ? 'PASS' : 'FAIL'}] ${name} ${details ? `- ${details}` : ''}`);
    };

    // 1. User Creation & Validation
    const testEmail = `test_admin_${Date.now()}@helpdeskpro.com`;
    const user = new User({
      name: 'Test Administrator',
      email: testEmail,
      password: 'AdminSecurePassword123!',
      role: 'Admin',
      department: 'IT Support',
    });
    await user.save();
    recordTest('1. User Creation', !!user._id, `Created user with ID: ${user._id}`);

    // 2. Password Hashing Verification
    const rawFetchedUser = await User.findById(user._id).select('+password');
    const isHashed = rawFetchedUser.password.startsWith('$2') && rawFetchedUser.password !== 'AdminSecurePassword123!';
    recordTest('2. Password Hashing', isHashed, 'Password properly hashed with bcrypt');

    // 3. Password Comparison Method
    const isMatch = await rawFetchedUser.comparePassword('AdminSecurePassword123!');
    const isWrongMatch = await rawFetchedUser.comparePassword('WrongPassword');
    recordTest('3. Password Comparison', isMatch && !isWrongMatch, 'Validates true on correct and false on incorrect');

    // 4. Duplicate Email Rejection
    let duplicateRejected = false;
    try {
      const dupUser = new User({
        name: 'Duplicate Admin',
        email: testEmail,
        password: 'AnotherPassword123!',
      });
      await dupUser.save();
    } catch (err) {
      duplicateRejected = err.code === 11000 || err.name === 'MongoServerError';
    }
    recordTest('4. Duplicate Email Rejection', duplicateRejected, 'E11000 duplicate key caught');

    // 5. Category Creation with Subcategories
    const category = new Category({
      name: `Infrastructure_${Date.now()}`,
      description: 'Network and Server infrastructure',
      subcategories: [
        { name: 'VPN Access', description: 'Remote access connectivity' },
        { name: 'DNS / IP Routing', description: 'Domain and routing issues' },
      ],
      createdBy: user._id,
    });
    await category.save();
    recordTest('5. Category & Subcategories', !!category._id && category.subcategories.length === 2, `Category: ${category.name}`);

    // 6. SLA Policies Creation
    const slaPolicy = await SLA.findOneAndUpdate(
      { priority: 'Critical' },
      {
        priority: 'Critical',
        responseTimeHours: 0.5,
        resolutionTimeHours: 4,
        description: 'Critical enterprise priority SLA',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    recordTest('6. SLA Policy Creation', slaPolicy.resolutionTimeHours === 4, 'Critical priority = 4h resolution');

    // 7 & 8. Ticket Number Generation & Counter Atomicity
    const ticketNum1 = await generateTicketNumber();
    const ticketNum2 = await generateTicketNumber();
    const ticketNumbersValid = ticketNum1.startsWith('HD-') && ticketNum2.startsWith('HD-') && ticketNum1 !== ticketNum2;
    recordTest('7 & 8. Atomic Ticket Number Generation', ticketNumbersValid, `Generated: ${ticketNum1}, ${ticketNum2}`);

    // 9 & 10. Ticket Creation with User/Category References & SLA Due Calculation
    const calculatedDue = await calculateSlaDueDate('Critical');
    const ticket = new Ticket({
      ticketNumber: ticketNum1,
      subject: 'Critical production VPN gateway outage',
      description: 'Employees are unable to connect to the internal corporate VPN.',
      category: category._id,
      subcategory: 'VPN Access',
      priority: 'Critical',
      status: 'Open',
      createdBy: user._id,
      slaDueAt: calculatedDue,
      department: 'IT Support',
    });
    await ticket.save();
    recordTest('9 & 10. Ticket Model, References & SLA Due Date', !!ticket._id && ticket.slaDueAt > new Date(), `Ticket ${ticket.ticketNumber} due at ${ticket.slaDueAt.toISOString()}`);

    // 11 & 12. Comment Model: Public & Private Internal Notes
    const publicComment = new Comment({
      ticket: ticket._id,
      author: user._id,
      message: 'Investigating firewall routing tables now.',
      visibility: 'Public',
    });
    await publicComment.save();

    const internalNote = new Comment({
      ticket: ticket._id,
      author: user._id,
      message: 'Internal diagnosis: Core switch 3 restart required at 22:00.',
      visibility: 'Internal',
    });
    await internalNote.save();
    recordTest('11 & 12. Comments & Visibility Separation', publicComment.visibility === 'Public' && internalNote.visibility === 'Internal', 'Public comment and Internal note saved');

    // 13. Notification Model
    const notification = new Notification({
      recipient: user._id,
      type: 'TICKET_ASSIGNED',
      title: 'New High Priority Ticket Assigned',
      message: `You have been assigned to ticket ${ticket.ticketNumber}`,
      ticket: ticket._id,
    });
    await notification.save();
    recordTest('13. Notification Model & References', !!notification._id && !notification.isRead, `Type: ${notification.type}`);

    // 14. AuditLog Model
    const auditLog = new AuditLog({
      user: user._id,
      action: 'TICKET_CREATED',
      entityType: 'Ticket',
      entityId: ticket._id,
      description: `Created ticket ${ticket.ticketNumber}`,
      metadata: { priority: 'Critical', category: category.name },
      ipAddress: '127.0.0.1',
      userAgent: 'Node.js Test Suite',
    });
    await auditLog.save();
    recordTest('14. AuditLog Model', !!auditLog._id && auditLog.entityType === 'Ticket', `Logged action: ${auditLog.action}`);

    // 15. SLA Status Evaluation Utility
    const healthyStatus = evaluateSlaStatus(new Date(Date.now() + 10 * 3600 * 1000));
    const approachingStatus = evaluateSlaStatus(new Date(Date.now() + 1 * 3600 * 1000));
    const breachedStatus = evaluateSlaStatus(new Date(Date.now() - 1 * 3600 * 1000));
    const slaLogicValid = healthyStatus === 'Healthy' && approachingStatus === 'Approaching' && breachedStatus === 'Breached';
    recordTest('15. SLA Status Evaluator', slaLogicValid, `Evaluated: ${healthyStatus}, ${approachingStatus}, ${breachedStatus}`);

    // 16. Indexes Verification
    const ticketIndexes = await Ticket.collection.indexes();
    const userIndexes = await User.collection.indexes();
    const hasTicketCompound = ticketIndexes.some(idx => idx.name.includes('status_1_priority_1'));
    recordTest('16. MongoDB Indexes', hasTicketCompound && userIndexes.length > 1, `Verified ${ticketIndexes.length} ticket indexes, ${userIndexes.length} user indexes`);

    // Clean up test data generated during testing
    await User.findByIdAndDelete(user._id);
    await Category.findByIdAndDelete(category._id);
    await Ticket.findByIdAndDelete(ticket._id);
    await Comment.deleteMany({ ticket: ticket._id });
    await Notification.findByIdAndDelete(notification._id);
    await AuditLog.findByIdAndDelete(auditLog._id);
    console.log('\n[Cleanup] Test records cleaned up successfully.');

    const allPassed = results.every(r => r.passed);
    console.log('\n====================================================');
    console.log(`  Phase 2 Test Summary: ${results.filter(r => r.passed).length}/${results.length} Tests Passed`);
    console.log('====================================================\n');

    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('\n[Test Error]', error);
    await mongoose.disconnect().catch(() => {});
    if (mongoServer) {
      await mongoServer.stop().catch(() => {});
    }
    process.exit(1);
  }
};

runVerificationTests();
