const { validationResult } = require('express-validator');
const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');

// Get messages for a room
const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    // Verify room exists and user has access
    const room = await ChatRoom.findOne({ _id: roomId, isActive: true });
    if (!room) {
      return res.status(404).json({ error: 'Chat room not found' });
    }
    
    const skip = (page - 1) * limit;
    const messages = await Message.find({
      roomId,
      isDeleted: false
    })
    .populate('senderId', 'username avatar')
    .populate('replyTo', 'content senderUsername')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
    
    // Reverse to get chronological order
    messages.reverse();
    
    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          currentPage: parseInt(page),
          totalMessages: await Message.countDocuments({ roomId, isDeleted: false }),
          hasMore: messages.length === parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch messages',
      message: error.message
    });
  }
};

// Create a new message (HTTP endpoint, also handled via Socket.io)
const createMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const { roomId, content, messageType = 'text', imageData, commuteUpdate, replyTo } = req.body;
    
    // Verify room exists and user is in room
    const room = await ChatRoom.findOne({
      _id: roomId,
      isActive: true,
      activeUsers: req.user._id
    });
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found or user not in room' });
    }
    
    // Validate message content
    if (!content && !imageData && !commuteUpdate) {
      return res.status(400).json({ error: 'Message content is required' });
    }
    
    // Create message
    const message = new Message({
      roomId,
      senderId: req.user._id,
      senderUsername: req.user.username,
      messageType,
      content: content || '',
      imageData,
      commuteUpdate,
      replyTo
    });
    
    await message.save();
    
    // Update room last message timestamp
    room.lastMessageAt = new Date();
    await room.save();
    
    // Populate message for response
    await message.populate('senderId', 'username avatar');
    if (replyTo) {
      await message.populate('replyTo', 'content senderUsername');
    }
    
    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        message
      }
    });
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ 
      error: 'Failed to send message',
      message: error.message
    });
  }
};

// Update message
const updateMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const { messageId } = req.params;
    const { content, imageData } = req.body;
    
    const message = await Message.findOne({
      _id: messageId,
      senderId: req.user._id,
      isDeleted: false
    });
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found or not authorized' });
    }
    
    // Check if message is older than 15 minutes (edit window)
    const editWindow = 15 * 60 * 1000; // 15 minutes
    if (Date.now() - message.createdAt.getTime() > editWindow) {
      return res.status(400).json({ error: 'Message edit window has expired' });
    }
    
    // Update message
    if (content !== undefined) message.content = content;
    if (imageData !== undefined) message.imageData = imageData;
    message.editedAt = new Date();
    
    await message.save();
    
    res.json({
      success: true,
      message: 'Message updated successfully',
      data: {
        message
      }
    });
  } catch (error) {
    console.error('Update message error:', error);
    res.status(500).json({ 
      error: 'Failed to update message',
      message: error.message
    });
  }
};

// Delete message (soft delete)
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findOne({
      _id: messageId,
      isDeleted: false
    });
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Check if user owns the message or is admin/moderator
    if (!message.senderId.equals(req.user._id) && !['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }
    
    message.isDeleted = true;
    message.editedAt = new Date();
    await message.save();
    
    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ 
      error: 'Failed to delete message',
      message: error.message
    });
  }
};

// Mark message as read
const markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Check if user already marked as read
    const alreadyRead = message.readBy.some(read => read.user.equals(req.user._id));
    
    if (!alreadyRead) {
      message.readBy.push({
        user: req.user._id,
        readAt: new Date()
      });
      await message.save();
    }
    
    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ 
      error: 'Failed to mark message as read',
      message: error.message
    });
  }
};

module.exports = {
  getMessages,
  createMessage,
  updateMessage,
  deleteMessage,
  markAsRead
};