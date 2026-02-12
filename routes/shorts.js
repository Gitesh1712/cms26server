import express from 'express';
import Short from '../models/Short.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for thumbnail uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/images');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'short-thumb-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for thumbnails
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
    }
  }
});

/**
 * Helper: Extract YouTube video ID from various URL formats
 */
const getYoutubeId = (url) => {
  if (!url) return null;
  
  // Handle YouTube Shorts URLs
  const shortsMatch = url.match(/youtube\.com\/shorts\/([^?&\/\s]{11})/);
  if (shortsMatch) return shortsMatch[1];
  
  // Handle regular YouTube URLs
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.*\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
};

/**
 * Helper: Extract Instagram Reel ID from URL
 */
const getInstagramReelId = (url) => {
  if (!url) return null;
  
  // Handle Instagram Reels URLs
  // Formats: instagram.com/reel/CODE/, instagram.com/reels/CODE/, instagram.com/p/CODE/
  const reelMatch = url.match(/instagram\.com\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/);
  return reelMatch ? reelMatch[1] : null;
};

/**
 * Helper: Detect platform from URL
 */
const detectPlatform = (url) => {
  if (!url) return null;
  
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }
  if (url.includes('instagram.com')) {
    return 'instagram';
  }
  return null;
};

/**
 * Helper: Validate video URL based on platform
 */
const validateVideoUrl = (url) => {
  const platform = detectPlatform(url);
  
  if (platform === 'youtube') {
    const youtubeId = getYoutubeId(url);
    return { valid: !!youtubeId, platform, id: youtubeId };
  }
  
  if (platform === 'instagram') {
    const instagramId = getInstagramReelId(url);
    return { valid: !!instagramId, platform, id: instagramId };
  }
  
  return { valid: false, platform: null, id: null };
};

/**
 * Helper: Generate YouTube thumbnail URL
 */
