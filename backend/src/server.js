import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { connectDB } from './config/db.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import shopRoutes from './routes/shopRoutes.js';
import routeRoutes from './routes/routeRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import visitRoutes from './routes/visitRoutes.js';
import callingSheetRoutes from './routes/callingSheetRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import imageRoutes from './routes/imageRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import { Media } from './models/Media.js';

const app = express();
const server = http.createServer(app);

// Socket.io for Real-Time Warehouse Alerts
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  },
});

app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIST = path.join(__dirname, '../../admin-client/dist');
const UPLOADS_DIR = path.join(__dirname, '../uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploaded product and receipt photos (Disk first, then MongoDB persistent fallback)
app.get('/uploads/:filename', async (req, res, next) => {
  const filePath = path.join(UPLOADS_DIR, req.params.filename);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }

  // If wiped from ephemeral disk (e.g. on Render), look up in MongoDB
  try {
    const media = await Media.findOne({ filename: req.params.filename });
    if (media && media.data) {
      const buffer = Buffer.isBuffer(media.data) ? media.data : Buffer.from(media.data, 'base64');
      res.set({
        'Content-Type': media.contentType || 'image/jpeg',
        'Content-Length': buffer.length,
        'Cache-Control': 'public, max-age=31536000, immutable',
      });
      return res.end(buffer);
    }
  } catch (dbErr) {
    console.warn(`Could not fetch MongoDB media for ${req.params.filename}:`, dbErr.message);
  }

  // Not found on disk or DB - return clean 404 instead of serving index.html
  return res.status(404).json({ success: false, message: 'Image not found' });
});

app.use('/uploads', express.static(UPLOADS_DIR));

// Serve compiled Admin CRM & Warehouse web portal
app.use(express.static(CLIENT_DIST));

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/calling-sheet', callingSheetRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/categories', categoryRoutes);

// Socket.io connection logic
io.on('connection', (socket) => {
  console.log(`🔌 Client connected to Socket.io: ${socket.id}`);

  socket.on('join:warehouse', () => {
    socket.join('warehouse');
    console.log(`📦 Socket ${socket.id} joined warehouse room`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    app: 'Wholesale Plumbing & Bathware CRM/ERP API',
    time: new Date(),
    version: '1.0.0',
  });
});

// Single Page Application Fallback (Protect API, uploads, and static assets from returning index.html)
app.get('*', (req, res, next) => {
  if (
    req.path.startsWith('/api') ||
    req.path.startsWith('/uploads') ||
    req.path.startsWith('/socket.io') ||
    /\.(jpg|jpeg|png|webp|gif|svg|ico|css|js|map|json|woff2?|ttf|eot)$/i.test(req.path)
  ) {
    return res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
  }
  res.sendFile(path.join(CLIENT_DIST, 'index.html'));
});


// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

// Initialize Database & Start Server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Wholesale Plumbing & Bathware Server Running!`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📡 Real-time Socket.io active`);
    console.log(`======================================================\n`);
  });
});
