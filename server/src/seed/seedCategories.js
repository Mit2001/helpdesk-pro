import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Category from '../models/Category.js';

dotenv.config();

export const DEFAULT_CATEGORIES = [
  {
    name: 'Hardware & Devices',
    description: 'Workstations, laptops, monitors, mobile devices, and peripherals',
    subcategories: [
      { name: 'Laptop / Desktop Issue', description: 'Hardware failure or physical damage' },
      { name: 'Monitor & Display', description: 'External display issues' },
      { name: 'Keyboard, Mouse & Peripherals', description: 'Input and docking station issues' },
      { name: 'Printer & Scanner', description: 'Network printer connectivity and driver issues' },
    ],
  },
  {
    name: 'Network & VPN',
    description: 'Corporate network, remote access, DNS, and WiFi connectivity',
    subcategories: [
      { name: 'VPN Connection', description: 'Remote gateway and Cisco AnyConnect' },
      { name: 'Office Wi-Fi / LAN', description: 'In-office wireless or wired connectivity' },
      { name: 'DNS & Internet Access', description: 'Domain resolution and firewall blocks' },
    ],
  },
  {
    name: 'Software & Applications',
    description: 'Operating systems, productivity suites, and internal tools',
    subcategories: [
      { name: 'Microsoft 365 / Office', description: 'Word, Excel, OneDrive, Teams' },
      { name: 'Email & Outlook', description: 'Mail delivery, sync errors, shared mailboxes' },
      { name: 'Software Installation', description: 'Approved enterprise software provisioning' },
      { name: 'Internal Business Apps', description: 'ERP, CRM, and custom internal systems' },
    ],
  },
  {
    name: 'Security & Access Control',
    description: 'Account access, multi-factor authentication, and security incidents',
    subcategories: [
      { name: 'Password Reset', description: 'Active Directory / Okta credential reset' },
      { name: 'MFA / 2FA Device Registration', description: 'Authenticator app or security key setup' },
      { name: 'Role & Permission Request', description: 'Shared drive, repository, or database access' },
      { name: 'Suspicious Email / Phishing', description: 'Report suspicious communication' },
    ],
  },
  {
    name: 'Database & Cloud Infrastructure',
    description: 'Cloud hosting, database connectivity, and backend services',
    subcategories: [
      { name: 'Database Connection Timeout', description: 'MongoDB, PostgreSQL, MySQL connections' },
      { name: 'Server / Cloud Instance Outage', description: 'AWS, Azure, or GCP environment issues' },
      { name: 'API & Microservice Errors', description: 'Backend service latency or HTTP 500 errors' },
    ],
  },
  {
    name: 'General IT Inquiry',
    description: 'Non-urgent technical questions and hardware procurement',
    subcategories: [
      { name: 'Hardware Upgrade Request', description: 'RAM, SSD, or new workstation request' },
      { name: 'IT Consultation', description: 'Architecture or tool recommendations' },
    ],
  },
];

export const seedCategories = async (adminUserId = null) => {
  console.log('[Seed] Seeding default IT service categories...');

  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await Category.findOne({ name: cat.name });
    if (!existing) {
      const newCat = new Category({
        ...cat,
        status: 'Active',
        ...(adminUserId && { createdBy: adminUserId }),
      });
      await newCat.save();
      console.log(`[Seed] Created category: ${cat.name}`);
    } else {
      existing.description = cat.description;
      existing.subcategories = cat.subcategories;
      existing.status = 'Active';
      await existing.save();
      console.log(`[Seed] Updated category: ${cat.name}`);
    }
  }

  console.log('[Seed] Categories successfully seeded.\n');
};

if (process.argv[1] && process.argv[1].endsWith('seedCategories.js')) {
  (async () => {
    try {
      await connectDB();
      await seedCategories();
      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error('[Seed Error]', err);
      process.exit(1);
    }
  })();
}
