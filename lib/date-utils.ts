import { format, differenceInDays, differenceInMonths, differenceInYears, isValid } from 'date-fns';

/**
 * Generates a human-readable date range label
 * @param from The start date
 * @param to The end date
 * @returns A string describing the date range in a human-readable format
 */
export function getDateRangeLabel(from: Date, to?: Date | null): string {
  if (!from || !isValid(from)) {
    return 'No date range selected';
  }
  
  if (!to) {
    return `Data from ${format(from, 'MMMM d, yyyy')} to present`;
  }
  
  if (!isValid(to)) {
    return `Data from ${format(from, 'MMMM d, yyyy')}`;
  }

  // If same day
  if (from.toDateString() === to.toDateString()) {
    return `Data for ${format(from, 'MMMM d, yyyy')}`;
  }

  const daysDiff = differenceInDays(to, from);
  const monthsDiff = differenceInMonths(to, from);
  const yearsDiff = differenceInYears(to, from);

  // If less than 30 days
  if (daysDiff <= 30) {
    return `Data for the last ${daysDiff + 1} days`;
  }

  // If less than a year
  if (yearsDiff < 1) {
    return `Data from ${format(from, 'MMMM d')} to ${format(to, 'MMMM d, yyyy')}`;
  }

  // If longer period
  return `Data from ${format(from, 'MMMM d, yyyy')} to ${format(to, 'MMMM d, yyyy')}`;
}

/**
 * Formats a date range into a concise string for display
 * @param from The start date
 * @param to The end date (optional)
 * @returns A formatted string representing the date range
 */
export function formatDateRange(from: Date | null | undefined, to?: Date | null | undefined): string {
  if (!from || !isValid(from)) {
    return 'No date selected';
  }
  
  if (!to || !isValid(to)) {
    return format(from, 'MMM d, yyyy') + ' - Present';
  }
  
  if (from.toDateString() === to.toDateString()) {
    return format(from, 'MMM d, yyyy');
  }

  // Same month and year
  if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
    return `${format(from, 'MMM d')} - ${format(to, 'd, yyyy')}`;
  }

  // Same year
  if (from.getFullYear() === to.getFullYear()) {
    return `${format(from, 'MMM d')} - ${format(to, 'MMM d, yyyy')}`;
  }

  // Different years
  return `${format(from, 'MMM d, yyyy')} - ${format(to, 'MMM d, yyyy')}`;
}