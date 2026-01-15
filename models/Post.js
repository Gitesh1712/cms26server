import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema({
  url: String,
  mediaType: String
}, { _id: false });

const commentSchema = new mongoose.Schema({
  user: String,
  text: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const postSchema = new mongoose.Schema({
  title: String,
  description: String,
  category: String,
  postType: {
    type: String,
    enum: ['video', 'article'],
    required: true,
    default: 'article'
  },
  status: {
    type: Number,
    enum: [0, 1, 2],  // 0 = pending, 1 = approved, 2 = rejected
    default: 0
  },
  media: {
    type: [mediaSchema],
    default: []
  },
  author: {
    type: String,
    default: 'Admin'
  },
  tags: [String],
  featured: Boolean,
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  comments: {
    type: [commentSchema],
    default: []
  },
  heroContent: Boolean,
  topStory: Boolean,
  categoryHighlight: Boolean,
  position: Number
}, {
  timestamps: true,
  strict: false
});

// Add indexes for faster queries
postSchema.index({ category: 1 });
postSchema.index({ heroContent: 1 });
postSchema.index({ views: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ category: 1, createdAt: -1 });
postSchema.index({ topStory: 1 });
postSchema.index({ featured: 1 });
postSchema.index({ status: 1 }); // optional: index status for faster queries

const Post = mongoose.model('Post', postSchema);
export default Post;
