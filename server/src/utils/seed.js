import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import SLA from '../models/SLA.js';
import Counter from '../models/Counter.js';
import { seedUsers } from '../seed/seedUsers.js';
import { seedCategories } from '../seed/seedCategories.js';

dotenv.config();

const DEFAULT_SLA_POLICIES = [
  {
    priority: 'Low',
    responseTimeHours: 12,
    resolutionTimeHours: 48,
    description: 'Non-urgent requests, general inquiries and cosmetic issues.',
    status: 'Active',
  },
  {
    priority: 'Medium',
    responseTimeHours: 6,
    resolutionTimeHours: 24,
    description: 'Standard technical requests, single user workflow interruptions.',
    status: 'Active',
  },
  {
    priority: 'High',
    responseTimeHours: 2,
    resolutionTimeHours: 8,
    description: 'Critical business functions degraded, multiple users affected.',
    status: 'Active',
  },
  {
    priority: 'Critical',
    responseTimeHours: 1,
    resolutionTimeHours: 4,
    description: 'Complete system outage, security breach, production down.',
    status: 'Active',
  },
];

const seedSlaPolicies = async () => {
  console.log('[Seed] Seeding default SLA policies...');
  for (const policy of DEFAULT_SLA_POLICIES) {
    const existing = await SLA.findOne({ priority: policy.priority });
    if (!existing) {
      const newPolicy = new SLA(policy);
      await newPolicy.save();
      console.log(`[Seed] Created SLA policy: ${policy.priority}`);
    } else {
      existing.responseTimeHours = policy.responseTimeHours;
      existing.resolutionTimeHours = policy.resolutionTimeHours;
      existing.description = policy.description;
      existing.status = policy.status;
      await existing.save();
      console.log(`[Seed] Updated SLA policy: ${policy.priority}`);
    }
  }
  console.log('[Seed] SLA policies successfully seeded.\n');
};

const seedCounter = async () => {
  console.log('[Seed] Initializing atomic ticket counter...');
  const existing = await Counter.findOne({ key: 'ticket' });
  if (!existing) {
    await Counter.create({ key: 'ticket', sequence: 1000 });
    console.log('[Seed] Counter initialized at sequence 1000');
  } else {
    console.log(`[Seed] Counter already exists with sequence ${existing.sequence}`);
  }
  console.log('[Seed] Counter check complete.\n');
};

const runAllSeeds = async () => {
  try {
    console.log('\n=================================================');
    console.log('  STARTING HELPDESK PRO IDEMPOTENT DATABASE SEED');
    console.log('=================================================\n');

    await connectDB();

    await seedUsers();
    await seedCategories();
    await seedSlaPolicies();
    await seedCounter();

    console.log('=================================================');
    console.log('  ALL SEED OPERATIONS COMPLETED SUCCESSFULLY');
    console.log('=================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]', error);
    process.exit(1);
  }
};

runAllSeeds();
