import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { login, getMe } from '../controllers/authController.js';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_jwt_key_helpdesk_2025';

// Mock Express req/res generator
const createMockReqRes = ({ body = {}, headers = {}, user = null } = {}) => {
  const req = {
    body,
    headers,
    user,
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

const runAuthTests = async () => {
  console.log('====================================================');
  console.log('  HelpDesk Pro - Phase 3: Auth & Security Test Suite');
  console.log('====================================================\n');

  const results = [];
  const recordTest = (name, passed, details = '') => {
    results.push({ name, passed, details });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${name} ${details ? `- ${details}` : ''}`);
  };

  // Mock User In-Memory DB Store for isolated deterministic testing
  const mockPasswordHash = await bcrypt.hash('CorrectPassword123!', 10);
  
  const mockUsers = [
    {
      _id: '64f1a2b3c4d5e6f7a8b9c001',
      name: 'Sarah Admin',
      email: 'admin@helpdeskpro.com',
      password: mockPasswordHash,
      role: 'Admin',
      department: 'IT Operations',
      status: 'Active',
      comparePassword: async function(candidate) {
        return bcrypt.compare(candidate, this.password);
      },
      save: async function() { return this; },
    },
    {
      _id: '64f1a2b3c4d5e6f7a8b9c002',
      name: 'Alex Support',
      email: 'support@helpdeskpro.com',
      password: mockPasswordHash,
      role: 'Support Engineer',
      department: 'Technical Support',
      status: 'Active',
      comparePassword: async function(candidate) {
        return bcrypt.compare(candidate, this.password);
      },
      save: async function() { return this; },
    },
    {
      _id: '64f1a2b3c4d5e6f7a8b9c003',
      name: 'Emma Employee',
      email: 'employee@helpdeskpro.com',
      password: mockPasswordHash,
      role: 'Employee',
      department: 'Marketing',
      status: 'Active',
      comparePassword: async function(candidate) {
        return bcrypt.compare(candidate, this.password);
      },
      save: async function() { return this; },
    },
    {
      _id: '64f1a2b3c4d5e6f7a8b9c004',
      name: 'Disabled User',
      email: 'disabled@helpdeskpro.com',
      password: mockPasswordHash,
      role: 'Employee',
      department: 'Sales',
      status: 'Inactive',
      comparePassword: async function(candidate) {
        return bcrypt.compare(candidate, this.password);
      },
      save: async function() { return this; },
    },
  ];

  // Intercept User.findOne and User.findById
  const originalFindOne = User.findOne;
  const originalFindById = User.findById;

  User.findOne = (query) => {
    const user = mockUsers.find(u => u.email === query.email);
    return {
      select: () => Promise.resolve(user || null),
    };
  };

  User.findById = (id) => {
    const user = mockUsers.find(u => u._id.toString() === id.toString());
    return {
      select: () => Promise.resolve(user || null),
    };
  };

  try {
    // 1. Valid Admin Login
    const { req: req1, res: res1 } = createMockReqRes({
      body: { email: 'admin@helpdeskpro.com', password: 'CorrectPassword123!' },
    });
    await login(req1, res1, () => {});
    const adminToken = res1.data?.data?.token;
    const adminRole = res1.data?.data?.user?.role;
    recordTest('1. Valid Admin Login', res1.statusCode === 200 && !!adminToken && adminRole === 'Admin', `JWT received for ${adminRole}`);

    // 2. Valid Support Engineer Login
    const { req: req2, res: res2 } = createMockReqRes({
      body: { email: 'support@helpdeskpro.com', password: 'CorrectPassword123!' },
    });
    await login(req2, res2, () => {});
    const supportToken = res2.data?.data?.token;
    recordTest('2. Valid Support Engineer Login', res2.statusCode === 200 && res2.data?.data?.user?.role === 'Support Engineer', 'Support Engineer authenticated');

    // 3. Valid Employee Login
    const { req: req3, res: res3 } = createMockReqRes({
      body: { email: 'employee@helpdeskpro.com', password: 'CorrectPassword123!' },
    });
    await login(req3, res3, () => {});
    const employeeToken = res3.data?.data?.token;
    recordTest('3. Valid Employee Login', res3.statusCode === 200 && res3.data?.data?.user?.role === 'Employee', 'Employee authenticated');

    // 4. Invalid Email (Non-existent user)
    const { req: req4, res: res4 } = createMockReqRes({
      body: { email: 'nonexistent@helpdeskpro.com', password: 'AnyPassword123!' },
    });
    await login(req4, res4, () => {});
    recordTest('4. Invalid Email Rejection', res4.statusCode === 401 && res4.data?.success === false, 'Returns 401 Invalid email or password');

    // 5. Invalid Password
    const { req: req5, res: res5 } = createMockReqRes({
      body: { email: 'admin@helpdeskpro.com', password: 'WrongPassword999!' },
    });
    await login(req5, res5, () => {});
    recordTest('5. Invalid Password Rejection', res5.statusCode === 401 && res5.data?.success === false, 'Returns 401 Invalid email or password');

    // 6. Inactive User Login
    const { req: req6, res: res6 } = createMockReqRes({
      body: { email: 'disabled@helpdeskpro.com', password: 'CorrectPassword123!' },
    });
    await login(req6, res6, () => {});
    recordTest('6. Deactivated Account Rejection', res6.statusCode === 403 && res6.data?.message.includes('deactivated'), 'Returns 403 Account deactivated');

    // 7. Missing JWT in authenticateToken middleware
    const { req: req7, res: res7 } = createMockReqRes();
    let nextCalled7 = false;
    await authenticateToken(req7, res7, () => { nextCalled7 = true; });
    recordTest('7. Missing JWT Rejection', res7.statusCode === 401 && !nextCalled7, 'Returns 401 Token required');

    // 8. Invalid / Tampered JWT
    const { req: req8, res: res8 } = createMockReqRes({
      headers: { authorization: 'Bearer invalid.tampered.token' },
    });
    let nextCalled8 = false;
    await authenticateToken(req8, res8, () => { nextCalled8 = true; });
    recordTest('8. Tampered JWT Rejection', res8.statusCode === 401 && !nextCalled8, 'Returns 401 Invalid token');

    // 9. Expired JWT
    const expiredToken = jwt.sign(
      { userId: mockUsers[0]._id, role: 'Admin' },
      JWT_SECRET,
      { expiresIn: '0s' }
    );
    const { req: req9, res: res9 } = createMockReqRes({
      headers: { authorization: `Bearer ${expiredToken}` },
    });
    let nextCalled9 = false;
    await authenticateToken(req9, res9, () => { nextCalled9 = true; });
    recordTest('9. Expired JWT Rejection', res9.statusCode === 401 && res9.data?.message.includes('expired'), 'Returns 401 Session expired');

    // 10. GET /api/auth/me with Valid Token
    const { req: req10, res: res10 } = createMockReqRes({
      headers: { authorization: `Bearer ${adminToken}` },
    });
    await authenticateToken(req10, res10, async () => {
      await getMe(req10, res10, () => {});
    });
    recordTest('10. GET /api/auth/me with Valid Token', res10.statusCode === 200 && res10.data?.data?.email === 'admin@helpdeskpro.com', 'Returns current user profile');

    // 11. Password Hash Exposure Prevention
    const hasPasswordInMe = !!res10.data?.data?.password;
    const hasPasswordInLogin = !!res1.data?.data?.user?.password;
    recordTest('11. Password Hash Exclusion', !hasPasswordInMe && !hasPasswordInLogin, 'Passwords completely excluded from all API responses');

    // 12. Admin Authorization for Admin Resource
    const { req: req12, res: res12 } = createMockReqRes({ user: mockUsers[0] });
    let adminNext = false;
    authorizeRoles('Admin')(req12, res12, () => { adminNext = true; });
    recordTest('12. Admin Authorized on Admin Route', adminNext && res12.statusCode === 200, 'Admin permitted');

    // 13. Support Engineer Forbidden on Admin Resource
    const { req: req13, res: res13 } = createMockReqRes({ user: mockUsers[1] });
    let supportNext = false;
    authorizeRoles('Admin')(req13, res13, () => { supportNext = true; });
    recordTest('13. Support Engineer Blocked on Admin Route', !supportNext && res13.statusCode === 403, 'Returns 403 Forbidden');

    // 14. Support Engineer Authorized on Support Route
    const { req: req14, res: res14 } = createMockReqRes({ user: mockUsers[1] });
    let supportStaffNext = false;
    authorizeRoles('Admin', 'Support Engineer')(req14, res14, () => { supportStaffNext = true; });
    recordTest('14. Support Engineer Authorized on Support Queue', supportStaffNext && res14.statusCode === 200, 'Support Engineer permitted');

    // 15. Employee Forbidden on Support Queue
    const { req: req15, res: res15 } = createMockReqRes({ user: mockUsers[2] });
    let employeeStaffNext = false;
    authorizeRoles('Admin', 'Support Engineer')(req15, res15, () => { employeeStaffNext = true; });
    recordTest('15. Employee Blocked on Support Route', !employeeStaffNext && res15.statusCode === 403, 'Returns 403 Forbidden');

    // 16. Employee Authorized on Employee Route
    const { req: req16, res: res16 } = createMockReqRes({ user: mockUsers[2] });
    let employeeNext = false;
    authorizeRoles('Employee', 'Admin')(req16, res16, () => { employeeNext = true; });
    recordTest('16. Employee Authorized on Ticket Creation', employeeNext && res16.statusCode === 200, 'Employee permitted');

    // Restore original Mongoose model methods
    User.findOne = originalFindOne;
    User.findById = originalFindById;

    console.log('\n====================================================');
    console.log(`  Phase 3 Test Summary: ${results.filter(r => r.passed).length}/${results.length} Tests Passed`);
    console.log('====================================================\n');

    const allPassed = results.every(r => r.passed);
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('\n[Auth Test Suite Error]', error);
    process.exit(1);
  }
};

runAuthTests();
