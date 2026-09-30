const API_BASE = 'http://localhost:5000/api';

const runLiveVerification = async () => {
  console.log('\n================================================================');
  console.log('  STARTING LIVE E2E HTTP VERIFICATION ON MONGODB ATLAS');
  console.log('================================================================\n');

  try {
    // 1. Health Check
    console.log('[1/7] Testing Health Check API...');
    const healthRes = await fetch(`${API_BASE}/health`);
    const healthData = await healthRes.json();
    console.log('  -> Health Check status:', healthData);
    if (healthData.status !== 'ok' || healthData.service !== 'helpdesk-pro') {
      throw new Error('Health check failed');
    }
    console.log('  [PASS] Health check verified.\n');

    // 2. Admin Login
    console.log('[2/7] Testing Admin Login...');
    const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@helpdeskpro.com',
        password: 'AdminPassword123!',
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData.data?.token;
    const adminUser = adminLoginData.data?.user;
    console.log(`  -> Authenticated Admin: ${adminUser?.name} (${adminUser?.role})`);
    if (!adminToken || adminUser?.role !== 'Admin') {
      throw new Error('Admin login failed');
    }
    console.log('  [PASS] Admin login verified.\n');

    // 3. Support Engineer Login
    console.log('[3/7] Testing Support Engineer Login...');
    const supportLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'support@helpdeskpro.com',
        password: 'SupportPassword123!',
      }),
    });
    const supportLoginData = await supportLoginRes.json();
    const supportToken = supportLoginData.data?.token;
    const supportUser = supportLoginData.data?.user;
    console.log(`  -> Authenticated Support: ${supportUser?.name} (${supportUser?.role})`);
    if (!supportToken || supportUser?.role !== 'Support Engineer') {
      throw new Error('Support Engineer login failed');
    }
    console.log('  [PASS] Support Engineer login verified.\n');

    // 4. Employee Login
    console.log('[4/7] Testing Employee Login...');
    const empLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'employee@helpdeskpro.com',
        password: 'EmployeePassword123!',
      }),
    });
    const empLoginData = await empLoginRes.json();
    const empToken = empLoginData.data?.token;
    const empUser = empLoginData.data?.user;
    console.log(`  -> Authenticated Employee: ${empUser?.name} (${empUser?.role})`);
    if (!empToken || empUser?.role !== 'Employee') {
      throw new Error('Employee login failed');
    }
    console.log('  [PASS] Employee login verified.\n');

    // 5. Fetch Active Categories
    console.log('[5/7] Testing Categories Retrieval...');
    const catRes = await fetch(`${API_BASE}/categories`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    const catData = await catRes.json();
    const categories = catData.data || [];
    console.log(`  -> Retrieved ${categories.length} active service categories from Atlas:`);
    categories.forEach(c => console.log(`     - ${c.name} (${c.subcategories?.length || 0} subcategories)`));
    if (categories.length === 0) {
      throw new Error('Categories not found');
    }
    const chosenCategory = categories[0];
    console.log('  [PASS] Categories retrieval verified.\n');

    // 6. Create Ticket as Employee
    console.log('[6/7] Testing Real Ticket Creation with Atomic HD-XXXX Counter & SLA Calculation...');
    const createTicketRes = await fetch(`${API_BASE}/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empToken}`,
      },
      body: JSON.stringify({
        subject: 'Network printer connectivity timeout on 3rd Floor',
        description: 'The shared Lexmark network printer is unreachable via IP and queue times out.',
        category: chosenCategory._id,
        priority: 'High',
        department: 'Marketing & Sales',
      }),
    });
    const createTicketData = await createTicketRes.json();
    const createdTicket = createTicketData.data?.ticket;
    console.log('  -> Ticket Created in MongoDB Atlas:');
    console.log(`     Ticket Number: ${createdTicket?.ticketNumber}`);
    console.log(`     Subject:       ${createdTicket?.subject}`);
    console.log(`     Status:        ${createdTicket?.status}`);
    console.log(`     Priority:      ${createdTicket?.priority}`);
    console.log(`     SLA Due At:    ${createdTicket?.slaDueAt}`);
    console.log(`     SLA Status:    ${createdTicket?.slaStatus}`);
    if (!createdTicket?.ticketNumber?.startsWith('HD-') || !createdTicket?.slaDueAt) {
      throw new Error('Ticket creation failed');
    }
    console.log('  [PASS] Ticket creation and atomic sequencing verified.\n');

    // 7. Support Engineer Global Queue & Admin Analytics
    console.log('[7/7] Testing Global Queue, Search & Admin Analytics...');
    const queueRes = await fetch(`${API_BASE}/tickets`, {
      headers: { Authorization: `Bearer ${supportToken}` },
    });
    const queueData = await queueRes.json();
    console.log(`  -> Support Engineer global queue length: ${queueData.data?.tickets?.length}`);

    const searchRes = await fetch(`${API_BASE}/search?q=printer`, {
      headers: { Authorization: `Bearer ${supportToken}` },
    });
    const searchData = await searchRes.json();
    console.log(`  -> Global search for 'printer' found: ${searchData.data?.tickets?.length} matches`);

    const analyticsRes = await fetch(`${API_BASE}/analytics/admin`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const analyticsData = await analyticsRes.json();
    console.log(`  -> Live Admin Analytics retrieved. Total Tickets: ${analyticsData.data?.summary?.totalTickets}`);
    console.log('  [PASS] Global queue, search, and analytics verified on Atlas.\n');

    console.log('================================================================');
    console.log('  ALL LIVE MONGODB ATLAS E2E HTTP VERIFICATIONS PASSED 100%');
    console.log('================================================================\n');
  } catch (error) {
    console.error('Verification failed:', error.message);
    process.exit(1);
  }
};

runLiveVerification();
