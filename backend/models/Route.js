const mongoose = require('mongoose');

const stationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Station name is required']
  },
  code: {
    type: String,
    required: [true, 'Station code is required']
  },
  latitude: {
    type: Number,
    required: [true, 'Station latitude is required']
  },
  longitude: {
    type: Number,
    required: [true, 'Station longitude is required']
  },
  order: {
    type: Number,
    required: [true, 'Station order is required']
  }
});

const routeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Route name is required'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Route code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  stations: [stationSchema],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for performance
routeSchema.index({ code: 1 });
routeSchema.index({ isActive: 1 });

module.exports = mongoose.model('Route', routeSchema);