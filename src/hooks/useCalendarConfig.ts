import { useState, useCallback } from 'react';
import type { CalendarConfig } from '@/utils/workingDaysEngine';
import { DEFAULT_CALENDAR_CONFIG } from '@/utils/workingDaysEngine';

const STORAGE_KEY = 'secureproject:calendar-config';

const loadConfig = (): CalendarConfig => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_CALENDAR_CONFIG, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_CALENDAR_CONFIG;
};

export const useCalendarConfig = () => {
  const [config, setConfig] = useState<CalendarConfig>(loadConfig);

  const updateConfig = useCallback((patch: Partial<CalendarConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return { config, updateConfig };
};
