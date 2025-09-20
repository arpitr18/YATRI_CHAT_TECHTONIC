const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/database');
const socketHandlers = require('./socket/socketHandlers');

// Route imports
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const messageRoutes = require('./routes/messageRoutes');
const routeRoutes = require('./routes/routeRoutes');
const moderationRoutes = require('./routes/moderationRoutes');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Socket.io handlers
socketHandlers(io);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/moderation', moderationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Demo data initialization
app.post('/api/init/demo-data', async (req, res) => {
  try {
    const Route = require('./models/Route');
    const ChatRoom = require('./models/ChatRoom');
    const User = require('./models/User');
    
    // Check if demo data already exists
    const existingRoutes = await Route.countDocuments({});
    if (existingRoutes > 0) {
      return res.json({ message: 'Demo data already exists' });
    }
    
    // Create or get system user for chat room creation
    let systemUser = await User.findOne({ username: 'system' });
    if (!systemUser) {
      systemUser = new User({
        phoneNumber: '+1000000000',
        username: 'system',
        fullName: 'System User',
        password: 'systempassword123',
        role: 'admin'
      });
      await systemUser.save();
    }
    
    // Create demo train routes
    const demoRoutes = [
      {
        name: 'Red Line',
        code: 'RL',
        description: 'North-South Main Line',
        stations: [
          { name: 'Central Station', code: 'CS', latitude: 40.7128, longitude: -74.0060, order: 1 },
          { name: 'Union Square', code: 'US', latitude: 40.7359, longitude: -73.9911, order: 2 },
          { name: 'Times Square', code: 'TS', latitude: 40.7580, longitude: -73.9855, order: 3 },
          { name: 'Grand Central', code: 'GC', latitude: 40.7527, longitude: -73.9772, order: 4 }
        ]
      },
      {
        name: 'Blue Line',
        code: 'BL',
        description: 'East-West Express',
        stations: [
          { name: 'Penn Station', code: 'PS', latitude: 40.7505, longitude: -73.9934, order: 1 },
          { name: 'Herald Square', code: 'HS', latitude: 40.7505, longitude: -73.9876, order: 2 },
          { name: 'Bryant Park', code: 'BP', latitude: 40.7536, longitude: -73.9832, order: 3 }
        ]
      }
    ];
    
    for (const routeData of demoRoutes) {
      const route = new Route(routeData);
      await route.save();
      
      // Create chat room for route
      const chatRoom = new ChatRoom({
        name: `${route.name} Chat`,
        description: `Chat room for ${route.name} commuters`,
        roomType: 'route',
        routeId: route._id,
        createdBy: systemUser._id // Use system user ID as creator for demo
      });
      await chatRoom.save();
    }
    
    // Create a general chat room
    const generalRoom = new ChatRoom({
      name: 'General Discussion',
      description: 'General chat for all commuters',
      roomType: 'general',
      createdBy: systemUser._id
    });
    await generalRoom.save();
    
    res.json({ message: 'Demo data initialized successfully' });
    
  } catch (error) {
    console.error('Initialize demo data error:', error);
    res.status(500).json({ error: 'Failed to initialize demo data' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 8001;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Yatri Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 Socket.io ready for real-time connections`);
});