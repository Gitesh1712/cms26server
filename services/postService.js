import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Delete media files from storage
 * Only deletes local files (not external URLs)
 * @param {Array} mediaArray - Array of media objects with url and mediaType
 */
export const deleteMediaFiles = (mediaArray) => {
  if (!mediaArray || mediaArray.length === 0) return;

  mediaArray.forEach(mediaItem => {
    if (mediaItem.url && mediaItem.url.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', mediaItem.url);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`Deleted media file: ${filePath}`);
        } catch (err) {
          console.error(`Failed to delete file ${filePath}:`, err);
        }
      }
    }
  });
};

/**
 * Build media array from uploaded files
 * @param {Object} files - req.files object from multer
 * @returns {Array} Array of media objects
 */
export const buildMediaFromFiles = (files) => {
  const media = [];

  if (!files) return media;

  if (files.videos && Array.isArray(files.videos)) {
    files.videos.forEach(file => {
      media.push({
        url: `/uploads/videos/${file.filename}`,
        mediaType: 'video'
      });
    });
  }

  if (files.images && Array.isArray(files.images)) {
    files.images.forEach(file => {
      media.push({
        url: `/uploads/images/${file.filename}`,
        mediaType: 'image'
      });
    });
  }

  return media;
};

/**
 * Build media array from URL
 * @param {string} mediaUrl - The media URL
 * @param {string} type - The post type ('video' or 'article')
 * @returns {Array} Array with single media object
 */
export const buildMediaFromUrl = (mediaUrl, type) => {
  if (!mediaUrl) return [];

  const mediaType = type === 'video' ? 'video' : 'image';
  return [{
    url: mediaUrl,
    mediaType: mediaType
  }];
};

/**
 * Check if files were uploaded
 * @param {Object} files - req.files object from multer
 * @returns {boolean}
 */
export const hasUploadedFiles = (files) => {
  if (!files) return false;
  return (files.videos?.length > 0 || files.images?.length > 0);
};

/**
 * Parse boolean from string or boolean value
 * @param {string|boolean} value 
 * @returns {boolean}
 */
export const parseBoolean = (value) => {
  return value === 'true' || value === true;
};

/**
 * Parse tags string into array
 * @param {string} tags - Comma-separated tags string
 * @returns {Array}
 */
export const parseTags = (tags) => {
  if (!tags) return [];
  return tags.split(',').map(t => t.trim());
};

/**
 * Build post data object for creation
 * @param {Object} body - Request body
 * @param {Array} media - Media array
 * @returns {Object} Post data object
 */
export const buildPostData = (body, media) => {
  const { 
    title, 
    description, 
    category, 
    type, 
    author, 
    tags, 
    featured, 
    heroContent, 
    topStory, 
    categoryHighlight 
  } = body;

  return {
    title,
    description,
    category: category || 'entertainment',
    postType: type || 'article',
    media,
    author: author || 'Admin',
    tags: parseTags(tags),
    featured: parseBoolean(featured),
    heroContent: parseBoolean(heroContent),
    topStory: parseBoolean(topStory),
    categoryHighlight: parseBoolean(categoryHighlight),
    views: 0,
    likes: 0,
    comments: []
  };
};

/**
 * Update post fields from request body
 * @param {Object} post - Mongoose post document
 * @param {Object} body - Request body
 */
export const updatePostFields = (post, body) => {
  const { title, description, category, type, author, tags, featured, heroContent, topStory } = body;

  if (title) post.title = title;
  if (description) post.description = description;
  if (category) post.category = category;
  if (type) post.postType = type;
  if (author) post.author = author;
  if (tags) post.tags = parseTags(tags);
  if (featured !== undefined) post.featured = parseBoolean(featured);
  if (heroContent !== undefined) post.heroContent = parseBoolean(heroContent);
  if (topStory !== undefined) post.topStory = parseBoolean(topStory);
};
