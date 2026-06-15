import { addDays, format } from 'date-fns';

export interface CalendarConfig {
  workOnSaturday: boolean;
  workOnSunday: boolean;
  considerHolidays: boolean;
}

export const DEFAULT_CALENDAR_CONFIG: CalendarConfig = {
  workOnSaturday: false,
  workOnSunday: false,
  considerHolidays: false,
};

// Brazilian national holidays 2025-2026
export const BRAZIL_HOLIDAYS: string[] = [
  '2025-01-01', '2025-04-18', '2025-04-21', '2025-05-01',
  '2025-06-19', '2025-09-07', '2025-10-12', '2025-11-02',
  '2025-11-15', '2025-12-25',
  '2026-01-01', '2026-03-03', '2026-03-04', '2026-04-03',
  '2026-04-21', '2026-05-01', '2026-06-04', '2026-09-07',
  '2026-10-12', '2026-11-02', '2026-11-15', '2026-12-25',
];

export const isWorkingDay = (date: Date, config: CalendarConfig): boolean => {
  const day = date.getDay(); // 0=Sun, 6=Sat
  if (!config.workOnSaturday && day === 6) return false;
  if (!config.workOnSunday && day === 0) return false;
  if (config.considerHolidays && BRAZIL_HOLIDAYS.includes(format(date, 'yyyy-MM-dd'))) return false;
  return true;
};

/**
 * Snap a date forward to the next working day if it falls on a non-working day.
 * Used when a resize handle drops on a weekend or holiday.
 */
export const snapToNextWorkingDay = (date: Date, config: CalendarConfig): Date => {
  let d = new Date(date);
  while (!isWorkingDay(d, config)) {
    d = addDays(d, 1);
  }
  return d;
};

/**
 * Snap a date backward to the previous working day.
 */
export const snapToPrevWorkingDay = (date: Date, config: CalendarConfig): Date => {
  let d = new Date(date);
  while (!isWorkingDay(d, config)) {
    d = addDays(d, -1);
  }
  return d;
};

/**
 * Count working days between two dates (inclusive).
 */
export const countWorkingDays = (start: Date, end: Date, config: CalendarConfig): number => {
  let count = 0;
  let d = new Date(start);
  while (d <= end) {
    if (isWorkingDay(d, config)) count++;
    d = addDays(d, 1);
  }
  return count;
};
