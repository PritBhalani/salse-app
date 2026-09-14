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

    // Convert media.data properly handling genuine binary, Base64 strings, and Mongoose-cast UTF-8 text buffers
    let buffer = null;
    if (Buffer.isBuffer(media.data)) {
      // Check if buffer starts with genuine image magic header (JPEG, PNG, GIF, WEBP)
      if (
        (media.data[0] === 0xff && media.data[1] === 0xd8) || // JPEG
        (media.data[0] === 0x89 && media.data[1] === 0x50) || // PNG
        (media.data[0] === 0x47 && media.data[1] === 0x49) || // GIF
        (media.data[0] === 0x52 && media.data[1] === 0x49)    // WEBP
      ) {
        buffer = media.data;
      } else {
        // Base64 text string cast to Buffer by Mongoose
        const cleanStr = media.data.toString('utf8').replace(/^data:image\/[a-z]+;base64,/, '');
        buffer = Buffer.from(cleanStr, 'base64');
      }
    } else if (typeof media.data === 'string') {
      const cleanStr = media.data.replace(/^data:image\/[a-z]+;base64,/, '');
      buffer = Buffer.from(cleanStr, 'base64');
    } else {
      buffer = Buffer.from(media.data);
    }

    if (!buffer || buffer.length === 0) {
      return res.status(404).json({ success: false, message: 'Image data is empty' });
    }

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
