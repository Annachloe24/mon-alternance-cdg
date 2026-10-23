import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from './defaults';
import { make } from './testUtils';
import { computeOvertime, countPracticalDays, summarizeWeeks } from './weekly';

const rules = DEFAULT_SETTINGS.overtime;

describe('heures supplémentaires', () => {
  it('ne compte rien sous le seuil', () => {
    expect(computeOvertime(35 * 60, rules)).toEqual({ tier1Minutes: 0, tier2Minutes: 0, totalMinutes: 0 });
  });

  it('applique le premier palier jusqu’à la 43e heure', () => {
    expect(computeOvertime(43 * 60, rules)).toEqual({ tier1Minutes: 480, tier2Minutes: 0, totalMinutes: 480 });
  });

  it('applique le second palier au-delà', () => {
    expect(computeOvertime(45 * 60 + 30, rules)).toEqual({ tier1Minutes: 480, tier2Minutes: 150, totalMinutes: 630 });
  });

  it('respecte des paramètres modifiés', () => {
    const custom = { ...rules, weeklyThreshold: 39, tier1Hours: 4 };
    expect(computeOvertime(45 * 60, custom)).toEqual({ tier1Minutes: 240, tier2Minutes: 120, totalMinutes: 360 });
  });
});

describe('récapitulatif hebdomadaire', () => {
  const entries = [
    make('2026-10-26', [['06:00', '14:30']], 30), // 8 h
    make('2026-10-27', [['06:00', '14:30']], 30), // 8 h
    make('2026-10-28', [['09:00', '17:00']], 60, 'cfa'), // 7 h CFA
    make('2026-10-29', [['22:00', '06:30']], 30), // 8 h de nuit
    make('2026-10-31', [['06:00', '10:00'], ['16:00', '22:00']], 0), // 10 h (samedi)
    make('2026-11-02', [['08:00', '12:00']], 0), // semaine suivante
  ];

  it('sépare entreprise et CFA et calcule les heures supplémentaires', () => {
    const [next, week] = summarizeWeeks(entries, rules);
    expect(next.weekStart).toBe('2026-11-02');
    expect(week.weekStart).toBe('2026-10-26');
    expect(week.weekEnd).toBe('2026-11-01');
    expect(week.isoWeek).toBe(44);
    expect(week.entrepriseMinutes).toBe(34 * 60);
    expect(week.cfaMinutes).toBe(7 * 60);
    expect(week.entrepriseDays).toBe(4);
    expect(week.cfaDays).toBe(1);
    expect(week.countedMinutes).toBe(41 * 60);
    expect(week.overtime.totalMinutes).toBe(6 * 60);
  });

  it('peut exclure le CFA du total', () => {
    const [, week] = summarizeWeeks(entries, { ...rules, includeCfa: false });
    expect(week.countedMinutes).toBe(34 * 60);
    expect(week.overtime.totalMinutes).toBe(0);
  });

  it('rattache une nuit à la date de début, même le dimanche', () => {
    const weeks = summarizeWeeks([make('2026-11-01', [['22:00', '06:00']])], rules);
    expect(weeks).toHaveLength(1);
    expect(weeks[0].weekStart).toBe('2026-10-26');
    expect(weeks[0].entrepriseMinutes).toBe(480);
  });

  it('compte les journées de formation pratique en entreprise uniquement', () => {
    expect(countPracticalDays(entries)).toBe(5);
  });
});
