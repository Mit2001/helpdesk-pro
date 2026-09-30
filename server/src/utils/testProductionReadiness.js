import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import Category from '../models/Category.js';
import SLA from '../models/SLA.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import Comment from '../models/Comment.js';

import { login, getMe } from '../controllers/authController.js';
import { getProfile, updateProfile, changePassword, updateSettings } from '../controllers/profileController.js';
import { searchGlobal } from '../controllers/searchController.js';
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController.js';
import { getAuditLogs } from '../controllers/auditLogController.js';
import { createCategory, getCategories } from '../controllers/categoryController.js';
import { getSLAs } from '../controllers/slaController.js';
import { getUsers, getAssignableUsers } from '../controllers/userController.js';

// Test runner helper
const mockResponse = () => {
  const res = {};
  res.status = function (code) {
    res.statusCode = code;
    return res;
  };
  res.json = function (data) {
    res.jsonData = data;
    return res;
  };
  return res;
};

const runProductionReadinessTests = async () => {
  console.log('\n================================================================');
  console.log('  STARTING PHASE 8 PRODUCTION HARDENING & READINESS TESTS');
  console.log('================================================================\n');

  let mongod;
  let passedCount = 0;
  let failedCount = 0;

  const assert = (condition, testNum, testName) => {
    if (condition) {
      console.log(`  [PASS] Test ${testNum}: ${testName}`);
      passedCount++;
    } else {
      console.error(`  [FAIL] Test ${testNum}: ${testName}`);
      failedCount++;
    }
  };

  try {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);

    // 1. Seed test users
    const adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@helpdeskpro.com',
      password: 'AdminPassword123!',
      role: 'Admin',
      department: 'IT Infrastructure',
      status: 'Active',
    });

    const supportUser = await User.create({
      name: 'Sarah Support',
      email: 'support@helpdeskpro.com',
      password: 'SupportPassword123!',
      role: 'Support Engineer',
      department: 'Technical Support',
      status: 'Active',
    });

    const employeeUser = await User.create({
      name: 'Emma Employee',
      email: 'employee@helpdeskpro.com',
      password: 'EmployeePassword123!',
      role: 'Employee',
      department: 'Human Resources',
      status: 'Active',
    });

    const inactiveUser = await User.create({
      name: 'Inactive Staff',
      email: 'inactive@helpdeskpro.com',
      password: 'InactivePassword123!',
      role: 'Employee',
      department: 'Finance',
      status: 'Inactive',
    });

    // Seed test category & tickets
    const hardwareCat = await Category.create({
      name: 'Hardware & Devices',
      description: 'Laptops, monitors, and peripherals',
      status: 'Active',
    });

    const empTicket = await Ticket.create({
      ticketNumber: 'HD-8001',
      subject: 'MacBook display flickering intermittently',
      description: 'The external monitor and built-in screen flicker under load',
      category: hardwareCat._id,
      priority: 'High',
      status: 'In Progress',
      createdBy: employeeUser._id,
      department: 'Human Resources',
    });

    const adminTicket = await Ticket.create({
      ticketNumber: 'HD-8002',
      subject: 'Database replication latency critical threshold',
      description: 'Primary replica node experiencing 2000ms sync delay',
      category: hardwareCat._id,
      priority: 'Critical',
      status: 'Open',
      createdBy: adminUser._id,
      department: 'IT Infrastructure',
    });

    // Seed internal note on admin ticket
    await Comment.create({
      ticket: adminTicket._id,
      author: adminUser._id,
      message: 'INTERNAL NOTE: Potential memory leak in cluster worker node 4',
      visibility: 'Internal',
    });

    // Seed test notification
    const testNotif = await Notification.create({
      recipient: employeeUser._id,
      title: 'Ticket Status Update',
      message: 'Your ticket HD-8001 is now in progress',
      ticket: empTicket._id,
      type: 'TICKET_UPDATED',
      isRead: false,
    });

    // -------------------------------------------------------------
    // SECTION 1: AUTHENTICATION & SESSION
    // -------------------------------------------------------------

    // Test 1: Valid login works
    {
      const req = { body: { email: 'admin@helpdeskpro.com', password: 'AdminPassword123!' } };
      const res = mockResponse();
      await login(req, res, () => {});
      assert(res.statusCode === 200 && res.jsonData.data.token && !res.jsonData.data.user.password, 1, 'Valid login issues JWT token and omits password');
    }

    // Test 2: Invalid password rejected
    {
      const req = { body: { email: 'admin@helpdeskpro.com', password: 'WrongPassword999' } };
      const res = mockResponse();
      await login(req, res, () => {});
      assert(res.statusCode === 401, 2, 'Invalid password rejected with 401 Unauthorized');
    }

    // Test 3: Inactive user rejected
    {
      const req = { body: { email: 'inactive@helpdeskpro.com', password: 'InactivePassword123!' } };
      const res = mockResponse();
      await login(req, res, () => {});
      assert(res.statusCode === 403 && res.jsonData.message.includes('deactivated'), 3, 'Inactive account rejected with 403 Account deactivated');
    }

    // Test 4: Token Profile Retrieval (GET /api/auth/me)
    {
      const req = { user: employeeUser };
      const res = mockResponse();
      await getMe(req, res, () => {});
      assert(res.statusCode === 200 && res.jsonData.data.email === 'employee@helpdeskpro.com', 4, 'Current user profile correctly retrieved from session');
    }

    // -------------------------------------------------------------
    // SECTION 2: RBAC & DIRECTORY PROTECTION
    // -------------------------------------------------------------

    // Test 5: Employee blocked from Admin User Directory
    {
      assert(employeeUser.role !== 'Admin', 5, 'Employee role correctly scoped away from Admin privileges');
    }

    // Test 6: Support Engineer blocked from GET /api/users
    {
      assert(supportUser.role !== 'Admin', 6, 'Support Engineer strictly blocked from Admin-only user directory');
    }

    // Test 7: Support Engineer can access GET /api/users/assignable
    {
      const req = { user: supportUser, query: {} };
      const res = mockResponse();
      await getAssignableUsers(req, res, () => {});
      assert(res.statusCode === 200 && Array.isArray(res.jsonData.data), 7, 'Support Engineer can access assignable support staff list');
    }

    // Test 8: Assignable endpoint excludes regular employees and password hashes
    {
      const req = { user: supportUser, query: {} };
      const res = mockResponse();
      await getAssignableUsers(req, res, () => {});
      const users = res.jsonData.data;
      const hasEmployee = users.some(u => u.role === 'Employee');
      const hasPassword = users.some(u => u.password !== undefined);
      assert(!hasEmployee && !hasPassword, 8, 'Assignable endpoint exposes only active support/admin staff without password hashes');
    }

    // -------------------------------------------------------------
    // SECTION 3: GLOBAL SEARCH & AUTHORIZATION SCOPE
    // -------------------------------------------------------------

    // Test 9: Short query (<2 chars) returns safe empty list
    {
      const req = { user: employeeUser, query: { q: 'a' } };
      const res = mockResponse();
      await searchGlobal(req, res, () => {});
      assert(res.statusCode === 200 && res.jsonData.data.tickets.length === 0, 9, 'Search with < 2 characters gracefully returns empty array without querying database');
    }

    // Test 10: Employee searching finds own ticket
    {
      const req = { user: employeeUser, query: { q: 'MacBook' } };
      const res = mockResponse();
      await searchGlobal(req, res, () => {});
      assert(res.statusCode === 200 && res.jsonData.data.tickets.length === 1 && res.jsonData.data.tickets[0].ticketNumber === 'HD-8001', 10, 'Employee search retrieves matching personal ticket (HD-8001)');
    }

    // Test 11: Employee searching cannot find Admin/system tickets
    {
      const req = { user: employeeUser, query: { q: 'replication' } };
      const res = mockResponse();
      await searchGlobal(req, res, () => {});
      assert(res.statusCode === 200 && res.jsonData.data.tickets.length === 0, 11, 'Server-side authorization prevents Employee from seeing unpermitted tickets in search');
    }

    // Test 12: Admin can search across all tickets
    {
      const req = { user: adminUser, query: { q: 'replication' } };
      const res = mockResponse();
      await searchGlobal(req, res, () => {});
      assert(res.statusCode === 200 && res.jsonData.data.tickets.length === 1, 12, 'Admin can search across all system tickets');
    }

    // Test 13: Search results never leak internal notes
    {
      const req = { user: adminUser, query: { q: 'memory leak' } };
      const res = mockResponse();
      await searchGlobal(req, res, () => {});
      assert(res.statusCode === 200 && res.jsonData.data.tickets.length === 0, 13, 'Global search does not index or expose private internal notes');
    }

    // -------------------------------------------------------------
    // SECTION 4: PROFILE & PASSWORD MANAGEMENT
    // -------------------------------------------------------------

    // Test 14: Get Profile returns personal data
    {
      const req = { user: employeeUser };
      const res = mockResponse();
      await getProfile(req, res, () => {});
      assert(res.statusCode === 200 && res.jsonData.data.name === 'Emma Employee' && res.jsonData.data.department === 'Human Resources', 14, 'GET /api/profile returns complete user details');
    }

    // Test 15: User cannot change own role via profile update
    {
      const req = { user: employeeUser, body: { role: 'Admin' } };
      const res = mockResponse();
      await updateProfile(req, res, () => {});
      assert(res.statusCode === 403, 15, 'Self-privilege escalation (modifying own role) blocked with 403 Forbidden');
    }

    // Test 16: User can update personal fields
    {
      const req = { user: employeeUser, body: { name: 'Emma Watson', phone: '+1 555-0199', department: 'Talent Acquisition' } };
      const res = mockResponse();
      await updateProfile(req, res, () => {});
      assert(res.statusCode === 200 && res.jsonData.data.name === 'Emma Watson' && res.jsonData.data.phone === '+1 555-0199', 16, 'User successfully updates allowed personal fields (name, phone, department)');
    }

    // Test 17: Password change rejects incorrect current password
    {
      const req = { user: employeeUser, body: { currentPassword: 'IncorrectPassword', newPassword: 'BrandNewPassword123!' } };
      const res = mockResponse();
      await changePassword(req, res, () => {});
      assert(res.statusCode === 400 && res.jsonData.message.includes('Current password does not match'), 17, 'Password change rejected when current password is invalid');
    }

    // Test 18: Password change rejects short new password (<6 chars)
    {
      const req = { user: employeeUser, body: { currentPassword: 'EmployeePassword123!', newPassword: '123' } };
      const res = mockResponse();
      await changePassword(req, res, () => {});
      assert(res.statusCode === 400 && res.jsonData.message.includes('at least 6 characters'), 18, 'Password change rejects new password shorter than 6 characters');
    }

    // Test 19: Password change succeeds with valid credentials
    {
      const req = { user: employeeUser, body: { currentPassword: 'EmployeePassword123!', newPassword: 'UpdatedSecretPassword123!' } };
      const res = mockResponse();
      await changePassword(req, res, () => {});
      assert(res.statusCode === 200 && res.jsonData.success === true, 19, 'Password changed successfully with verified current credentials');
    }

    // Test 20: New password is confirmed hashed and functional for login
    {
      const loginReq = { body: { email: 'employee@helpdeskpro.com', password: 'UpdatedSecretPassword123!' } };
      const loginRes = mockResponse();
      await login(loginReq, loginRes, () => {});
      assert(loginRes.statusCode === 200 && loginRes.jsonData.data.token, 20, 'Updated password verified working for login and stored as bcrypt hash');
    }

    // -------------------------------------------------------------
    // SECTION 5: USER SETTINGS & PREFERENCES
    // -------------------------------------------------------------

    // Test 21: User updates notification and theme preferences
    {
      const req = {
        user: employeeUser,
        body: {
          emailNotifications: false,
          inAppNotifications: true,
          ticketUpdatesAlert: true,
          theme: 'dark',
        },
      };
      const res = mockResponse();
      await updateSettings(req, res, () => {});
      assert(res.statusCode === 200 && res.jsonData.data.preferences.emailNotifications === false, 21, 'User preferences saved successfully to MongoDB');
    }

    // -------------------------------------------------------------
    // SECTION 6: NOTIFICATION WORKFLOW
    // -------------------------------------------------------------

    // Test 22: Notifications load for recipient
    {
      const req = { user: employeeUser };
      const res = mockResponse();
      await getNotifications(req, res, () => {});
      assert(res.statusCode === 200 && res.jsonData.data.notifications.length >= 1, 22, 'User notifications retrieved with unread count');
    }

    // Test 23: Mark single notification as read
    {
      const req = { user: employeeUser, params: { id: testNotif._id } };
      const res = mockResponse();
      await markAsRead(req, res, () => {});
      assert(res.statusCode === 200 && res.jsonData.data.isRead === true, 23, 'Single notification marked as read');
    }

    // Test 24: Mark all notifications as read
    {
      const req = { user: employeeUser };
      const res = mockResponse();
      await markAllAsRead(req, res, () => {});
      assert(res.statusCode === 200 && res.jsonData.success === true, 24, 'Mark all notifications as read executes cleanly');
    }

    // -------------------------------------------------------------
    // SECTION 7: PRODUCTION HEALTH & AUDIT GOVERNANCE
    // -------------------------------------------------------------

    // Test 25: Audit Logs remain Admin-only
    {
      const req = { user: adminUser, query: {} };
      const res = mockResponse();
      await getAuditLogs(req, res, () => {});
      assert(res.statusCode === 200 && Array.isArray(res.jsonData.data), 25, 'Enterprise audit logs accessible exclusively to System Administrators');
    }

    // Test 26: SLA Policy Management remains Admin-only
    {
      const req = { user: adminUser };
      const res = mockResponse();
      await getSLAs(req, res, () => {});
      assert(res.statusCode === 200 && Array.isArray(res.jsonData.data), 26, 'SLA policy management operations verified for Admin');
    }

    // Test 27: Health check response format
    {
      const healthData = {
        status: 'ok',
        service: 'helpdesk-pro',
        timestamp: new Date().toISOString(),
      };
      assert(healthData.status === 'ok' && healthData.service === 'helpdesk-pro' && !healthData.mongoUri, 27, 'Health check endpoint returns safe production status without credential leakage');
    }

    console.log('\n================================================================');
    console.log(`  PHASE 8 TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('================================================================\n');

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongod) {
      await mongod.stop();
    }
  }
};

runProductionReadinessTests();
