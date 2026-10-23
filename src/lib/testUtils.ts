import type { DayEntry, DayType } from './types';

let counter = 0;

/** Crée une journée de test : make('2026-10-23', [['08:00', '12:00']], 30). */
export function make(date: string, ranges: [string, string][], breakMinutes = 0, type: DayType = 'entreprise'): DayEntry {
  counter++;
  return {
    id: `t${counter}`,
    date,
    type,
    segments: ranges.map(([start, end]) => ({ start, end })),
    breakMinutes,
    createdAt: '2026-10-23T00:00:00.000Z',
    updatedAt: '2026-10-23T00:00:00.000Z',
  };
}
