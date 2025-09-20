const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom',
    required: [true, 'Room ID is required']
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender ID is required']
  },
  senderUsername: {
    type: String,
    required: [true, 'Sender username is required']
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'system', 'update'],
    default: 'text'
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  imageData: {
    type: String, // base64 encoded image
    default: null
  },
  commuteUpdate: {
    type: String,
    enum: ['delayed', 'on_time', 'crowded', 'normal', 'cancelled'],
    default: null
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for performance
messageSchema.index({ roomId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('Message', messageSchema);