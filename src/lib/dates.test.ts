import { describe, expect, it } from 'vitest';
import { addDays, daysInMonth, diffDays, isValidIsoDate, isoWeek, todayIso, weekStart, weekdayIndex } from './dates';

describe('dates', () => {
  it('valide les dates calendaires réelles', () => {
    expect(isValidIsoDate('2026-10-23')).toBe(true);
    expect(isValidIsoDate('2028-02-29')).toBe(true);
    expect(isValidIsoDate('2027-02-29')).toBe(false);
    expect(isValidIsoDate('2026-13-01')).toBe(false);
    expect(isValidIsoDate('2026-10-00')).toBe(false);
    expect(isValidIsoDate('23/10/2026')).toBe(false);
  });

  it('calcule jours de semaine et lundis', () => {
    expect(weekdayIndex('2026-10-23')).toBe(4); // vendredi
    expect(weekStart('2026-10-23')).toBe('2026-10-19');
    expect(weekStart('2026-10-25')).toBe('2026-10-19'); // dimanche
    expect(weekStart('2026-10-26')).toBe('2026-10-26');
  });

  it("gère les changements d'heure et d'année", () => {
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25'); // passage à l'heure d'hiver
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(diffDays('2026-10-23', '2027-08-31')).toBe(312);
    expect(daysInMonth(2027, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
  });

  it('calcule les semaines ISO', () => {
    expect(isoWeek('2026-10-23')).toEqual({ year: 2026, week: 43 });
    expect(isoWeek('2027-01-01')).toEqual({ year: 2026, week: 53 });
    expect(isoWeek('2027-01-04')).toEqual({ year: 2027, week: 1 });
  });

  it('donne la date locale du jour', () => {
    expect(todayIso(new Date(2026, 9, 24, 23, 59))).toBe('2026-10-24');
  });
});
