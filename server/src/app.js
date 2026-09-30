import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import userRoutes from './routes/userRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import slaRoutes from './routes/slaRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();

// Security and HTTP Headers
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// CORS Configuration
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (such as mobile apps, curl, or same-origin on Vercel)
    if (!origin) return callback(null, true);
    
    // Match allowed explicit origins or vercel.app domains
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    
    return callback(null, true);
  },
  credentials: true,
}));

// Body Parsing Middleware with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Database Connection Middleware for Serverless & Services environments
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('[Database Middleware Connection Error]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while connecting to database services',
    });
  }
});

// Health Check API - Safe production status
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'helpdesk-pro',
    timestamp: new Date().toISOString(),
  });
});

// API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/sla', slaRoutes);
app.use('/api/audit-logs', auditLogRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
