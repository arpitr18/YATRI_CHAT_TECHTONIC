const express = require('express');
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
const {
  register,
  login,
  getProfile,
  updateProfile
} = require('../controllers/authController');

const router = express.Router();

// // Validation rules
// const registerValidation = [
//   body('phoneNumber')
//     .isMobilePhone()
//     .withMessage('Valid phone number is required'),
//   body('username')
//     .isLength({ min: 3, max: 30 })
//     // .matches(/^[a-zA-Z0-9_]+$/)
//     .withMessage('Username must be 3-30 characters and contain only letters, numbers, and underscores'),
//   body('password')
//     .isLength({ min: 6 })
//     .withMessage('Password must be at least 6 characters'),
//   body('email')
//     .optional()
//     .isEmail()
//     .withMessage('Valid email is required'),
//   body('fullName')
//     .optional()
//     .isLength({ max: 100 })
//     .withMessage('Full name cannot exceed 100 characters')
// ];

// const loginValidation = [
//   body('phoneNumber')
//     .isMobilePhone()
//     .withMessage('Valid phone number is required'),
//   body('password')
//     .notEmpty()
//     .withMessage('Password is required')
// ];

// const updateProfileValidation = [
//   body('username')
//     .optional()
//     .isLength({ min: 3, max: 30 })
//     .matches(/^[a-zA-Z0-9_]+$/)
//     .withMessage('Username must be 3-30 characters and contain only letters, numbers, and underscores'),
//   body('email')
//     .optional()
//     .isEmail()
//     .withMessage('Valid email is required'),
//   body('fullName')
//     .optional()
//     .isLength({ max: 100 })
//     .withMessage('Full name cannot exceed 100 characters'),
//   body('avatar')
//     .optional()
//     .isString()
//     .withMessage('Avatar must be a string (base64)'),
//   body('preferredRoutes')
//     .optional()
//     .isArray()
//     .withMessage('Preferred routes must be an array')
// ];

// Routes
// router.post('/register', registerValidation, register);
// router.post('/login', loginValidation, login);
// router.get('/profile', auth, getProfile);
// router.put('/profile', auth, updateProfileValidation, updateProfile);

router.post('/register',  register);
router.post('/login',  login);
router.get('/profile', auth, getProfile);
router.put('/profile', auth,  updateProfile);

module.exports = router;