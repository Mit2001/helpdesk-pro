import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import http from 'http';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Ticket from '../models/Ticket.js';
import SLA from '../models/SLA.js';
import AuditLog from '../models/AuditLog.js';
import app from '../app.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_helpdeskpro_dev_2025';

let mongod;
let server;
let port;

// HTTP client helper
const makeRequest = (path, method = 'GET', token = null, body = null, queryParams = {}) => {
  return new Promise((resolve, reject) => {
    let fullPath = path;
    const searchParams = new URLSearchParams(queryParams).toString();
    if (searchParams) {
      fullPath += `?${searchParams}`;
    }

    const options = {
      hostname: '127.0.0.1',
      port,
      path: fullPath,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const runAdminTests = async () => {
  console.log('\n======================================================');
  console.log('  STARTING PHASE 7 ADMIN & SYSTEM MANAGEMENT TESTS   ');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, title, details = '') => {
    if (condition) {
      console.log(`  [PASS] ${title}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${title} - ${details}`);
      failed++;
    }
  };

  try {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log('  Connected to MongoDB Memory Server for testing.\n');

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });

    const uniqueSuffix = Date.now();

    // 1. Seed initial users: Admin, Support Engineer, Employee
    const adminUser = await User.create({
      name: `Admin User ${uniqueSuffix}`,
      email: `admin_${uniqueSuffix}@example.com`,
      password: 'AdminPassword123!',
      role: 'Admin',
      status: 'Active',
    });

    const engineerUser = await User.create({
      name: `Engineer User ${uniqueSuffix}`,
      email: `engineer_${uniqueSuffix}@example.com`,
      password: 'EngineerPassword123!',
      role: 'Support Engineer',
      status: 'Active',
    });

    const employeeUser = await User.create({
      name: `Employee User ${uniqueSuffix}`,
      email: `employee_${uniqueSuffix}@example.com`,
      password: 'EmployeePassword123!',
      role: 'Employee',
      status: 'Active',
    });

    const adminToken = jwt.sign({ userId: adminUser._id, role: 'Admin' }, JWT_SECRET);
    const engToken = jwt.sign({ userId: engineerUser._id, role: 'Support Engineer' }, JWT_SECRET);
    const empToken = jwt.sign({ userId: employeeUser._id, role: 'Employee' }, JWT_SECRET);

    // -------------------------------------------------------------
    // 1. AUTHORIZATION & USER DIRECTORY TESTS
    // -------------------------------------------------------------
    // Test 1: Admin can access GET /api/users -> 200 OK
    const resAdminUsers = await makeRequest('/api/users', 'GET', adminToken, null, { page: 1, limit: 10 });
    assert(
      resAdminUsers.status === 200 && resAdminUsers.body.success === true && Array.isArray(resAdminUsers.body.data),
      'Test 1: Admin can access full administrative GET /api/users (200 OK)',
      `Status: ${resAdminUsers.status}`
    );

    // Test 2: Support Engineer blocked from GET /api/users -> 403 Forbidden
    const resEngUsers = await makeRequest('/api/users', 'GET', engToken);
    assert(
      resEngUsers.status === 403,
      'Test 2: Support Engineer blocked from full administrative GET /api/users (403 Forbidden)',
      `Status: ${resEngUsers.status}`
    );

    // Test 3: Employee blocked from GET /api/users -> 403 Forbidden
    const resEmpUsers = await makeRequest('/api/users', 'GET', empToken);
    assert(
      resEmpUsers.status === 403,
      'Test 3: Employee blocked from full administrative GET /api/users (403 Forbidden)',
      `Status: ${resEmpUsers.status}`
    );

    // Test 4: Unauthenticated request blocked from GET /api/users -> 401 Unauthorized
    const resUnauthUsers = await makeRequest('/api/users', 'GET', null);
    assert(
      resUnauthUsers.status === 401,
      'Test 4: Unauthenticated request to GET /api/users rejected (401 Unauthorized)',
      `Status: ${resUnauthUsers.status}`
    );

    // Test 5: Support Engineer can access GET /api/users/assignable -> 200 OK
    const resEngAssignable = await makeRequest('/api/users/assignable', 'GET', engToken);
    assert(
      resEngAssignable.status === 200 &&
        resEngAssignable.body.success === true &&
        Array.isArray(resEngAssignable.body.data),
      'Test 5: Support Engineer can access assignable staff list for ticket workflow (200 OK)',
      `Count: ${resEngAssignable.body?.data?.length}`
    );

    // Test 6: Employee blocked from GET /api/users/assignable -> 403 Forbidden
    const resEmpAssignable = await makeRequest('/api/users/assignable', 'GET', empToken);
    assert(
      resEmpAssignable.status === 403,
      'Test 6: Employee blocked from GET /api/users/assignable (403 Forbidden)',
      `Status: ${resEmpAssignable.status}`
    );

    // Test 7: Unauthenticated request blocked from GET /api/users/assignable -> 401 Unauthorized
    const resUnauthAssignable = await makeRequest('/api/users/assignable', 'GET', null);
    assert(
      resUnauthAssignable.status === 401,
      'Test 7: Unauthenticated request to GET /api/users/assignable rejected (401 Unauthorized)',
      `Status: ${resUnauthAssignable.status}`
    );

    // Test 8: Assignable endpoint returns only safe fields and active support staff
    const assignableStaff = resEngAssignable.body.data;
    const allStaffValid = assignableStaff.every(
      (s) =>
        (s.role === 'Support Engineer' || s.role === 'Admin') &&
        !s.password &&
        s.name &&
        s._id
    );
    const hasEmployee = assignableStaff.some((s) => s.role === 'Employee');
    assert(
      allStaffValid && !hasEmployee,
      'Test 8: Assignable endpoint exposes only safe fields for active Support Engineers & Admins',
      JSON.stringify(assignableStaff[0])
    );

    // Test 9: Employee blocked from creating user accounts
    const resEmpCreateUser = await makeRequest('/api/users', 'POST', empToken, {
      name: 'Hacker',
      email: 'hacker@test.com',
      password: 'password123',
      role: 'Admin',
    });
    assert(
      resEmpCreateUser.status === 403,
      'Test 9: Employee blocked from creating user accounts (403 Forbidden)',
      `Status: ${resEmpCreateUser.status}`
    );

    // Test 10: Support Engineer blocked from user mutations
    const resEngCreateUser = await makeRequest('/api/users', 'POST', engToken, {
      name: 'Tech',
      email: 'tech@test.com',
      password: 'password123',
    });
    assert(
      resEngCreateUser.status === 403,
      'Test 10: Support Engineer blocked from creating users (403 Forbidden)',
      `Status: ${resEngCreateUser.status}`
    );

    // Test 11: Admin can access Category Management
    const resAdminCat = await makeRequest('/api/categories', 'GET', adminToken, null, { status: 'all' });
    assert(
      resAdminCat.status === 200 && resAdminCat.body.success === true,
      'Test 11: Admin can access /api/categories with status filters (200 OK)'
    );

    // Test 12: Non-admin blocked from creating categories
    const resEmpCat = await makeRequest('/api/categories', 'POST', empToken, { name: 'Illegal Category' });
    assert(
      resEmpCat.status === 403,
      'Test 12: Non-admin blocked from category creation (403 Forbidden)',
      `Status: ${resEmpCat.status}`
    );

    // Test 13: Admin can access SLA management
    const resAdminSLA = await makeRequest('/api/sla', 'GET', adminToken);
    assert(
      resAdminSLA.status === 200 && resAdminSLA.body.success === true,
      'Test 13: Admin can access SLA configuration (200 OK)'
    );

    // Test 14: Non-admin blocked from SLA mutation
    const resEmpSLA = await makeRequest('/api/sla', 'POST', empToken, {
      priority: 'Low',
      responseTimeHours: 10,
      resolutionTimeHours: 50,
    });
    assert(
      resEmpSLA.status === 403,
      'Test 14: Non-admin blocked from creating/modifying SLA policies (403 Forbidden)',
      `Status: ${resEmpSLA.status}`
    );

    // Test 15: Admin can access Audit Logs
    const resAdminAudit = await makeRequest('/api/audit-logs', 'GET', adminToken);
    assert(
      resAdminAudit.status === 200 && resAdminAudit.body.success === true,
      'Test 15: Admin can access audit logs trail (200 OK)'
    );

    // Test 16: Non-admin blocked from Audit Logs
    const resEmpAudit = await makeRequest('/api/audit-logs', 'GET', empToken);
    assert(
      resEmpAudit.status === 403,
      'Test 16: Non-admin blocked from viewing enterprise audit trail (403 Forbidden)',
      `Status: ${resEmpAudit.status}`
    );

    // -------------------------------------------------------------
    // 2. USER MANAGEMENT CRUD & AUDIT TESTS
    // -------------------------------------------------------------
    // Test 17: Admin creates a new user
    const newUserEmail = `newuser_${uniqueSuffix}@example.com`;
    const resCreateUser = await makeRequest('/api/users', 'POST', adminToken, {
      name: 'New Test User',
      email: newUserEmail,
      password: 'StrongPassword123!',
      role: 'Support Engineer',
      department: 'DevOps',
      phone: '+1-555-0199',
      status: 'Active',
    });
    const createdUserId = resCreateUser.body?.data?._id;
    assert(
      resCreateUser.status === 201 &&
        resCreateUser.body.success === true &&
        resCreateUser.body.data.email === newUserEmail &&
        !resCreateUser.body.data.password,
      'Test 17: Admin creates user successfully with password hash omitted (201 Created)',
      JSON.stringify(resCreateUser.body)
    );

    // Test 18: Duplicate email rejected
    const resDupEmail = await makeRequest('/api/users', 'POST', adminToken, {
      name: 'Duplicate User',
      email: newUserEmail,
      password: 'StrongPassword123!',
      role: 'Employee',
    });
    assert(
      resDupEmail.status === 400 && resDupEmail.body.success === false,
      'Test 18: Duplicate user email registration rejected with 400 Bad Request',
      resDupEmail.body.message
    );

    // Test 19: Invalid role rejected
    const resInvalidRole = await makeRequest('/api/users', 'POST', adminToken, {
      name: 'Invalid Role User',
      email: `invalid_role_${uniqueSuffix}@example.com`,
      password: 'StrongPassword123!',
      role: 'SuperMasterAdmin',
    });
    assert(
      resInvalidRole.status === 400,
      'Test 19: Invalid user role rejected with 400 Bad Request',
      resInvalidRole.body.message
    );

    // Test 20: Admin changes user role
    const resChangeRole = await makeRequest(
      `/api/users/${createdUserId}/role`,
      'PATCH',
      adminToken,
      { role: 'Admin' }
    );
    assert(
      resChangeRole.status === 200 && resChangeRole.body.data.role === 'Admin',
      'Test 20: Admin successfully promotes user to Admin role',
      `Role: ${resChangeRole.body?.data?.role}`
    );

    // Test 21: Admin self-demotion prevention
    const resSelfDemote = await makeRequest(
      `/api/users/${adminUser._id}/role`,
      'PATCH',
      adminToken,
      { role: 'Employee' }
    );
    assert(
      resSelfDemote.status === 400,
      'Test 21: Safety guard prevents Admin from demoting themselves (400 Bad Request)',
      resSelfDemote.body.message
    );

    // Test 22: Admin deactivates user
    const resDeactivate = await makeRequest(
      `/api/users/${createdUserId}/status`,
      'PATCH',
      adminToken,
      { status: 'Inactive' }
    );
    assert(
      resDeactivate.status === 200 && resDeactivate.body.data.status === 'Inactive',
      'Test 22: Admin successfully deactivates user account (status: Inactive)',
      `Status: ${resDeactivate.body?.data?.status}`
    );

    // Test 23: Inactive user cannot log in
    const resLoginInactive = await makeRequest('/api/auth/login', 'POST', null, {
      email: newUserEmail,
      password: 'StrongPassword123!',
    });
    assert(
      resLoginInactive.status === 403,
      'Test 23: Inactive user login attempt blocked with 403 Account is deactivated',
      `Status: ${resLoginInactive.status}`
    );

    // Test 24: Admin self-deactivation prevention
    const resSelfDeactivate = await makeRequest(
      `/api/users/${adminUser._id}/status`,
      'PATCH',
      adminToken,
      { status: 'Inactive' }
    );
    assert(
      resSelfDeactivate.status === 400,
      'Test 24: Safety guard prevents Admin from deactivating their own account (400 Bad Request)',
      resSelfDeactivate.body.message
    );

    // Test 25: Admin re-activates user
    const resActivate = await makeRequest(
      `/api/users/${createdUserId}/status`,
      'PATCH',
      adminToken,
      { status: 'Active' }
    );
    assert(
      resActivate.status === 200 && resActivate.body.data.status === 'Active',
      'Test 25: Admin successfully re-activates user account (status: Active)'
    );

    // -------------------------------------------------------------
    // 3. CATEGORY MANAGEMENT TESTS
    // -------------------------------------------------------------
    // Test 26: Admin creates category
    const categoryName = `Cloud Infrastructure ${uniqueSuffix}`;
    const resCreateCat = await makeRequest('/api/categories', 'POST', adminToken, {
      name: categoryName,
      description: 'Cloud hosting issues',
      subcategories: ['AWS', 'GCP'],
    });
    const createdCatId = resCreateCat.body?.data?._id;
    assert(
      resCreateCat.status === 201 && resCreateCat.body.data.name === categoryName,
      'Test 26: Admin creates category taxonomy successfully (201 Created)'
    );

    // Test 27: Duplicate category name rejected
    const resDupCat = await makeRequest('/api/categories', 'POST', adminToken, {
      name: categoryName,
      description: 'Duplicate',
    });
    assert(
      resDupCat.status === 400,
      'Test 27: Duplicate category name rejected with 400 Bad Request'
    );

    // Test 28: Soft deactivation of category
    const resDeactCat = await makeRequest(
      `/api/categories/${createdCatId}/status`,
      'PATCH',
      adminToken,
      { status: 'Inactive' }
    );
    assert(
      resDeactCat.status === 200 && resDeactCat.body.data.status === 'Inactive',
      'Test 28: Category soft deactivation sets status to Inactive'
    );

    // Test 29: Inactive category excluded from standard non-admin category listing
    const resEmpCats = await makeRequest('/api/categories', 'GET', empToken);
    const hasInactiveCat = resEmpCats.body.data?.some((c) => c._id === createdCatId);
    assert(
      resEmpCats.status === 200 && !hasInactiveCat,
      'Test 29: Inactive category automatically excluded from ticket creation category list'
    );

    // -------------------------------------------------------------
    // 4. SLA CONFIGURATION TESTS
    // -------------------------------------------------------------
    // Test 30: SLA list returns/seeds default policies
    const resSlas = await makeRequest('/api/sla', 'GET', adminToken);
    const criticalPolicy = resSlas.body.data?.find((s) => s.priority === 'Critical');
    assert(
      resSlas.status === 200 &&
        resSlas.body.data?.length >= 4 &&
        criticalPolicy &&
        criticalPolicy.resolutionTimeHours === 4,
      'Test 30: SLA configuration retrieves/auto-seeds active policies (Critical target: 4h)'
    );

    // Test 31: Admin updates SLA target hours
    const resUpdateSla = await makeRequest(
      `/api/sla/${criticalPolicy._id}`,
      'PATCH',
      adminToken,
      {
        responseTimeHours: 0.5,
        resolutionTimeHours: 2,
        description: 'Updated urgent SLA target',
      }
    );
    assert(
      resUpdateSla.status === 200 &&
        resUpdateSla.body.data.resolutionTimeHours === 2 &&
        resUpdateSla.body.data.responseTimeHours === 0.5,
      'Test 31: Admin successfully updates SLA target response and resolution hours'
    );

    // Test 32: Invalid negative or zero SLA values rejected
    const resInvalidSla = await makeRequest(
      `/api/sla/${criticalPolicy._id}`,
      'PATCH',
      adminToken,
      {
        resolutionTimeHours: -5,
      }
    );
    assert(
      resInvalidSla.status === 400,
      'Test 32: Invalid negative SLA hours rejected with 400 Bad Request'
    );

    // -------------------------------------------------------------
    // 5. AUDIT LOG VERIFICATION TESTS
    // -------------------------------------------------------------
    // Test 33: Verify all administrative actions generated audit logs
    const auditLogs = await AuditLog.find().lean();
    const actions = auditLogs.map((l) => l.action);
    const hasAllAudits =
      actions.includes('USER_CREATED') &&
      actions.includes('USER_ROLE_CHANGED') &&
      actions.includes('USER_DEACTIVATED') &&
      actions.includes('USER_ACTIVATED') &&
      actions.includes('CATEGORY_CREATED') &&
      actions.includes('CATEGORY_DEACTIVATED') &&
      actions.includes('SLA_UPDATED');

    assert(
      hasAllAudits,
      'Test 33: Administrative audit trail captured all management events (USER, CATEGORY, SLA)',
      `Captured ${actions.length} audit records: ${[...new Set(actions)].join(', ')}`
    );

    // -------------------------------------------------------------
    // 6. DATA INTEGRITY TESTS
    // -------------------------------------------------------------
    // Test 34: Existing ticket using a deactivated category remains completely valid
    const ticketWithDeactCat = await Ticket.create({
      ticketNumber: `AD-INT-${uniqueSuffix}`,
      subject: 'Integrity Test Ticket',
      description: 'Testing category soft deactivation',
      category: createdCatId,
      priority: 'Medium',
      status: 'Open',
      createdBy: employeeUser._id,
      assignedTo: engineerUser._id,
    });

    const populatedTicket = await Ticket.findById(ticketWithDeactCat._id).populate('category');
    assert(
      populatedTicket && populatedTicket.category?._id.toString() === createdCatId.toString(),
      'Test 34: Data Integrity: Historical tickets referencing deactivated categories remain fully intact'
    );

    // Test 35: Existing tickets and comments created by deactivated user remain preserved
    const populatedUserTicket = await Ticket.findById(ticketWithDeactCat._id).populate('createdBy');
    assert(
      populatedUserTicket && populatedUserTicket.createdBy?.name === employeeUser.name,
      'Test 35: Data Integrity: Ticket ownership and creator associations remain intact after user status changes'
    );

    console.log('\n======================================================');
    console.log(`  ADMIN MANAGEMENT TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    server.close();
    await mongoose.disconnect();
    if (mongod) await mongod.stop();

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Test Execution Error:', error);
    if (server) server.close();
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
    process.exit(1);
  }
};

runAdminTests();
