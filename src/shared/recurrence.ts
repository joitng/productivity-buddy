import { getDay, getDate, getWeek, startOfMonth, addDays, isSameDay, differenceInWeeks, getWeekOfMonth, format } from 'date-fns';
import type { RecurrenceRule } from './types';

/**
 * Check if a recurrence rule applies to a given date
 */
export function isChunkActiveOnDate(rule: RecurrenceRule, date: Date): boolean {
  const dayOfWeek = getDay(date); // 0 = Sunday, 6 = Saturday

  switch (rule.type) {
    case 'once':
      // Check if the specific date matches
      if (!rule.specificDate) return false;
      const targetDate = format(date, 'yyyy-MM-dd');
      return targetDate === rule.specificDate;

    case 'weekly':
      // Check if the day of week matches
      return rule.daysOfWeek?.includes(dayOfWeek) ?? false;

    case 'biweekly':
      // Check if the day of week matches and it's the right week
      if (!rule.daysOfWeek?.includes(dayOfWeek)) {
        return false;
      }
      // Calculate weeks difference from anchor date
      if (rule.anchorDate) {
        const anchor = new Date(rule.anchorDate);
        const weeksDiff = differenceInWeeks(date, anchor);
        // Active when difference is even (0, 2, 4, etc.)
        return weeksDiff % 2 === 0;
      }
      // Fallback to ISO week numbers if no anchor date (legacy behavior)
      const weekNumber = getWeek(date);
      return weekNumber % 2 === 1;

    case 'monthly':
      // Check if the day of month matches
      return getDate(date) === rule.dayOfMonth;

    case 'nth_weekday':
      // Check if it's the nth occurrence of a specific weekday in the month
      if (dayOfWeek !== rule.weekday) {
        return false;
      }
      const nthOccurrence = getNthWeekdayOccurrence(date);
      return nthOccurrence === rule.nthWeek;

    default:
      return false;
  }
}

/**
 * Get which occurrence of the weekday this date is within its month
 * e.g., the 2nd Tuesday of the month returns 2
 */
function getNthWeekdayOccurrence(date: Date): number {
  const dayOfMonth = getDate(date);
  return Math.ceil(dayOfMonth / 7);
}

/**
 * Alternative: use date-fns getWeekOfMonth
 */
export function getWeekdayOccurrenceInMonth(date: Date): number {
  return getWeekOfMonth(date);
}

/**
 * Get all dates within a range where a recurrence rule applies
 */
export function getOccurrencesInRange(rule: RecurrenceRule, startDate: Date, endDate: Date): Date[] {
  const occurrences: Date[] = [];
  let current = new Date(startDate);

  while (current <= endDate) {
    if (isChunkActiveOnDate(rule, current)) {
      occurrences.push(new Date(current));
    }
    current = addDays(current, 1);
  }

  return occurrences;
}

/**
 * Get the next occurrence of a recurrence rule from a given date
 */
export function getNextOccurrence(rule: RecurrenceRule, fromDate: Date): Date | null {
  let current = addDays(fromDate, 1);
  const maxLookAhead = 365; // Don't look more than a year ahead

  for (let i = 0; i < maxLookAhead; i++) {
    if (isChunkActiveOnDate(rule, current)) {
      return current;
    }
    current = addDays(current, 1);
  }

  return null;
}

/**
 * Create a recurrence rule for weekly occurrence
 */
export function createWeeklyRule(daysOfWeek: number[]): RecurrenceRule {
  return {
    type: 'weekly',
    daysOfWeek,
  };
}

/**
 * Create a recurrence rule for biweekly occurrence
 */
export function createBiweeklyRule(daysOfWeek: number[], anchorDate?: string): RecurrenceRule {
  return {
    type: 'biweekly',
    daysOfWeek,
    anchorDate: anchorDate || new Date().toISOString().split('T')[0],
  };
}

/**
 * Create a recurrence rule for monthly occurrence on a specific day
 */
export function createMonthlyRule(dayOfMonth: number): RecurrenceRule {
  return {
    type: 'monthly',
    dayOfMonth,
  };
}

/**
 * Create a recurrence rule for nth weekday of month (e.g., 2nd Tuesday)
 */
export function createNthWeekdayRule(nthWeek: number, weekday: number): RecurrenceRule {
  return {
    type: 'nth_weekday',
    nthWeek,
    weekday,
  };
}

/**
 * Get human-readable description of a recurrence rule
 */
export function describeRecurrence(rule: RecurrenceRule): string {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const ordinals = ['', '1st', '2nd', '3rd', '4th', '5th'];

  switch (rule.type) {
    case 'once':
      return rule.specificDate ? `Once on ${rule.specificDate}` : 'No repeat';

    case 'weekly':
      if (!rule.daysOfWeek || rule.daysOfWeek.length === 0) return 'Weekly';
      if (rule.daysOfWeek.length === 7) return 'Every day';
      if (rule.daysOfWeek.length === 5 && !rule.daysOfWeek.includes(0) && !rule.daysOfWeek.includes(6)) {
        return 'Weekdays';
      }
      const days = rule.daysOfWeek.map((d) => dayNames[d]).join(', ');
      return `Every ${days}`;

    case 'biweekly':
      if (!rule.daysOfWeek || rule.daysOfWeek.length === 0) return 'Biweekly';
      const biweeklyDays = rule.daysOfWeek.map((d) => dayNames[d]).join(', ');
      return `Every other ${biweeklyDays}`;

    case 'monthly':
      return `Monthly on day ${rule.dayOfMonth}`;

    case 'nth_weekday':
      const nth = ordinals[rule.nthWeek || 1];
      const weekdayName = dayNames[rule.weekday || 0];
      return `${nth} ${weekdayName} of each month`;

    default:
      return 'Unknown';
  }
}
