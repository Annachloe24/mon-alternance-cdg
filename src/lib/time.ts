import type { DayEntry, TimeSegment } from './types';

export const MINUTES_PER_DAY = 1440;
const CLOCK_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidClock(value: string): boolean {
  return CLOCK_RE.test(value);
}

/** « HH:MM » → minutes depuis minuit. */
export function parseClock(value: string): number {
  const m = CLOCK_RE.exec(value);
  if (!m) throw new Error(`Heure invalide : ${value}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

export function formatClock(minutes: number): string {
  const m = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export interface PlacedSegment {
  /** Minutes depuis 00:00 le jour de l'entrée (peut dépasser 1440 après minuit). */
  start: number;
  end: number;
}

/**
 * Place les plages dans l'ordre saisi sur une ligne de temps continue.
 * - une plage dont la fin est avant (ou égale à) son début passe minuit ;
 * - une plage qui commence avant la fin de la précédente est placée le lendemain.
 * Les plages doivent être valides (voir validateEntry).
 */
export function placeSegments(segments: TimeSegment[]): PlacedSegment[] {
  const placed: PlacedSegment[] = [];
  let prevEnd = -Infinity;
  for (const seg of segments) {
    let start = parseClock(seg.start);
    while (start < prevEnd) start += MINUTES_PER_DAY;
    let end = parseClock(seg.end) + Math.floor(start / MINUTES_PER_DAY) * MINUTES_PER_DAY;
    while (end <= start) end += MINUTES_PER_DAY;
    placed.push({ start, end });
    prevEnd = end;
  }
  return placed;
}

export interface DayDuration {
  /** Somme des plages, avant déduction de la pause. */
  presenceMinutes: number;
  /** Temps de travail retenu = présence − pause (jamais négatif). */
  workedMinutes: number;
  /** Amplitude : du début de la première plage à la fin de la dernière. */
  amplitudeMinutes: number;
  crossesMidnight: boolean;
}

export function computeDay(entry: Pick<DayEntry, 'segments' | 'breakMinutes'>): DayDuration {
  const placed = placeSegments(entry.segments);
  const presence = placed.reduce((sum, s) => sum + (s.end - s.start), 0);
  const amplitude = placed.length ? placed[placed.length - 1].end - placed[0].start : 0;
  return {
    presenceMinutes: presence,
    workedMinutes: Math.max(0, presence - Math.max(0, entry.breakMinutes || 0)),
    amplitudeMinutes: amplitude,
    crossesMidnight: placed.some((s) => s.end > MINUTES_PER_DAY),
  };
}

/** 450 → « 7 h 30 », 30 → « 30 min ». */
export function formatDuration(minutes: number): string {
  const sign = minutes < 0 ? '−' : '';
  const abs = Math.round(Math.abs(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0 && m > 0) return `${sign}${m} min`;
  return m === 0 ? `${sign}${h} h` : `${sign}${h} h ${String(m).padStart(2, '0')}`;
}

/** 450 → « 7,50 » (heures décimales, virgule française). */
export function formatHoursDecimal(minutes: number): string {
  return (minutes / 60).toFixed(2).replace('.', ',');
}
