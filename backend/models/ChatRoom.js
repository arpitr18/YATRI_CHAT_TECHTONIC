const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Chat room name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  roomType: {
    type: String,
    enum: ['route', 'station', 'general'],
    default: 'route'
  },
  routeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: function() {
      return this.roomType === 'route';
    }
  },
  stationId: {
    type: String,
    required: function() {
      return this.roomType === 'station';
    }
  },
  activeUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  totalMembers: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for performance
chatRoomSchema.index({ roomType: 1, isActive: 1 });
chatRoomSchema.index({ routeId: 1 });
chatRoomSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model('ChatRoom', chatRoomSchema);