const getYoutubeThumbnail = (videoUrl) => {
  const youtubeId = getYoutubeId(videoUrl);
  return youtubeId ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg` : null;
};

/**
 * GET /api/shorts
 * Get all shorts (admin view with all statuses)
 */
router.get('/', async (req, res) => {
  try {
    const { status, limit = 50, page = 1, sort = 'position' } = req.query;
    const query = {};

    // Filter by status if provided
    if (status !== undefined && status !== '') {
      query.status = parseInt(status);
    }

    // Determine sort order
    let sortOrder = {};
    switch (sort) {
      case 'position':
        sortOrder = { position: 1, createdAt: -1 };
        break;
      case 'newest':
        sortOrder = { createdAt: -1 };
        break;
      case 'oldest':
        sortOrder = { createdAt: 1 };
        break;
      case 'views':
        sortOrder = { views: -1 };
        break;
      default:
        sortOrder = { position: 1, createdAt: -1 };
    }

    const shorts = await Short.find(query)
      .sort(sortOrder)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Short.countDocuments(query);

    res.json({
      shorts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching shorts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/shorts/:id
 * Get single short by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const short = await Short.findById(req.params.id);
    if (!short) {
      return res.status(404).json({ error: 'Short not found' });
    }
    res.json(short);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/shorts
 * Create a new short (supports both YouTube and Instagram)
 */
router.post('/', upload.single('thumbnail'), async (req, res) => {
  try {
    const { title, videoUrl, thumbnail, status, position } = req.body;

    // Validation
    if (!title || !videoUrl) {
      return res.status(400).json({ error: 'Title and videoUrl are required' });
    }

    // Validate URL and detect platform
    const validation = validateVideoUrl(videoUrl);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Invalid URL. Please provide a valid YouTube Shorts or Instagram Reels URL.' 
      });
    }

    // Handle thumbnail
    let finalThumbnail = thumbnail;
    
    // If file uploaded, use that
    if (req.file) {
      finalThumbnail = `/uploads/images/${req.file.filename}`;
    }
    // If YouTube and no thumbnail, auto-generate
    else if (validation.platform === 'youtube' && !thumbnail) {
      finalThumbnail = getYoutubeThumbnail(videoUrl);
    }
    // Instagram requires manual thumbnail if not provided
    else if (validation.platform === 'instagram' && !thumbnail) {
      finalThumbnail = null; // Will show placeholder
    }

    // Get the highest position if not provided
    let finalPosition = position;
    if (finalPosition === undefined || finalPosition === null) {
      const lastShort = await Short.findOne().sort({ position: -1 });
      finalPosition = lastShort ? lastShort.position + 1 : 0;
    }

    const shortData = {
      title,
      videoUrl,
      platform: validation.platform,
      thumbnail: finalThumbnail,
      status: status !== undefined ? parseInt(status) : 1,
      position: finalPosition,
      author: req.user?.name || 'Admin'
    };

    // Add userId from authenticated user
    if (req.userId) {
      shortData.userId = req.userId;
    }

    const short = new Short(shortData);
    await short.save();

    res.status(201).json(short);
  } catch (error) {
    console.error('Error creating short:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/shorts/:id
 * Update a short (supports both YouTube and Instagram)
 */
router.put('/:id', upload.single('thumbnail'), async (req, res) => {
  try {
    const { title, videoUrl, thumbnail, status, position } = req.body;

    const short = await Short.findById(req.params.id);
    if (!short) {
      return res.status(404).json({ error: 'Short not found' });
    }

    // Update fields if provided
    if (title !== undefined) short.title = title;
    
    if (videoUrl !== undefined) {
      // Validate URL and detect platform
      const validation = validateVideoUrl(videoUrl);
      if (!validation.valid) {
        return res.status(400).json({ 
          error: 'Invalid URL. Please provide a valid YouTube Shorts or Instagram Reels URL.' 
        });
      }
      short.videoUrl = videoUrl;
      short.platform = validation.platform;
      
      // Auto-update thumbnail for YouTube if no new thumbnail provided
      if (!req.file && thumbnail === undefined && validation.platform === 'youtube') {
        short.thumbnail = getYoutubeThumbnail(videoUrl);
      }
    }

    // Handle thumbnail update
    if (req.file) {
      // Delete old thumbnail if it's a local file
      if (short.thumbnail && short.thumbnail.startsWith('/uploads/')) {
        const oldPath = path.join(__dirname, '..', short.thumbnail);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      short.thumbnail = `/uploads/images/${req.file.filename}`;
    } else if (thumbnail !== undefined) {
      short.thumbnail = thumbnail;
    }

    if (status !== undefined) short.status = parseInt(status);
    if (position !== undefined) short.position = parseInt(position);

    await short.save();
    res.json(short);
  } catch (error) {
    console.error('Error updating short:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PATCH /api/shorts/:id/status
 * Update short status only
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    if (status === undefined || status === null) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const statusValue = parseInt(status);
    if (![0, 1, 2].includes(statusValue)) {
      return res.status(400).json({ error: 'Invalid status. Must be 0 (inactive), 1 (active), or 2 (hidden)' });
    }

    const short = await Short.findById(req.params.id);
    if (!short) {
      return res.status(404).json({ error: 'Short not found' });
    }

    short.status = statusValue;
    await short.save();

    res.json({
      message: 'Short status updated successfully',
      short: {
        _id: short._id,
        title: short.title,
        status: short.status
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/shorts/reorder
 * Bulk update positions for reordering
 */
router.patch('/reorder', async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    // Update positions in bulk
    const updatePromises = items.map(item => 
      Short.findByIdAndUpdate(item.id, { position: item.position }, { new: true })
    );

    await Promise.all(updatePromises);

    res.json({ message: 'Shorts reordered successfully' });
  } catch (error) {
    console.error('Error reordering shorts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/shorts/:id
 * Delete a short
 */
router.delete('/:id', async (req, res) => {
  try {
    const short = await Short.findById(req.params.id);
    if (!short) {
      return res.status(404).json({ error: 'Short not found' });
    }

    await Short.findByIdAndDelete(req.params.id);
    res.json({ message: 'Short deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/shorts
 * Bulk delete shorts
 */
router.delete('/', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs array is required' });
    }

    const result = await Short.deleteMany({ _id: { $in: ids } });

    res.json({ 
      message: `${result.deletedCount} short(s) deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
