const { validationResult } = require('express-validator');
const Report = require('../models/Report');
const Message = require('../models/Message');
const User = require('../models/User');

// Create a report
const createReport = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const { reportedUserId, reportedMessageId, reportType, description } = req.body;
    
    // Validate reported content exists
    if (reportedMessageId) {
      const message = await Message.findById(reportedMessageId);
      if (!message) {
        return res.status(404).json({ error: 'Reported message not found' });
      }
    }
    
    if (reportedUserId) {
      const user = await User.findById(reportedUserId);
      if (!user) {
        return res.status(404).json({ error: 'Reported user not found' });
      }
    }
    
    // Check if user has already reported this content
    const existingReport = await Report.findOne({
      reporterId: req.user._id,
      $or: [
        { reportedUserId },
        { reportedMessageId }
      ]
    });
    
    if (existingReport) {
      return res.status(400).json({ error: 'You have already reported this content' });
    }
    
    const report = new Report({
      reporterId: req.user._id,
      reportedUserId,
      reportedMessageId,
      reportType,
      description
    });
    
    await report.save();
    
    // Populate for response
    await report.populate('reporterId', 'username');
    if (reportedUserId) {
      await report.populate('reportedUserId', 'username');
    }
    if (reportedMessageId) {
      await report.populate('reportedMessageId', 'content senderUsername');
    }
    
    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      data: {
        report
      }
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ 
      error: 'Failed to create report',
      message: error.message
    });
  }
};

// Get reports (admin/moderator only)
const getReports = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (status) {
      filter.status = status;
    }
    
    const skip = (page - 1) * limit;
    const reports = await Report.find(filter)
      .populate('reporterId', 'username')
      .populate('reportedUserId', 'username')
      .populate('reportedMessageId', 'content senderUsername')
      .populate('reviewedBy', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const totalReports = await Report.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalReports / limit),
          totalReports,
          hasMore: skip + reports.length < totalReports
        }
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch reports',
      message: error.message
    });
  }
};

// Update report status (admin/moderator only)
const updateReportStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const { reportId } = req.params;
    const { status, resolutionNote } = req.body;
    
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    report.status = status;
    report.reviewedBy = req.user._id;
    report.resolutionNote = resolutionNote;
    
    if (status === 'resolved') {
      report.resolvedAt = new Date();
    }
    
    await report.save();
    
    // Populate for response
    await report.populate('reporterId', 'username');
    await report.populate('reviewedBy', 'username');
    
    res.json({
      success: true,
      message: 'Report status updated successfully',
      data: {
        report
      }
    });
  } catch (error) {
    console.error('Update report status error:', error);
    res.status(500).json({ 
      error: 'Failed to update report status',
      message: error.message
    });
  }
};

// Block user (admin/moderator only)
const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Cannot block an admin user' });
    }
    
    user.status = 'banned';
    await user.save();
    
    // Create a system report for the action
    const report = new Report({
      reporterId: req.user._id,
      reportedUserId: userId,
      reportType: 'other',
      description: `User blocked by ${req.user.role}: ${reason || 'No reason provided'}`,
      status: 'resolved',
      reviewedBy: req.user._id,
      resolutionNote: 'User blocked by moderator',
      resolvedAt: new Date()
    });
    
    await report.save();
    
    res.json({
      success: true,
      message: 'User blocked successfully',
      data: {
        blockedUser: user.username,
        reason
      }
    });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ 
      error: 'Failed to block user',
      message: error.message
    });
  }
};

// Unblock user (admin/moderator only)
const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.status = 'active';
    await user.save();
    
    res.json({
      success: true,
      message: 'User unblocked successfully',
      data: {
        unblockedUser: user.username
      }
    });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ 
      error: 'Failed to unblock user',
      message: error.message
    });
  }
};

// Get moderation stats (admin/moderator only)
const getModerationStats = async (req, res) => {
  try {
    const totalReports = await Report.countDocuments();
    const pendingReports = await Report.countDocuments({ status: 'pending' });
    const resolvedReports = await Report.countDocuments({ status: 'resolved' });
    const bannedUsers = await User.countDocuments({ status: 'banned' });
    
    // Recent reports (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentReports = await Report.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });
    
    res.json({
      success: true,
      data: {
        stats: {
          totalReports,
          pendingReports,
          resolvedReports,
          bannedUsers,
          recentReports
        }
      }
    });
  } catch (error) {
    console.error('Get moderation stats error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch moderation stats',
      message: error.message
    });
  }
};

module.exports = {
  createReport,
  getReports,
  updateReportStatus,
  blockUser,
  unblockUser,
  getModerationStats
};