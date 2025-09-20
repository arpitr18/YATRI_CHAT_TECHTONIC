const { validationResult } = require('express-validator');
const Route = require('../models/Route');
const ChatRoom = require('../models/ChatRoom');

// Get all routes
const getRoutes = async (req, res) => {
  try {
    const routes = await Route.find({ isActive: true }).sort({ name: 1 });
    
    res.json({
      success: true,
      data: {
        routes
      }
    });
  } catch (error) {
    console.error('Get routes error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch routes',
      message: error.message
    });
  }
};

// Get specific route
const getRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    
    const route = await Route.findOne({ _id: routeId, isActive: true });
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    res.json({
      success: true,
      data: {
        route
      }
    });
  } catch (error) {
    console.error('Get route error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch route',
      message: error.message
    });
  }
};

// Create new route
const createRoute = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const { name, code, description, stations } = req.body;
    
    // Check if route code already exists
    const existingRoute = await Route.findOne({ code: code.toUpperCase() });
    if (existingRoute) {
      return res.status(400).json({ error: 'Route code already exists' });
    }
    
    const route = new Route({
      name,
      code: code.toUpperCase(),
      description,
      stations: stations || []
    });
    
    await route.save();
    
    // Auto-create chat room for this route
    const chatRoom = new ChatRoom({
      name: `${route.name} Chat`,
      description: `Chat room for ${route.name} commuters`,
      roomType: 'route',
      routeId: route._id,
      createdBy: req.user._id
    });
    
    await chatRoom.save();
    
    res.status(201).json({
      success: true,
      message: 'Route created successfully',
      data: {
        route,
        chatRoom: chatRoom._id
      }
    });
  } catch (error) {
    console.error('Create route error:', error);
    res.status(500).json({ 
      error: 'Failed to create route',
      message: error.message
    });
  }
};

// Update route
const updateRoute = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const { routeId } = req.params;
    const { name, code, description, stations } = req.body;
    
    const route = await Route.findOne({ _id: routeId, isActive: true });
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    // Check if new code conflicts with existing routes
    if (code && code.toUpperCase() !== route.code) {
      const existingRoute = await Route.findOne({ 
        code: code.toUpperCase(),
        _id: { $ne: routeId }
      });
      if (existingRoute) {
        return res.status(400).json({ error: 'Route code already exists' });
      }
    }
    
    // Update fields
    if (name) route.name = name;
    if (code) route.code = code.toUpperCase();
    if (description !== undefined) route.description = description;
    if (stations) route.stations = stations;
    
    await route.save();
    
    res.json({
      success: true,
      message: 'Route updated successfully',
      data: {
        route
      }
    });
  } catch (error) {
    console.error('Update route error:', error);
    res.status(500).json({ 
      error: 'Failed to update route',
      message: error.message
    });
  }
};

// Delete route (soft delete)
const deleteRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    
    const route = await Route.findOne({ _id: routeId, isActive: true });
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    // Soft delete route
    route.isActive = false;
    await route.save();
    
    // Also deactivate associated chat rooms
    await ChatRoom.updateMany(
      { routeId: routeId },
      { $set: { isActive: false } }
    );
    
    res.json({
      success: true,
      message: 'Route deleted successfully'
    });
  } catch (error) {
    console.error('Delete route error:', error);
    res.status(500).json({ 
      error: 'Failed to delete route',
      message: error.message
    });
  }
};

// Search routes
const searchRoutes = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }
    
    const routes = await Route.find({
      isActive: true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { code: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { 'stations.name': { $regex: query, $options: 'i' } }
      ]
    }).limit(20);
    
    res.json({
      success: true,
      data: {
        routes,
        query
      }
    });
  } catch (error) {
    console.error('Search routes error:', error);
    res.status(500).json({ 
      error: 'Failed to search routes',
      message: error.message
    });
  }
};

module.exports = {
  getRoutes,
  getRoute,
  createRoute,
  updateRoute,
  deleteRoute,
  searchRoutes
};