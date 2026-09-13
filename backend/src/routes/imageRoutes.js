import express from 'express';
import mongoose from 'mongoose';
import { Media } from '../models/Media.js';

const router = express.Router();

// @desc    Get image binary by Media ID or filename
// @route   GET /api/images/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let media = null;

    // Check by ObjectId if valid
    if (mongoose.isValidObjectId(id) || /^[0-9a-fA-F]{24}$/.test(id)) {
      media = await Media.findById(id);
    }

    // Otherwise or if not found, check by filename
    if (!media) {
      media = await Media.findOne({ filename: id });
    }

    if (!media || !media.data) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }

    const buffer = Buffer.isBuffer(media.data) ? media.data : Buffer.from(media.data, 'base64');

    res.set({
      'Content-Type': media.contentType || 'image/jpeg',
      'Content-Length': buffer.length,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });

    return res.end(buffer);
  } catch (error) {
    console.error('Error serving image from MongoDB:', error);
    return res.status(500).json({ success: false, message: 'Failed to load image' });
  }
});

export default router;
