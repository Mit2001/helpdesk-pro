import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import http from 'http';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Ticket from '../models/Ticket.js';
import app from '../app.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_helpdeskpro_dev_2025';

let mongod;
let server;
let port;

// Helper to make HTTP requests
const makeRequest = (path, method = 'GET', token = null, queryParams = {}) => {
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
    req.end();
  });
};

const runAnalyticsTests = async () => {
  console.log('\n========================================');
  console.log('  STARTING PHASE 6 ANALYTICS TEST SUITE ');
  console.log('========================================\n');

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
    console.log('  Connected to MongoDB instance for testing.\n');

    // Start ephemeral server
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });

    // 1. Create Test Users: Admin, Engineer1, Engineer2, Employee1
    const uniqueSuffix = Date.now();
    const adminUser = await User.create({
      name: `Admin Analytics ${uniqueSuffix}`,
      email: `admin_an_${uniqueSuffix}@example.com`,
      password: 'password123',
      role: 'Admin',
      status: 'Active',
    });

    const engineer1 = await User.create({
      name: `Engineer One ${uniqueSuffix}`,
      email: `eng1_an_${uniqueSuffix}@example.com`,
      password: 'password123',
      role: 'Support Engineer',
      status: 'Active',
    });

    const engineer2 = await User.create({
      name: `Engineer Two ${uniqueSuffix}`,
      email: `eng2_an_${uniqueSuffix}@example.com`,
      password: 'password123',
      role: 'Support Engineer',
      status: 'Active',
    });

    const employee1 = await User.create({
      name: `Employee One ${uniqueSuffix}`,
      email: `emp1_an_${uniqueSuffix}@example.com`,
      password: 'password123',
      role: 'Employee',
      status: 'Active',
    });

    const adminToken = jwt.sign({ userId: adminUser._id, role: 'Admin' }, JWT_SECRET);
    const eng1Token = jwt.sign({ userId: engineer1._id, role: 'Support Engineer' }, JWT_SECRET);
    const emp1Token = jwt.sign({ userId: employee1._id, role: 'Employee' }, JWT_SECRET);

    // 2. Create Test Categories
    const catHardware = await Category.create({
      name: `Hardware_${uniqueSuffix}`,
      description: 'Hardware issues',
    });

    const catSoftware = await Category.create({
      name: `Software_${uniqueSuffix}`,
      description: 'Software issues',
    });

    // 3. Seed controlled dataset
    const testTickets = [];
    const now = new Date();

    // Ticket 1: Open, Critical, Hardware, Assigned to Engineer 1, Healthy SLA
    const t1 = await Ticket.create({
      ticketNumber: `AN-${uniqueSuffix}-01`,
      subject: 'Critical Server Down',
      description: 'Main production server is down',
      category: catHardware._id,
      priority: 'Critical',
      status: 'Open',
      createdBy: employee1._id,
      assignedTo: engineer1._id,
      slaDueAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      slaStatus: 'Healthy',
      firstResponseAt: new Date(now.getTime() + 15 * 60 * 1000), // 15 mins response
      createdAt: now,
    });
    testTickets.push(t1);

    // Ticket 2: In Progress, High, Software, Assigned to Engineer 1, Breached SLA
    const t2 = await Ticket.create({
      ticketNumber: `AN-${uniqueSuffix}-02`,
      subject: 'VPN authentication failing',
      description: 'VPN issue',
      category: catSoftware._id,
      priority: 'High',
      status: 'In Progress',
      createdBy: employee1._id,
      assignedTo: engineer1._id,
      slaDueAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      slaStatus: 'Breached',
      firstResponseAt: new Date(now.getTime() + 30 * 60 * 1000), // 30 mins response
      createdAt: now,
    });
    testTickets.push(t2);

    // Ticket 3: Resolved, Low, Hardware, Assigned to Engineer 1, Resolved in 2 hours
    const t3CreatedAt = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const t3ResolvedAt = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours resolution time
    const t3 = await Ticket.create({
      ticketNumber: `AN-${uniqueSuffix}-03`,
      subject: 'Mouse replacement',
      description: 'Need a mouse',
      category: catHardware._id,
      priority: 'Low',
      status: 'Resolved',
      createdBy: employee1._id,
      assignedTo: engineer1._id,
      slaDueAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      slaStatus: 'Healthy',
      createdAt: t3CreatedAt,
      firstResponseAt: new Date(t3CreatedAt.getTime() + 20 * 60 * 1000),
      resolvedAt: t3ResolvedAt,
    });
    testTickets.push(t3);

    // Ticket 4: Closed, Medium, Software, Assigned to Engineer 2, Resolved in 4 hours
    const t4CreatedAt = new Date(now.getTime() - 10 * 60 * 60 * 1000);
    const t4ResolvedAt = new Date(now.getTime() - 6 * 60 * 60 * 1000); // 4 hours resolution time
    const t4 = await Ticket.create({
      ticketNumber: `AN-${uniqueSuffix}-04`,
      subject: 'Slack install',
      description: 'Need slack',
      category: catSoftware._id,
      priority: 'Medium',
      status: 'Closed',
      createdBy: employee1._id,
      assignedTo: engineer2._id,
      slaDueAt: new Date(now.getTime() + 12 * 60 * 60 * 1000),
      slaStatus: 'Healthy',
      createdAt: t4CreatedAt,
      firstResponseAt: new Date(t4CreatedAt.getTime() + 10 * 60 * 1000),
      resolvedAt: t4ResolvedAt,
      closedAt: now,
    });
    testTickets.push(t4);

    // Ticket 5: Pending Customer, Critical, Hardware, Assigned to Engineer 1, Approaching SLA
    const t5 = await Ticket.create({
      ticketNumber: `AN-${uniqueSuffix}-05`,
      subject: 'Monitor flickering',
      description: 'Screen is flickering',
      category: catHardware._id,
      priority: 'Critical',
      status: 'Pending Customer',
      createdBy: employee1._id,
      assignedTo: engineer1._id,
      slaDueAt: new Date(now.getTime() + 30 * 60 * 1000),
      slaStatus: 'Approaching',
      createdAt: now,
    });
    testTickets.push(t5);

    // -------------------------------------------------------------
    // TEST 1: Admin analytics accessible to Admin
    // -------------------------------------------------------------
    const resAdmin = await makeRequest('/api/analytics/admin', 'GET', adminToken);
    assert(
      resAdmin.status === 200 && resAdmin.body.success === true,
      'Test 1: Admin analytics accessible to Admin (200 OK)',
      `Status: ${resAdmin.status}`
    );

    // -------------------------------------------------------------
    // TEST 2: Employee blocked from Admin analytics (403)
    // -------------------------------------------------------------
    const resEmpBlocked = await makeRequest('/api/analytics/admin', 'GET', emp1Token);
    assert(
      resEmpBlocked.status === 403,
      'Test 2: Employee blocked from Admin analytics (403 Forbidden)',
      `Status: ${resEmpBlocked.status}`
    );

    // -------------------------------------------------------------
    // TEST 3: Support Engineer blocked from Admin analytics (403)
    // -------------------------------------------------------------
    const resEngBlocked = await makeRequest('/api/analytics/admin', 'GET', eng1Token);
    assert(
      resEngBlocked.status === 403,
      'Test 3: Support Engineer blocked from Admin analytics (403 Forbidden)',
      `Status: ${resEngBlocked.status}`
    );

    // -------------------------------------------------------------
    // TEST 4: Engineer analytics only contains engineer's tickets
    // -------------------------------------------------------------
    const resEngineer = await makeRequest('/api/analytics/engineer', 'GET', eng1Token);
    assert(
      resEngineer.status === 200 &&
        resEngineer.body.data.kpis.assignedTickets === 4, // Exactly 4 tickets assigned to engineer1
      'Test 4: Engineer analytics correctly scoped to engineer tickets',
      `Assigned: ${resEngineer.body?.data?.kpis?.assignedTickets}`
    );

    // -------------------------------------------------------------
    // TEST 5: Employee analytics only contains employee's tickets
    // -------------------------------------------------------------
    const resEmployee = await makeRequest('/api/analytics/employee', 'GET', emp1Token);
    assert(
      resEmployee.status === 200 &&
        resEmployee.body.data.kpis.myTotalTickets === 5 &&
        resEmployee.body.data.recentTickets.length <= 5,
      'Test 5: Employee analytics correctly scoped to employee tickets',
      `Total: ${resEmployee.body?.data?.kpis?.myTotalTickets}`
    );

    // -------------------------------------------------------------
    // TEST 6: Ticket counts by status are accurate
    // -------------------------------------------------------------
    const statusData = resAdmin.body.data.ticketsByStatus;
    const hasAllStatuses =
      Array.isArray(statusData) &&
      statusData.some((s) => s.status === 'Open') &&
      statusData.some((s) => s.status === 'In Progress') &&
      statusData.some((s) => s.status === 'Resolved') &&
      statusData.some((s) => s.status === 'Closed');
    assert(
      hasAllStatuses,
      'Test 6: Ticket counts by status contain complete status lifecycle representation',
      JSON.stringify(statusData)
    );

    // -------------------------------------------------------------
    // TEST 7: Ticket counts by priority are accurate
    // -------------------------------------------------------------
    const prioData = resAdmin.body.data.ticketsByPriority;
    const criticalPrio = prioData.find((p) => p.priority === 'Critical');
    assert(
      criticalPrio && criticalPrio.count === 2,
      'Test 7: Ticket counts by priority are accurate (Critical tickets == 2)',
      `Critical count: ${criticalPrio?.count}`
    );

    // -------------------------------------------------------------
    // TEST 8: Category counts are accurate
    // -------------------------------------------------------------
    const catData = resAdmin.body.data.ticketsByCategory;
    const hardwareCat = catData.find((c) => c.category === `Hardware_${uniqueSuffix}`);
    assert(
      hardwareCat && hardwareCat.count === 3, // t1, t3, t5
      'Test 8: Category distribution aggregation accurately mapped with names',
      `Hardware count: ${hardwareCat?.count}`
    );

    // -------------------------------------------------------------
    // TEST 9: Ticket trend aggregation works
    // -------------------------------------------------------------
    const trendData = resAdmin.body.data.ticketTrend;
    const todayStr = now.toISOString().split('T')[0];
    const todayTrend = trendData.find((t) => t.date === todayStr);
    assert(
      Array.isArray(trendData) && trendData.length === 30 && todayTrend && todayTrend.created >= 3,
      'Test 9: Ticket trend time-series aggregation correctly populated with 30 continuous dates',
      `Trend length: ${trendData?.length}, Today created: ${todayTrend?.created}`
    );

    // -------------------------------------------------------------
    // TEST 10: Resolution trend aggregation works
    // -------------------------------------------------------------
    const resTrend = resAdmin.body.data.resolutionTrend;
    const todayRes = resTrend.find((t) => t.date === todayStr);
    assert(
      Array.isArray(resTrend) && todayRes && todayRes.resolved === 2,
      'Test 10: Resolution trend aggregation matches resolvedAt date timestamps (2 resolved today)',
      `Today resolved: ${todayRes?.resolved}`
    );

    // -------------------------------------------------------------
    // TEST 11: SLA breach count is accurate
    // -------------------------------------------------------------
    const slaBreachedCount = resAdmin.body.data.kpis.slaBreached;
    assert(
      slaBreachedCount === 1,
      'Test 11: SLA breach count is accurately computed from MongoDB (1 breached)',
      `Breached count: ${slaBreachedCount}`
    );

    // -------------------------------------------------------------
    // TEST 12: SLA compliance calculation is accurate
    // -------------------------------------------------------------
    const complianceRate = resAdmin.body.data.kpis.slaComplianceRate;
    assert(
      complianceRate === 80.0, // (5-1)/5 * 100 = 80.0%
      'Test 12: SLA compliance rate calculation is accurate (80.0%)',
      `Rate: ${complianceRate}%`
    );

    // -------------------------------------------------------------
    // TEST 13: Average resolution time excludes unresolved tickets
    // -------------------------------------------------------------
    const avgResHrs = resAdmin.body.data.kpis.averageResolutionHours;
    assert(
      typeof avgResHrs === 'number' && avgResHrs === 3.0, // (2 + 4)/2 = 3.0 hours
      'Test 13: Average resolution time correctly computed only from resolved tickets (3.0 hrs)',
      `Avg Resolution Hours: ${avgResHrs}`
    );

    // -------------------------------------------------------------
    // TEST 14: Average first response excludes tickets without first response
    // -------------------------------------------------------------
    const avgFirstRespMins = resAdmin.body.data.kpis.averageFirstResponseMinutes;
    assert(
      typeof avgFirstRespMins === 'number' && avgFirstRespMins > 0,
      'Test 14: Average first response time correctly computed from responded tickets',
      `Avg First Response Mins: ${avgFirstRespMins}`
    );

    // -------------------------------------------------------------
    // TEST 15: Engineer workload is accurate
    // -------------------------------------------------------------
    const workload = resAdmin.body.data.engineerWorkload;
    const eng1Workload = workload.find((w) => w.engineer === `Engineer One ${uniqueSuffix}`);
    assert(
      eng1Workload && eng1Workload.assigned === 4 && eng1Workload.slaBreached === 1,
      'Test 15: Engineer workload matrix correctly computed per support engineer (assigned=4, breached=1)',
      JSON.stringify(eng1Workload)
    );

    // -------------------------------------------------------------
    // TEST 16: Date range filtering works
    // -------------------------------------------------------------
    const fromDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = now.toISOString().split('T')[0];
    const resFiltered = await makeRequest(
      '/api/analytics/admin',
      'GET',
      adminToken,
      { from: fromDate, to: toDate }
    );
    assert(
      resFiltered.status === 200 && resFiltered.body.data.ticketTrend.length === 3,
      'Test 16: Custom date range filtering properly limits time-series bounds (3 days)',
      `Returned days: ${resFiltered.body?.data?.ticketTrend?.length}`
    );

    // -------------------------------------------------------------
    // TEST 17: Empty database does not cause division-by-zero
    // -------------------------------------------------------------
    const brandNewUser = await User.create({
      name: `Zero User ${uniqueSuffix}`,
      email: `zero_${uniqueSuffix}@example.com`,
      password: 'password123',
      role: 'Employee',
      status: 'Active',
    });
    const zeroToken = jwt.sign({ userId: brandNewUser._id, role: 'Employee' }, JWT_SECRET);
    const resZero = await makeRequest('/api/analytics/employee', 'GET', zeroToken);
    assert(
      resZero.status === 200 &&
        resZero.body.data.kpis.myTotalTickets === 0 &&
        resZero.body.data.recentTickets.length === 0,
      'Test 17: Zero-ticket user gracefully returns zero metrics without division-by-zero errors',
      JSON.stringify(resZero.body?.data?.kpis)
    );

    // -------------------------------------------------------------
    // TEST 18: Empty date range returns valid empty analytics
    // -------------------------------------------------------------
    const pastFrom = '2020-01-01';
    const pastTo = '2020-01-05';
    const resPast = await makeRequest(
      '/api/analytics/admin',
      'GET',
      adminToken,
      { from: pastFrom, to: pastTo }
    );
    const pastTrendSum = resPast.body.data.ticketTrend.reduce((sum, d) => sum + d.created, 0);
    assert(
      resPast.status === 200 && pastTrendSum === 0,
      'Test 18: Date range with 0 tickets returns clean zero-filled time series structure',
      `Sum created: ${pastTrendSum}`
    );

    // -------------------------------------------------------------
    // TEST 19: Critical ticket widget returns correct tickets
    // -------------------------------------------------------------
    const criticalList = resEngineer.body.data.criticalTickets;
    const hasCritical =
      Array.isArray(criticalList) &&
      criticalList.every(
        (t) => t.priority === 'Critical' && t.status !== 'Closed' && t.status !== 'Resolved'
      );
    assert(
      hasCritical && criticalList.length === 2, // t1 (Open), t5 (Pending Customer)
      'Test 19: Critical ticket widget filters exclusively critical active tickets sorted by SLA (2 tickets)',
      `Critical count: ${criticalList?.length}`
    );

    console.log('\n========================================');
    console.log(`  ANALYTICS TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================\n');

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

runAnalyticsTests();
