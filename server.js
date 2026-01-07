// import express from 'express';
// import mongoose from 'mongoose';
// import cors from 'cors';
// import dotenv from 'dotenv';
// import path from 'path';
// import { fileURLToPath } from 'url';
// import postRoutes from './routes/posts.js';
// import authRoutes from './routes/auth.js';
// import newsletterRoutes from './routes/newsletter.js';

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 5000; // Default to 5000 instead of 5001
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);


// // Configure CORS based on environment
// const corsOptions = {
//   origin: process.env.FRONTEND_URL || process.env.CLIENT_URL || '*',
//   credentials: true,
//   optionsSuccessStatus: 200
// };

// app.use(cors(corsOptions));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use('/uploads', (req, res, next) => {
//   res.setHeader('Accept-Ranges', 'bytes');
//   res.setHeader('Vary', 'Range');
  
//   if (req.path.includes('/images/')) {
//     res.setHeader('Cache-Control', 'public, max-age=2592000'); 
//     res.setHeader('Pragma', 'cache');
//   } else if (req.path.includes('/videos/')) {
//     res.setHeader('Cache-Control', 'public, max-age=86400');
//     res.setHeader('Content-Type', 'video/mp4');
//   } else {
//     res.setHeader('Cache-Control', 'public, max-age=86400'); 
//     res.setHeader('Pragma', 'cache');
//   }

//   next();
// }, express.static(path.join(__dirname, 'uploads')));
// import fs from 'fs';
// const uploadDirs = [
//   path.join(__dirname, 'uploads/images'),
//   path.join(__dirname, 'uploads/videos')
// ];

// uploadDirs.forEach(dir => {
//   if (!fs.existsSync(dir)) {
//     fs.mkdirSync(dir, { recursive: true });
//   }
// });
// const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || `mongodb://localhost:27017/${process.env.DB_NAME || 'kaivailayam'}`;

// // Configure MongoDB connection options based on environment
// const mongoOptions = {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// };

// // Add additional options for production
// if (process.env.NODE_ENV === 'production') {
//   mongoOptions.maxPoolSize = 10;
//   mongoOptions.serverSelectionTimeoutMS = 5000;
//   mongoOptions.socketTimeoutMS = 45000;
// }

// mongoose.connect(MONGODB_URI, mongoOptions)
// .then(() => console.log('MongoDB connected successfully'))
// .catch(err => {
//   console.error('MongoDB connection error:', err);
//   console.log('Server will continue without database connection for static file serving');
// });
// app.use('/api/posts', postRoutes);
// app.use('/api/auth', authRoutes);
// app.use('/api/newsletter', newsletterRoutes);


// app.get('/', (req, res) => {
//   res.json({ message: 'Kaivailayam API is running!' });
// });


// app.use((req, res) => {
//   console.log(`404 - Route not found: ${req.method} ${req.path}`);
//   res.status(404).json({ error: 'Route not found', path: req.path });
// });


// app.use((err, req, res, next) => {
//   console.error('Server error:', err);
//   res.status(500).json({ error: err.message || 'Internal server error' });
// });

// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
//   console.log(`API available at http://localhost:${PORT}/api`);
// });

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import postRoutes from './routes/posts.js';
import authRoutes from './routes/auth.js';
import newsletterRoutes from './routes/newsletter.js';

dotenv.config();

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
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  'mongodb://127.0.0.1:27017/kaivailayam';

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
app.use('/api/posts', postRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/newsletter', newsletterRoutes);

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
