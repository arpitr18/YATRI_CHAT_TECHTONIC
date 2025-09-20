const express = require('express');
const { body, param } = require('express-validator');
const { auth, authRole } = require('../middleware/auth');
const {
  getRoutes,
  getRoute,
  createRoute,
  updateRoute,
  deleteRoute,
  searchRoutes
} = require('../controllers/routeController');

const router = express.Router();

// Validation rules
const createRouteValidation = [
  body('name')
    .isLength({ min: 3, max: 100 })
    .withMessage('Route name must be 3-100 characters'),
  body('code')
    .isLength({ min: 2, max: 10 })
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Route code must be 2-10 uppercase letters/numbers'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('stations')
    .optional()
    .isArray()
    .withMessage('Stations must be an array'),
  body('stations.*.name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Station name is required and must be max 100 characters'),
  body('stations.*.code')
    .optional()
    .isLength({ min: 1, max: 10 })
    .withMessage('Station code is required and must be max 10 characters'),
  body('stations.*.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude is required'),
  body('stations.*.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude is required'),
  body('stations.*.order')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Station order must be a positive integer')
];

const updateRouteValidation = [
  body('name')
    .optional()
    .isLength({ min: 3, max: 100 })
    .withMessage('Route name must be 3-100 characters'),
  body('code')
    .optional()
    .isLength({ min: 2, max: 10 })
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Route code must be 2-10 uppercase letters/numbers'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('stations')
    .optional()
    .isArray()
    .withMessage('Stations must be an array')
];

const mongoIdValidation = [
  param('routeId').isMongoId().withMessage('Valid route ID is required')
];

// Routes
router.get('/', auth, getRoutes);
router.get('/search', auth, searchRoutes);
router.get('/:routeId', auth, mongoIdValidation, getRoute);
router.post('/', auth, authRole(['admin', 'moderator']), createRouteValidation, createRoute);
router.put('/:routeId', auth, authRole(['admin', 'moderator']), mongoIdValidation, updateRouteValidation, updateRoute);
router.delete('/:routeId', auth, authRole(['admin', 'moderator']), mongoIdValidation, deleteRoute);

module.exports = router;