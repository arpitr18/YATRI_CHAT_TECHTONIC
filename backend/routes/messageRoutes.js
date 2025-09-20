const express = require('express');
const { body, param } = require('express-validator');
const { auth } = require('../middleware/auth');
const {
  getMessages,
  createMessage,
  updateMessage,
  deleteMessage,
  markAsRead
} = require('../controllers/messageController');

const router = express.Router();

// Validation rules
const createMessageValidation = [
  body('roomId')
    .isMongoId()
    .withMessage('Valid room ID is required'),
  body('content')
    .optional()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message content must be 1-1000 characters'),
  body('messageType')
    .optional()
    .isIn(['text', 'image', 'system', 'update'])
    .withMessage('Message type must be text, image, system, or update'),
  body('imageData')
    .optional()
    .isString()
    .withMessage('Image data must be a string (base64)'),
  body('commuteUpdate')
    .optional()
    .isIn(['delayed', 'on_time', 'crowded', 'normal', 'cancelled'])
    .withMessage('Invalid commute update type'),
  body('replyTo')
    .optional()
    .isMongoId()
    .withMessage('Reply to must be a valid message ID')
];

const updateMessageValidation = [
  body('content')
    .optional()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message content must be 1-1000 characters'),
  body('imageData')
    .optional()
    .isString()
    .withMessage('Image data must be a string (base64)')
];

const mongoIdValidation = [
  param('roomId').isMongoId().withMessage('Valid room ID is required')
];

const messageIdValidation = [
  param('messageId').isMongoId().withMessage('Valid message ID is required')
];

// Routes
router.get('/:roomId', auth, mongoIdValidation, getMessages);
router.post('/', auth, createMessageValidation, createMessage);
router.put('/:messageId', auth, messageIdValidation, updateMessageValidation, updateMessage);
router.delete('/:messageId', auth, messageIdValidation, deleteMessage);
router.post('/:messageId/read', auth, messageIdValidation, markAsRead);

module.exports = router;