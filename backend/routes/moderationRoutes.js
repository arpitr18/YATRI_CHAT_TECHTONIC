const express = require('express');
const { body, param } = require('express-validator');
const { auth, authRole } = require('../middleware/auth');
const {
  createReport,
  getReports,
  updateReportStatus,
  blockUser,
  unblockUser,
  getModerationStats
} = require('../controllers/moderationController');

const router = express.Router();

// Validation rules
const createReportValidation = [
  body('reportedUserId')
    .optional()
    .isMongoId()
    .withMessage('Valid user ID is required'),
  body('reportedMessageId')
    .optional()
    .isMongoId()
    .withMessage('Valid message ID is required'),
  body('reportType')
    .isIn(['spam', 'harassment', 'inappropriate_content', 'fake_information', 'other'])
    .withMessage('Valid report type is required'),
  body('description')
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be 10-500 characters')
];

const updateReportValidation = [
  body('status')
    .isIn(['pending', 'reviewed', 'resolved', 'rejected'])
    .withMessage('Valid status is required'),
  body('resolutionNote')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Resolution note cannot exceed 1000 characters')
];

const blockUserValidation = [
  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters')
];

const mongoIdValidation = [
  param('reportId').isMongoId().withMessage('Valid report ID is required')
];

const userIdValidation = [
  param('userId').isMongoId().withMessage('Valid user ID is required')
];

// Routes
router.post('/report', auth, createReportValidation, createReport);
router.get('/reports', auth, authRole(['admin', 'moderator']), getReports);
router.put('/reports/:reportId', auth, authRole(['admin', 'moderator']), mongoIdValidation, updateReportValidation, updateReportStatus);
router.post('/block/:userId', auth, authRole(['admin', 'moderator']), userIdValidation, blockUserValidation, blockUser);
router.post('/unblock/:userId', auth, authRole(['admin', 'moderator']), userIdValidation, unblockUser);
router.get('/stats', auth, authRole(['admin', 'moderator']), getModerationStats);

module.exports = router;