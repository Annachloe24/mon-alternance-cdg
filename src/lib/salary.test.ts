import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from './defaults';
import { estimateContract, estimateMonth, monthlyReferenceHours, rateOn } from './salary';
import { make } from './testUtils';
import type { Settings } from './types';
import { summarizeWeeks } from './weekly';

const base: Settings = structuredClone(DEFAULT_SETTINGS);

describe('salaire estimé', () => {
  it('mensualise 35 h en 151,67 h', () => {
    expect(monthlyReferenceHours(35)).toBeCloseTo(151.6667, 4);
  });

  it('choisit le taux selon la date d’effet', () => {
    const rates = [
      { from: '2027-01-01', rate: 12.3 },
      { from: '2026-01-01', rate: 12.02 },
    ];
    expect(rateOn('2025-12-31', rates)).toBeUndefined();
    expect(rateOn('2026-12-31', rates)).toBe(12.02);
    expect(rateOn('2027-01-01', rates)).toBe(12.3);
  });

  it('calcule un mois complet à 100 % du SMIC', () => {
    const m = estimateMonth(2026, 11, base, []);
    expect(m.contractDays).toBe(30);
    expect(m.baseGross).toBe(1823.03);
    expect(m.totalGross).toBe(1823.03);
  });

  it('proratise le premier mois du contrat', () => {
    const m = estimateMonth(2026, 10, base, []);
    expect(m.contractDays).toBe(9);
    expect(m.baseGross).toBe(529.27);
  });

  it('applique un pourcentage différent', () => {
    const m = estimateMonth(2026, 11, { ...base, salaryPercent: 85 }, []);
    expect(m.baseGross).toBe(1549.58);
  });

  it('gère une revalorisation en cours de mois', () => {
    const settings = {
      ...base,
      hourlyRates: [
        { from: '2026-01-01', rate: 12.02 },
        { from: '2027-01-01', rate: 12.3 },
        { from: '2027-03-16', rate: 13 },
      ],
    };
    expect(estimateMonth(2027, 1, settings, []).baseGross).toBe(1865.5);
    const march = estimateMonth(2027, 3, settings, []);
    expect(march.baseGross).toBe(1920.3);
    expect(march.effectiveRates).toEqual([12.3, 13]);
  });

  it('signale un taux manquant', () => {
    const m = estimateMonth(2026, 11, { ...base, hourlyRates: [{ from: '2026-11-15', rate: 12 }] }, []);
    expect(m.missingRate).toBe(true);
  });

  it('ajoute les heures supplémentaires majorées des semaines finissant dans le mois', () => {
    // Semaine du 02/11 au 08/11/2026 : 5 × 7 h 48 = 39 h → 4 h à +25 %.
    const entries = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'].map((d) =>
      make(d, [['06:00', '14:18']], 30),
    );
    const weeks = summarizeWeeks(entries, base.overtime);
    const m = estimateMonth(2026, 11, base, weeks);
    expect(m.overtimeMinutes).toBe(240);
    expect(m.overtimeGross).toBe(60.1); // 4 × 12,02 × 1,25
    expect(m.totalGross).toBe(1883.13);
  });

  it('couvre tous les mois du contrat', () => {
    const months = estimateContract(base, []);
    expect(months).toHaveLength(11);
    expect(months[0].label).toBe('octobre 2026');
    expect(months[10].label).toBe('août 2027');
    expect(months[10].contractDays).toBe(31);
  });
});
