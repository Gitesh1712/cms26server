import express from 'express';
import Newsletter from '../models/Newsletter.js';

const router = express.Router();

// Get all subscribers
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};
    
    const subscribers = await Newsletter.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
      
    const total = await Newsletter.countDocuments(filter);
    
    res.json({
      subscribers,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add subscriber
router.post('/', async (req, res) => {
  try {
    const { email, source = 'manual' } = req.body;
    
    // Validate email
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    
    // Check if already exists
    const existing = await Newsletter.findOne({ email });
    if (existing) {
      if (existing.status === 'unsubscribed') {
        // Reactivate unsubscribed email
        existing.status = 'active';
        existing.source = source;
        await existing.save();
        return res.json(existing);
      }
      return res.status(400).json({ error: 'Email already subscribed' });
    }
    
    // Create new subscriber
    const subscriber = new Newsletter({
      email,
      source
    });
    
    await subscriber.save();
    res.status(201).json(subscriber);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already subscribed' });
    }
    res.status(400).json({ error: error.message });
  }
});

// Update subscriber status
router.put('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const subscriber = await Newsletter.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!subscriber) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }
    
    res.json(subscriber);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete subscriber
router.delete('/:id', async (req, res) => {
  try {
    const subscriber = await Newsletter.findByIdAndDelete(req.params.id);
    
    if (!subscriber) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }
    
    res.json({ message: 'Subscriber deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export subscribers as CSV
router.get('/export', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    
    const subscribers = await Newsletter.find(filter).sort({ createdAt: -1 }).lean();
    
    // Create CSV content
    let csvContent = 'Email,Status,Source,Sign-up Date\n';
    subscribers.forEach(sub => {
      csvContent += `"${sub.email}",${sub.status},${sub.source},"${sub.createdAt.toISOString()}"\n`;
    });
    
    res.header('Content-Type', 'text/csv');
    res.attachment('subscribers.csv');
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
