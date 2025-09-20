const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Reporter ID is required']
  },
  reportedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reportedMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  reportType: {
    type: String,
    enum: ['spam', 'harassment', 'inappropriate_content', 'fake_information', 'other'],
    required: [true, 'Report type is required']
  },
  description: {
    type: String,
    required: [true, 'Report description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  resolutionNote: {
    type: String,
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for performance
reportSchema.index({ reporterId: 1 });
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reportedUserId: 1 });

module.exports = mongoose.model('Report', reportSchema);