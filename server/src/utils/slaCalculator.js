import SLA from '../models/SLA.js';

// Default fallback resolution hours if custom SLA policies are not seeded yet
const DEFAULT_SLA_HOURS = {
  Low: 48,
  Medium: 24,
  High: 8,
  Critical: 4,
};

/**
 * Calculates the SLA due timestamp for a ticket based on priority and SLA policies
 * @param {string} priority - Ticket priority ('Low', 'Medium', 'High', 'Critical')
 * @param {Date} [baseDate=new Date()] - Ticket creation or escalation date
 * @returns {Promise<Date>} Calculated SLA due date
 */
export const calculateSlaDueDate = async (priority = 'Medium', baseDate = new Date()) => {
  let resolutionHours = DEFAULT_SLA_HOURS[priority] || 24;

  try {
    const policy = await SLA.findOne({ priority, status: 'Active' }).lean();
    if (policy && policy.resolutionTimeHours) {
      resolutionHours = policy.resolutionTimeHours;
    }
  } catch (error) {
    console.warn(`[SLA Calculator] Could not fetch SLA policy for ${priority}, using fallback: ${resolutionHours}h`);
  }

  const slaDueAt = new Date(baseDate.getTime() + resolutionHours * 60 * 60 * 1000);
  return slaDueAt;
};

/**
 * Evaluates the current SLA health status based on slaDueAt timestamp
 * @param {Date} slaDueAt - SLA due timestamp
 * @param {Date} [now=new Date()] - Current timestamp
 * @returns {'Healthy' | 'Approaching' | 'Breached'}
 */
export const evaluateSlaStatus = (slaDueAt, now = new Date()) => {
  if (!slaDueAt) return 'Healthy';

  const dueTime = new Date(slaDueAt).getTime();
  const currentTime = new Date(now).getTime();
  const diffMs = dueTime - currentTime;

  if (diffMs <= 0) {
    return 'Breached';
  }

  // Approaching if less than 2 hours remaining or less than 20%
  const twoHoursMs = 2 * 60 * 60 * 1000;
  if (diffMs <= twoHoursMs) {
    return 'Approaching';
  }

  return 'Healthy';
};
