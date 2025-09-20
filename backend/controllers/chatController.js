const { validationResult } = require('express-validator');
const ChatRoom = require('../models/ChatRoom');
const Route = require('../models/Route');

// Get all chat rooms
const getChatRooms = async (req, res) => {
  try {
    const rooms = await ChatRoom.find({ isActive: true })
      .populate('routeId', 'name code')
      .populate('createdBy', 'username')
      .sort({ lastMessageAt: -1 })
      .limit(50);
    
    res.json({
      success: true,
      data: {
        rooms
      }
    });
  } catch (error) {
    console.error('Get chat rooms error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch chat rooms',
      message: error.message
    });
  }
};

// Get specific chat room
const getChatRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await ChatRoom.findOne({ _id: roomId, isActive: true })
      .populate('routeId', 'name code stations')
      .populate('createdBy', 'username')
      .populate('activeUsers', 'username isOnline avatar');
    
    if (!room) {
      return res.status(404).json({ error: 'Chat room not found' });
    }
    
    res.json({
      success: true,
      data: {
        room
      }
    });
  } catch (error) {
    console.error('Get chat room error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch chat room',
      message: error.message
    });
  }
};

// Create new chat room
const createChatRoom = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const { name, description, roomType, routeId, stationId } = req.body;
    
    // Validate route exists if route-based room
    if (roomType === 'route' && routeId) {
      const route = await Route.findOne({ _id: routeId, isActive: true });
      if (!route) {
        return res.status(404).json({ error: 'Route not found' });
      }
    }
    
    const room = new ChatRoom({
      name,
      description,
      roomType,
      routeId: roomType === 'route' ? routeId : undefined,
      stationId: roomType === 'station' ? stationId : undefined,
      createdBy: req.user._id
    });
    
    await room.save();
    
    // Populate the created room
    await room.populate('routeId', 'name code');
    await room.populate('createdBy', 'username');
    
    res.status(201).json({
      success: true,
      message: 'Chat room created successfully',
      data: {
        room
      }
    });
  } catch (error) {
    console.error('Create chat room error:', error);
    res.status(500).json({ 
      error: 'Failed to create chat room',
      message: error.message
    });
  }
};

// Join chat room
const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;
    
    const room = await ChatRoom.findOne({ _id: roomId, isActive: true });
    if (!room) {
      return res.status(404).json({ error: 'Chat room not found' });
    }
    
    // Add user to active users if not already present
    if (!room.activeUsers.includes(userId)) {
      room.activeUsers.push(userId);
      room.totalMembers = room.activeUsers.length;
      await room.save();
    }
    
    res.json({
      success: true,
      message: 'Joined room successfully',
      data: {
        roomId,
        activeUsersCount: room.activeUsers.length
      }
    });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ 
      error: 'Failed to join room',
      message: error.message
    });
  }
};

// Leave chat room
const leaveRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;
    
    const room = await ChatRoom.findOne({ _id: roomId, isActive: true });
    if (!room) {
      return res.status(404).json({ error: 'Chat room not found' });
    }
    
    // Remove user from active users
    room.activeUsers = room.activeUsers.filter(id => !id.equals(userId));
    room.totalMembers = room.activeUsers.length;
    await room.save();
    
    res.json({
      success: true,
      message: 'Left room successfully',
      data: {
        roomId,
        activeUsersCount: room.activeUsers.length
      }
    });
  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({ 
      error: 'Failed to leave room',
      message: error.message
    });
  }
};

// Get room users
const getRoomUsers = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await ChatRoom.findOne({ _id: roomId, isActive: true })
      .populate('activeUsers', 'username isOnline avatar lastActive');
    
    if (!room) {
      return res.status(404).json({ error: 'Chat room not found' });
    }
    
    res.json({
      success: true,
      data: {
        roomId,
        activeUsers: room.activeUsers,
        totalCount: room.activeUsers.length
      }
    });
  } catch (error) {
    console.error('Get room users error:', error);
    res.status(500).json({ 
      error: 'Failed to get room users',
      message: error.message
    });
  }
};

module.exports = {
  getChatRooms,
  getChatRoom,
  createChatRoom,
  joinRoom,
  leaveRoom,
  getRoomUsers
};