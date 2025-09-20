const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

// Register user
const register = async (req, res) => {
  try {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({ 
    //     error: 'Validation failed',
    //     details: errors.array()
    //   });
    // }
    
    const { phoneNumber, username, password, email, fullName } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { phoneNumber },
        { username }
      ]
    });
    
    if (existingUser) {
      if (existingUser.phoneNumber === phoneNumber) {
        return res.status(400).json({ error: 'Phone number already registered' });
      } else {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }
    
    // Create new user
    const user = new User({
      phoneNumber,
      username,
      password,
      email,
      fullName
    });
    
    await user.save();
    
    // Generate token
    const token = generateToken(user._id);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: user.toJSON(),
        expiresIn: '7d'
      }
    });
    
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      message: error.message
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({ 
    //     error: 'Validation failed',
    //     details: errors.array()
    //   });
    // }
    
    const { phoneNumber, password } = req.body;
    
    // Find user and include password for comparison
    const user = await User.findOne({ phoneNumber }).select('+password');
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid phone number or password' });
    }
    
    if (user.status !== 'active') {
      return res.status(401).json({ error: 'Account is not active' });
    }
    
    // Update last active
    user.lastActive = new Date();
    await user.save();
    
    // Generate token
    const token = generateToken(user._id);
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: user.toJSON(),
        expiresIn: '7d'
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      message: error.message
    });
  }
};

// Get user profile
const getProfile = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      error: 'Failed to get profile',
      message: error.message
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({ 
    //     error: 'Validation failed',
    //     details: errors.array()
    //   });
    // }
    
    const { username, email, fullName, avatar, preferredRoutes } = req.body;
    const updateData = {};
    
    // Only include provided fields
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (fullName !== undefined) updateData.fullName = fullName;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (preferredRoutes !== undefined) updateData.preferredRoutes = preferredRoutes;
    
    // Check if username is being updated and is available
    if (username && username !== req.user.username) {
      const existingUser = await User.findOne({
        username,
        _id: { $ne: req.user._id }
      });
      
      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser
      }
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      error: 'Failed to update profile',
      message: error.message
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile
};