import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

dotenv.config();

export const DEMO_USERS = [
  {
    name: 'Sarah Jenkins (Admin)',
    email: 'admin@helpdeskpro.com',
    password: 'AdminPassword123!',
    role: 'Admin',
    department: 'IT Operations',
    phone: '+1 (555) 019-2834',
    status: 'Active',
  },
  {
    name: 'Alex Rivera (Support Lead)',
    email: 'support@helpdeskpro.com',
    password: 'SupportPassword123!',
    role: 'Support Engineer',
    department: 'Technical Support',
    phone: '+1 (555) 014-9821',
    status: 'Active',
  },
  {
    name: 'Emma Watson (Employee)',
    email: 'employee@helpdeskpro.com',
    password: 'EmployeePassword123!',
    role: 'Employee',
    department: 'Marketing & Sales',
    phone: '+1 (555) 018-7722',
    status: 'Active',
  },
];

export const seedUsers = async () => {
  console.log('[Seed] Seeding demo users...');
  
  for (const userData of DEMO_USERS) {
    const existing = await User.findOne({ email: userData.email });
    if (existing) {
      existing.name = userData.name;
      existing.role = userData.role;
      existing.department = userData.department;
      existing.phone = userData.phone;
      existing.status = userData.status;
      // Re-hash and update password
      existing.password = userData.password;
      await existing.save();
      console.log(`[Seed] Updated existing demo user: ${userData.email} (${userData.role})`);
    } else {
      const newUser = new User(userData);
      await newUser.save();
      console.log(`[Seed] Created new demo user: ${userData.email} (${userData.role})`);
    }
  }

  console.log('[Seed] Demo users successfully seeded.\n');
};

// If run directly from terminal: node src/seed/seedUsers.js
if (process.argv[1] && process.argv[1].endsWith('seedUsers.js')) {
  (async () => {
    try {
      await connectDB();
      await seedUsers();
      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error('[Seed Error]', err);
      process.exit(1);
    }
  })();
}
