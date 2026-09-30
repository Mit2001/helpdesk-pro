import mongoose from 'mongoose';

const commentAttachmentSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },
    fileType: {
      type: String,
      default: 'application/octet-stream',
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const commentSchema = new mongoose.Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: [true, 'Ticket reference is required'],
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author reference is required'],
    },
    message: {
      type: String,
      required: [true, 'Comment message is required'],
      trim: true,
    },
    visibility: {
      type: String,
      enum: {
        values: ['Public', 'Internal'],
        message: '{VALUE} is not a valid comment visibility',
      },
      default: 'Public',
      index: true,
    },
    attachments: [commentAttachmentSchema],
  },
  {
    timestamps: true,
  }
);

// Indexes for chronological conversation querying
commentSchema.index({ ticket: 1, createdAt: 1 });
commentSchema.index({ ticket: 1, visibility: 1 });

const Comment = mongoose.model('Comment', commentSchema);
export default Comment;
