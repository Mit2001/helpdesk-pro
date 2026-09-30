import Counter from '../models/Counter.js';

/**
 * Generates the next sequential ticket number atomically
 * Example output: HD-1001, HD-1002
 * @returns {Promise<string>} Formatted ticket number
 */
export const generateTicketNumber = async () => {
  const seq = await Counter.getNextSequence('ticket', 1000);
  return `HD-${seq}`;
};
