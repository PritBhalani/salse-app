import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { protect } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists inside backend/uploads
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const cleanName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '-')
      .slice(0, 20);
    cb(null, `photo-${Date.now()}-${cleanName}${ext}`);
  },
});

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

// @desc    Upload product or receipt image directly
// @route   POST /api/upload
router.post('/', protect, (req, res) => {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      console.error('Multer upload error:', err.message);
      return res.status(400).json({ success: false, message: err.message || 'Image upload error' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.get('host');
    const fullUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    const relativeUrl = `/uploads/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Photo uploaded successfully',
      imageUrl: fullUrl,
      url: fullUrl,
      relativeUrl,
      filename: req.file.filename,
      size: req.file.size,
    });
  });
});

export default router;
