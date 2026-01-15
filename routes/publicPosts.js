import express from 'express';
import Post from '../models/Post.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from "fs";


const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allowed image and video extensions
const allowedImageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const allowedVideoExtensions = ['.mp4', '.webm', '.mov', '.mkv'];
const allowedExtensions = [...allowedImageExtensions, ...allowedVideoExtensions];

// Dangerous extensions that should be blocked
const dangerousExtensions = ['.exe', '.apk', '.bat', '.cmd', '.sh', '.php', '.js', '.jar', '.zip', '.rar'];

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'videos') {
      cb(null, 'uploads/videos/');
    } else if (file.fieldname === 'images') {
      cb(null, 'uploads/images/');
    } else {
      cb(null, 'uploads/');
    }
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    // Check both MIME type and file extension
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if ((file.mimetype.startsWith('video/') && allowedVideoExtensions.includes(fileExtension)) || 
        (file.mimetype.startsWith('image/') && allowedImageExtensions.includes(fileExtension))) {
      cb(null, true);
    } else {
      cb(new Error('Only allowed image and video formats are permitted'));
    }
  }
});

// Middleware to check for dangerous file extensions in uploaded files
const secureUploadCheck = (req, res, next) => {
  if (!req.files) {
    return next();
  }

  const files = [];
  if (req.files.videos && Array.isArray(req.files.videos)) {
    files.push(...req.files.videos);
  }
  if (req.files.images && Array.isArray(req.files.images)) {
    files.push(...req.files.images);
  }

  for (const file of files) {
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    // Check if the original filename contains dangerous extensions
    if (dangerousExtensions.some(ext => file.originalname.toLowerCase().includes(ext))) {
      // Delete the file from disk
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      
      return res.status(400).json({ 
        error: `File ${file.originalname} contains a potentially dangerous extension and has been blocked.` 
      });
    }
    
    // Additional check: verify the file extension is in the allowed list
    if (!allowedExtensions.includes(fileExtension)) {
      // Delete the file from disk
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      
      return res.status(400).json({ 
        error: `File ${file.originalname} has an unsupported extension.` 
      });
    }
  }

  next();
};

// Get all posts
router.get('/', async (req, res) => {
  try {
    const { category, featured, heroContent, topStory, limit = 50, page = 1 } = req.query;
    const query = {};

    if (category) query.category = category;
    if (featured) query.featured = featured === 'true';
    if (heroContent) query.heroContent = heroContent === 'true';
    if (topStory) query.topStory = topStory === 'true';
    query.status = 1; // Only fetch approved posts

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Hero/Banner Section - MUST be before /:id
router.get('/hero', async (req, res) => {
  try {
    const posts = await Post.find({ heroContent: true })
      .select('title description category media views createdAt')
      .sort({ createdAt: -1 })
      .limit(5) // Limit to 5 hero posts for faster loading
      .lean();

    res.set('Cache-Control', 'public, max-age=600'); // Increase cache time to 10 minutes
    res.json(posts);
  } catch (err) {
    console.error('Hero route error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Trending Now - MUST be before /:id
// Shows posts sorted by views (most viewed first), with limit of 10
router.get('/trending', async (req, res) => {
  try {
    const posts = await Post.find()
      .select('title description category media views createdAt')
      .sort({ views: -1, createdAt: -1 })
      .limit(5) // Reduce to 5 for faster loading
      .lean();

    res.set('Cache-Control', 'public, max-age=600'); // Increase cache time to 10 minutes
    res.json(posts);
  } catch (err) {
    console.error('Trending route error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = [
      { id: 'entertainment', name: 'Entertainment', icon: 'Film', color: '#FF6B6B' },
      { id: 'lifestyle', name: 'Lifestyle', icon: 'Heart', color: '#4ECDC4' },
      { id: 'experience', name: 'Experience', icon: 'Utensils', color: '#45B7D1' },
      { id: 'humanStory', name: 'Human Story', icon: 'Users', color: '#96CEB4' },
      { id: 'tech', name: 'Technology', icon: 'Cpu', color: '#FFEAA7' },
      { id: 'documentary', name: 'Documentary', icon: 'BookOpen', color: '#DDA0DD' }
    ];
    
    res.json(categories);
  } catch (err) {
    console.error('Categories route error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Category Endpoints - MUST be before /:id
const validCategories = ['entertainment','lifestyle','experience','humanStory','tech','documentary'];
validCategories.forEach(category => {
  router.get(`/category/${category}`, async (req, res) => {
    try {
      // Exclude hero content from category listings to prevent duplication
      const query = { 
        category: category,
        heroContent: { $ne: true }
      };
      
      const posts = await Post.find(query)
        .select('title description category media views createdAt')
        .sort({ createdAt: -1 })
        .limit(6) // Limit to 6 posts per category for faster loading
        .lean();

      res.set('Cache-Control', 'public, max-age=600'); // Increase cache time to 10 minutes
      res.json(posts);
    } catch (err) {
      console.error(`Category ${category} route error:`, err);
      res.status(500).json({ error: err.message });
    }
  });
});

// Get single post
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Increment views
    post.views += 1;
    await post.save();

    res.json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Like a post
router.post('/:id/like', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    post.likes += 1;
    await post.save();
    
    res.json({ likes: post.likes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unlike a post
router.post('/:id/unlike', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    if (post.likes > 0) {
      post.likes -= 1;
    }
    await post.save();
    
    res.json({ likes: post.likes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add comment to a post
router.post('/:id/comment', async (req, res) => {
  try {
    console.log('Received comment request:', { 
      params: req.params, 
      body: req.body,
      headers: req.headers
    });
    
    const { user, text } = req.body;
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      console.log('Post not found:', req.params.id);
      return res.status(404).json({ error: 'Post not found' });
    }
    
    console.log('Post found:', post.title);
    console.log('User:', user);
    console.log('Text:', text);
    
    if (!user || !text) {
      console.log('Validation failed - User:', user, 'Text:', text);
      return res.status(400).json({ error: 'User and text are required' });
    }
    
    const comment = {
      user,
      text,
      createdAt: new Date()
    };
    
    post.comments.push(comment);
    await post.save();
    
    res.json({ comments: post.comments });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get comments for a post
router.get('/:id/comments', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json({ comments: post.comments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a comment from a post
router.delete('/:id/comment/:commentIndex', async (req, res) => {
  try {
    const { id, commentIndex } = req.params;
    const post = await Post.findById(id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Validate comment index
    if (commentIndex < 0 || commentIndex >= post.comments.length) {
      return res.status(400).json({ error: 'Invalid comment index' });
    }
    
    // Remove the comment at the specified index
    post.comments.splice(commentIndex, 1);
    await post.save();
    
    res.json({ 
      message: 'Comment deleted successfully',
      comments: post.comments 
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;