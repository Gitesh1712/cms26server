import mongoose from 'mongoose';

const shortSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  videoUrl: {
    type: String,
    required: true,
    trim: true
  },
  platform: {
    type: String,
    enum: ['youtube', 'instagram'],
    default: 'youtube'
  },
  thumbnail: {
    type: String,
    default: null  // Auto-generated from YouTube URL if not provided
  },
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  status: {
    type: Number,
    enum: [0, 1, 2],  // 0 = draft/inactive, 1 = active/published, 2 = hidden
    default: 1
  },
  position: {
    type: Number,
    default: 0  // For ordering shorts in display
  },
  author: {
    type: String,
    default: 'Admin'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  timestamps: true
});

// Indexes for faster queries
shortSchema.index({ status: 1 });
shortSchema.index({ position: 1 });
shortSchema.index({ createdAt: -1 });
shortSchema.index({ views: -1 });

const Short = mongoose.model('Short', shortSchema);
export default Short;
