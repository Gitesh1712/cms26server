import express from 'express';
import Newsletter from '../models/Newsletter.js';

const router = express.Router();

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

export default router;
