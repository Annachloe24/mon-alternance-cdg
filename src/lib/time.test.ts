import { describe, expect, it } from 'vitest';
import { computeDay, formatDuration, formatHoursDecimal, isValidClock, parseClock, placeSegments } from './time';

const seg = (start: string, end: string) => ({ start, end });

describe('horaires', () => {
  it('lit les heures', () => {
    expect(parseClock('00:00')).toBe(0);
    expect(parseClock('23:59')).toBe(1439);
    expect(isValidClock('24:00')).toBe(false);
    expect(isValidClock('7:30')).toBe(false);
  });

  it('calcule une journée simple avec pause', () => {
    const d = computeDay({ segments: [seg('05:00', '13:30')], breakMinutes: 30 });
    expect(d.presenceMinutes).toBe(510);
    expect(d.workedMinutes).toBe(480);
    expect(d.crossesMidnight).toBe(false);
  });

  it('additionne plusieurs plages', () => {
    const d = computeDay({ segments: [seg('06:00', '10:00'), seg('15:00', '19:30')], breakMinutes: 0 });
    expect(d.workedMinutes).toBe(510);
    expect(d.amplitudeMinutes).toBe(810);
  });

  it('gère une plage qui passe minuit', () => {
    const d = computeDay({ segments: [seg('22:00', '06:00')], breakMinutes: 20 });
    expect(d.presenceMinutes).toBe(480);
    expect(d.workedMinutes).toBe(460);
    expect(d.crossesMidnight).toBe(true);
  });

  it('place une deuxième plage le lendemain après minuit', () => {
    const placed = placeSegments([seg('20:00', '23:30'), seg('00:30', '04:00')]);
    expect(placed).toEqual([
      { start: 1200, end: 1410 },
      { start: 1470, end: 1680 },
    ]);
    expect(computeDay({ segments: [seg('20:00', '23:30'), seg('00:30', '04:00')], breakMinutes: 0 }).workedMinutes).toBe(420);
  });

  it('gère une plage qui se termine exactement à minuit', () => {
    const d = computeDay({ segments: [seg('16:00', '00:00')], breakMinutes: 0 });
    expect(d.workedMinutes).toBe(480);
    expect(d.crossesMidnight).toBe(false);
  });

  it('ne renvoie jamais un temps négatif', () => {
    expect(computeDay({ segments: [seg('08:00', '09:00')], breakMinutes: 90 }).workedMinutes).toBe(0);
  });

  it('formate les durées', () => {
    expect(formatDuration(450)).toBe('7 h 30');
    expect(formatDuration(420)).toBe('7 h');
    expect(formatDuration(65)).toBe('1 h 05');
    expect(formatDuration(30)).toBe('30 min');
    expect(formatDuration(0)).toBe('0 h');
    expect(formatDuration(-90)).toBe('−1 h 30');
    expect(formatHoursDecimal(450)).toBe('7,50');
  });
});
