import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sequence: {
      type: Number,
      default: 1000,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Atomically increments and returns the next sequence number for a given key
 * @param {string} key - e.g., 'ticket'
 * @param {number} initialSeq - default start value (1001 if sequence starts at 1000)
 * @returns {Promise<number>} - Next sequence number
 */
counterSchema.statics.getNextSequence = async function (key, initialSeq = 1000) {
  const counter = await this.findOneAndUpdate(
    { key },
    { $inc: { sequence: 1 } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  return counter.sequence;
};

const Counter = mongoose.model('Counter', counterSchema);
export default Counter;
