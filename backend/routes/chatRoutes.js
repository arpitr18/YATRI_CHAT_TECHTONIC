const express = require('express');
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
const {
  getChatRooms,
  getChatRoom,
  createChatRoom,
  joinRoom,
  leaveRoom,
  getRoomUsers
} = require('../controllers/chatController');

const router = express.Router();

// Validation rules
const createChatRoomValidation = [
  body('name')
    .isLength({ min: 3, max: 100 })
    .withMessage('Room name must be 3-100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('roomType')
    .isIn(['route', 'station', 'general'])
    .withMessage('Room type must be route, station, or general'),
  body('routeId')
    .optional()
    .isMongoId()
    .withMessage('Valid route ID is required'),
  body('stationId')
    .optional()
    .isString()
    .withMessage('Station ID must be a string')
];

// Routes
router.get('/rooms', auth, getChatRooms);
router.get('/rooms/:roomId', auth, getChatRoom);
router.post('/rooms', auth, createChatRoomValidation, createChatRoom);
router.post('/rooms/:roomId/join', auth, joinRoom);
router.post('/rooms/:roomId/leave', auth, leaveRoom);
router.get('/rooms/:roomId/users', auth, getRoomUsers);

module.exports = router;