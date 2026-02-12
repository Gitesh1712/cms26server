import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import postRoutes from './routes/posts.js';
import publicPostRoutes from './routes/publicPosts.js';
import authRoutes from './routes/auth.js';
import newsletterRoutes from './routes/newsletter.js';
import publicNewsletterRoutes from './routes/publicNewsletter.js';
import leadRoutes from './routes/lead.js';
import categoryRoutes from './routes/category.js';
import publicCategoryRoutes from './routes/publicCategory.js';
import userRoutes from './routes/users.js';
import shortsRoutes from './routes/shorts.js';
import publicShortsRoutes from './routes/publicShorts.js';

import { authenticate } from './middleware/auth.js';

import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ===============================
   TRUST PROXY (for Nginx later)
================================ */
app.set('trust proxy', 1);

/* ===============================
   CORS CONFIG
================================ */
// const allowedOrigins = [
//   process.env.FRONTEND_URL,
//   process.env.CLIENT_URL
// ].filter(Boolean);

// const corsOptions = {
//   origin: allowedOrigins.length ? allowedOrigins : false,
//   credentials: true,
//   optionsSuccessStatus: 200
// };

// app.use(cors(corsOptions));
app.use(cors({
  origin: true,          // allow all origins
  credentials: true,     // allow cookies / auth headers
}));

app.options('*', cors()); // handle preflight requests

/* ===============================
   BODY PARSERS
================================ */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log ALL incoming requests
// app.use((req, res, next) => {
//   console.log(`[${req.method}] ${req.path}`, req.body);
//   next();
// });

/* ===============================
   STATIC UPLOADS + CACHE
================================ */
app.use(
  '/api/uploads',
  (req, res, next) => {
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Vary', 'Range');

    if (req.path.includes('/images/')) {
      res.setHeader('Cache-Control', 'public, max-age=2592000');
    } else if (req.path.includes('/videos/')) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Content-Type', 'video/mp4');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }

    next();
  },
  express.static(path.join(__dirname, 'uploads'))
);

app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Vary', 'Range');

    if (req.path.includes('/images/')) {
      res.setHeader('Cache-Control', 'public, max-age=2592000');
    } else if (req.path.includes('/videos/')) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Content-Type', 'video/mp4');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }

    next();
  },
  express.static(path.join(__dirname, 'uploads'))
);

/* ===============================
   ENSURE UPLOAD DIRECTORIES
================================ */
const uploadDirs = [
  path.join(__dirname, 'uploads/images'),
  path.join(__dirname, 'uploads/videos')
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/* ===============================
   MONGODB CONNECTION
================================ */
const MONGODB_URI =
  process.env.DB_URL;

const mongoOptions = {
  maxPoolSize: process.env.NODE_ENV === 'production' ? 10 : undefined,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
};

mongoose
  .connect(MONGODB_URI, mongoOptions)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });

/* ===============================
   ROUTES
================================ */
// Public routes - no authentication required
app.use('/api/', authRoutes);
// Protected routes - authentication required
app.use('/api/allposts', publicPostRoutes);
app.use('/api/public/posts', publicPostRoutes);
app.use('/api/posts',authenticate, postRoutes);
app.use('/api/newsletter', authenticate, newsletterRoutes);
app.use('/api/public/newsletter', publicNewsletterRoutes);
// app.use('/api/leads', authenticate, leadRoutes);
app.use('/api/public/leads',leadRoutes);
app.use('/api/leads',authenticate,leadRoutes);
// app.use('/api/categories', authenticate, categoryRoutes);
app.use('/api/categories',authenticate, categoryRoutes);
app.use('/api/public/categories',publicCategoryRoutes);
app.use('/api/users', authenticate, userRoutes);
app.use('/api/shorts', authenticate, shortsRoutes);
app.use('/api/public/shorts', publicShortsRoutes);

/* ===============================
   HEALTH CHECK
================================ */
app.get('/', (req, res) => {
  res.json({ message: 'Kaivailayam API is running!' });
});

/* ===============================
   404 HANDLER
================================ */
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  });
});

/* ===============================
   ERROR HANDLER
================================ */
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error'
  });
});

/* ===============================
   START SERVER
================================ */
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

/* ===============================
   GRACEFUL SHUTDOWN (PM2)
================================ */
const shutdown = async () => {
  console.log('Shutting down server...');
  await mongoose.connection.close();
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
