const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');

const socketHandlers = (io) => {
  // Store connected users and their rooms
  const connectedUsers = new Map(); // socketId -> { userId, username, rooms: Set() }
  const userSockets = new Map(); // userId -> Set of socketIds

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await User.findById(decoded.userId);
      
      if (!user || user.status !== 'active') {
        return next(new Error('Authentication error: User not found or inactive'));
      }

      socket.userId = user._id.toString();
      socket.username = user.username;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    const username = socket.username;
    
    console.log(`🔌 User ${username} (${userId}) connected with socket ${socket.id}`);

    // Track connected user
    connectedUsers.set(socket.id, {
      userId,
      username,
      rooms: new Set()
    });

    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);

    // Update user online status
    try {
      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastActive: new Date()
      });
    } catch (error) {
      console.error('Error updating user online status:', error);
    }

    // Handle joining a room
    socket.on('join_room', async (data) => {
      try {
        const { roomId } = data;
        
        if (!roomId) {
          socket.emit('error', { message: 'Room ID is required' });
          return;
        }

        // Verify room exists and is active
        const room = await ChatRoom.findOne({ _id: roomId, isActive: true });
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Join socket room
        await socket.join(roomId);
        
        // Track user in room
        const userInfo = connectedUsers.get(socket.id);
        if (userInfo) {
          userInfo.rooms.add(roomId);
        }

        // Add user to room's active users if not already present
        if (!room.activeUsers.includes(userId)) {
          room.activeUsers.push(userId);
          room.totalMembers = room.activeUsers.length;
          await room.save();
        }

        // Notify other users in the room
        socket.to(roomId).emit('user_joined', {
          userId,
          username,
          roomId
        });

        socket.emit('room_joined', { 
          roomId,
          roomName: room.name,
          activeUsersCount: room.activeUsers.length
        });

        console.log(`👥 User ${username} joined room ${room.name}`);

      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Handle leaving a room
    socket.on('leave_room', async (data) => {
      try {
        const { roomId } = data;
        
        if (!roomId) {
          socket.emit('error', { message: 'Room ID is required' });
          return;
        }

        await leaveRoom(socket, roomId, userId, username);
        socket.emit('room_left', { roomId });

      } catch (error) {
        console.error('Leave room error:', error);
        socket.emit('error', { message: 'Failed to leave room' });
      }
    });

    // Handle sending messages
    socket.on('send_message', async (data) => {
      try {
        const { roomId, content, messageType = 'text', imageData, commuteUpdate, replyTo } = data;

        if (!roomId) {
          socket.emit('error', { message: 'Room ID is required' });
          return;
        }

        if (!content && !imageData && !commuteUpdate) {
          socket.emit('error', { message: 'Message content is required' });
          return;
        }

        // Verify room exists and user is in room
        const room = await ChatRoom.findOne({
          _id: roomId,
          isActive: true,
          activeUsers: userId
        });

        if (!room) {
          socket.emit('error', { message: 'Room not found or user not in room' });
          return;
        }

        // Create and save message
        const message = new Message({
          roomId,
          senderId: userId,
          senderUsername: username,
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

        // Populate message for broadcasting
        await message.populate('senderId', 'username avatar');
        if (replyTo) {
          await message.populate('replyTo', 'content senderUsername');
        }

        // Broadcast message to all users in the room
        io.to(roomId).emit('new_message', message);

        console.log(`💬 Message sent by ${username} in room ${room.name}`);

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
      try {
        const { roomId, isTyping } = data;
        
        if (!roomId) return;

        // Broadcast typing status to other users in the room
        socket.to(roomId).emit('user_typing', {
          userId,
          username,
          roomId,
          isTyping
        });

      } catch (error) {
        console.error('Typing error:', error);
      }
    });

    // Handle commute updates
    socket.on('commute_update', async (data) => {
      try {
        const { roomId, updateType } = data;

        if (!roomId || !updateType) {
          socket.emit('error', { message: 'Room ID and update type are required' });
          return;
        }

        // Verify room exists and user is in room
        const room = await ChatRoom.findOne({
          _id: roomId,
          isActive: true,
          activeUsers: userId
        });

        if (!room) {
          socket.emit('error', { message: 'Room not found or user not in room' });
          return;
        }

        // Create update messages
        const updateMessages = {
          delayed: '🚂 Trains are running delayed',
          on_time: '✅ Trains are running on time',
          crowded: '👥 Trains are crowded',
          normal: '😌 Normal crowd levels',
          cancelled: '❌ Services cancelled'
        };

        const message = new Message({
          roomId,
          senderId: userId,
          senderUsername: username,
          messageType: 'update',
          content: updateMessages[updateType] || 'Commute update',
          commuteUpdate: updateType
        });

        await message.save();

        // Update room timestamp
        room.lastMessageAt = new Date();
        await room.save();

        // Broadcast update to room
        io.to(roomId).emit('commute_update', {
          message,
          updateType,
          username
        });

        console.log(`📢 Commute update (${updateType}) by ${username} in room ${room.name}`);

      } catch (error) {
        console.error('Commute update error:', error);
        socket.emit('error', { message: 'Failed to send commute update' });
      }
    });

    // Handle getting room users
    socket.on('get_room_users', async (data) => {
      try {
        const { roomId } = data;
        
        if (!roomId) {
          socket.emit('error', { message: 'Room ID is required' });
          return;
        }

        const room = await ChatRoom.findOne({ _id: roomId, isActive: true })
          .populate('activeUsers', 'username isOnline avatar lastActive');

        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        socket.emit('room_users', {
          roomId,
          activeUsers: room.activeUsers,
          totalCount: room.activeUsers.length
        });

      } catch (error) {
        console.error('Get room users error:', error);
        socket.emit('error', { message: 'Failed to get room users' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      try {
        console.log(`🔌 User ${username} (${userId}) disconnected`);

        const userInfo = connectedUsers.get(socket.id);
        if (userInfo) {
          // Leave all rooms
          for (const roomId of userInfo.rooms) {
            await leaveRoom(socket, roomId, userId, username, false);
          }
          connectedUsers.delete(socket.id);
        }

        // Remove socket from user's socket set
        if (userSockets.has(userId)) {
          userSockets.get(userId).delete(socket.id);
          
          // If user has no more active sockets, update offline status
          if (userSockets.get(userId).size === 0) {
            userSockets.delete(userId);
            await User.findByIdAndUpdate(userId, {
              isOnline: false,
              lastActive: new Date()
            });
          }
        }

      } catch (error) {
        console.error('Disconnect error:', error);
      }
    });
  });

  // Helper function to leave a room
  async function leaveRoom(socket, roomId, userId, username, emitToSocket = true) {
    try {
      // Leave socket room
      await socket.leave(roomId);
      
      // Update user tracking
      const userInfo = connectedUsers.get(socket.id);
      if (userInfo) {
        userInfo.rooms.delete(roomId);
      }

      // Remove user from room's active users
      const room = await ChatRoom.findById(roomId);
      if (room) {
        room.activeUsers = room.activeUsers.filter(id => !id.equals(userId));
        room.totalMembers = room.activeUsers.length;
        await room.save();

        // Notify other users in the room
        socket.to(roomId).emit('user_left', {
          userId,
          username,
          roomId
        });

        console.log(`👥 User ${username} left room ${room.name}`);
      }

    } catch (error) {
      console.error('Leave room helper error:', error);
    }
  }
};

module.exports = socketHandlers;