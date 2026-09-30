import dotenv from 'dotenv';
import { connectDB } from '../server/src/config/db.js';
import app from '../server/src/app.js';

dotenv.config();

export default async function handler(req, res) {
  try {
    await connectDB();
    return app(req, res);
  } catch (error) {
    console.error('[Vercel Serverless Function Error]', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while connecting to database services',
    });
  }
}
