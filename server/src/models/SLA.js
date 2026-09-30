import mongoose from 'mongoose';

const slaSchema = new mongoose.Schema(
  {
    priority: {
      type: String,
      required: [true, 'Priority is required for SLA policy'],
      unique: true,
      enum: {
        values: ['Low', 'Medium', 'High', 'Critical'],
        message: '{VALUE} is not a valid priority level',
      },
      index: true,
    },
    responseTimeHours: {
      type: Number,
      required: [true, 'Response time in hours is required'],
      min: [0, 'Response time cannot be negative'],
    },
    resolutionTimeHours: {
      type: Number,
      required: [true, 'Resolution time in hours is required'],
      min: [0.1, 'Resolution time must be greater than 0'],
    },
    status: {
      type: String,
      enum: {
        values: ['Active', 'Inactive'],
        message: '{VALUE} is not a valid SLA status',
      },
      default: 'Active',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const SLA = mongoose.model('SLA', slaSchema);
export default SLA;
