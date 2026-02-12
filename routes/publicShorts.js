import express from 'express';
import Short from '../models/Short.js';

const router = express.Router();

/**
 * GET /api/public/shorts
 * Get all active/published shorts for public display
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;

    // Only fetch active shorts (status = 1)
    const query = { status: 1 };

    const shorts = await Short.find(query)
      .select('title videoUrl platform thumbnail views likes position createdAt')
      .sort({ position: 1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await Short.countDocuments(query);

    // Add cache header for better performance
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes cache

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
    console.error('Error fetching public shorts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/public/shorts/featured
 * Get featured shorts (top viewed or first N shorts by position)
 */
router.get('/featured', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const shorts = await Short.find({ status: 1 })
      .select('title videoUrl platform thumbnail views likes position createdAt')
      .sort({ position: 1 })
      .limit(parseInt(limit))
      .lean();

    res.set('Cache-Control', 'public, max-age=600'); // 10 minutes cache
    res.json(shorts);
  } catch (error) {
    console.error('Error fetching featured shorts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/public/shorts/trending
 * Get trending shorts sorted by views
 */
router.get('/trending', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const shorts = await Short.find({ status: 1 })
      .select('title videoUrl platform thumbnail views likes position createdAt')
      .sort({ views: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.set('Cache-Control', 'public, max-age=600'); // 10 minutes cache
    res.json(shorts);
  } catch (error) {
    console.error('Error fetching trending shorts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/public/shorts/:id
 * Get single short and increment views
 */
router.get('/:id', async (req, res) => {
  try {
    const short = await Short.findOne({ 
      _id: req.params.id, 
      status: 1 
    });

    if (!short) {
      return res.status(404).json({ error: 'Short not found' });
    }

    // Increment views
    short.views += 1;
    await short.save();

    res.json(short);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/public/shorts/:id/like
 * Like a short
 */
router.post('/:id/like', async (req, res) => {
  try {
    const short = await Short.findOne({ 
      _id: req.params.id, 
      status: 1 
    });

    if (!short) {
      return res.status(404).json({ error: 'Short not found' });
    }

    short.likes += 1;
    await short.save();

    res.json({ likes: short.likes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/public/shorts/:id/unlike
 * Unlike a short
 */
router.post('/:id/unlike', async (req, res) => {
  try {
    const short = await Short.findOne({ 
      _id: req.params.id, 
      status: 1 
    });

    if (!short) {
      return res.status(404).json({ error: 'Short not found' });
    }

    if (short.likes > 0) {
      short.likes -= 1;
    }
    await short.save();

    res.json({ likes: short.likes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
