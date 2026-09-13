import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { protect } from '../middleware/auth.js';

import { Media } from '../models/Media.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists inside backend/uploads for local caching
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (e) {
    // Ignore in read-only environments
  }
}

// Memory storage keeps the image buffer in RAM to store in MongoDB Atlas
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const isImage =
    file.mimetype.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.originalname);

  if (isImage) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPG, PNG, WEBP, GIF, SVG) are allowed!'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter,
});

const router = express.Router();

// @desc    Upload product or receipt image directly and persist in MongoDB Atlas
// @route   POST /api/upload
router.post('/', protect, (req, res) => {
  upload.single('photo')(req, res, async (err) => {
    if (err) {
      console.error('Multer upload error:', err.message);
      return res.status(400).json({ success: false, message: err.message || 'Image upload error' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    try {
      const ext = path.extname(req.file.originalname || '').toLowerCase() || '.jpg';
      const cleanName = path
        .basename(req.file.originalname || 'photo', ext)
        .replace(/[^a-zA-Z0-9]/g, '-')
        .slice(0, 20);
      const filename = `photo-${Date.now()}-${cleanName}${ext}`;

      // Save directly to MongoDB Atlas
      const media = await Media.create({
        filename,
        contentType: req.file.mimetype || 'image/jpeg',
        data: req.file.buffer,
        size: req.file.size,
        uploadedBy: req.user?._id || null,
      });

      // Also save to disk as secondary local cache if writable
      try {
        fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer);
      } catch (fsErr) {
        // Ephemeral filesystem warnings safely caught
      }

      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.get('host');
      const persistentUrl = `/api/images/${media._id}`;
      const fullUrl = `${protocol}://${host}${persistentUrl}`;

      res.json({
        success: true,
        message: 'Photo uploaded and persisted permanently in database',
        imageUrl: persistentUrl,
        url: persistentUrl,
        relativeUrl: persistentUrl,
        fullUrl,
        id: media._id,
        filename,
        size: req.file.size,
      });
    } catch (saveErr) {
      console.error('Failed to save uploaded photo to MongoDB:', saveErr);
      return res.status(500).json({ success: false, message: 'Failed to store image in database' });
    }
  });
});

export default router;
