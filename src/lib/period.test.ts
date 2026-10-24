import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from './defaults';
import { planPeriod, type PeriodRequest } from './period';
import { make } from './testUtils';

const s = DEFAULT_SETTINGS;
const WEEK = [0, 1, 2, 3, 4];
const cfa = (from: string, to: string, extra: Partial<PeriodRequest> = {}): PeriodRequest => ({
  from,
  to,
  weekdays: WEEK,
  type: 'cfa',
  segments: [{ start: '09:00', end: '17:00' }],
  breakMinutes: 60,
  ...extra,
});

describe('saisie d’une période', () => {
  it('crée une journée par jour ouvré de la période', () => {
    const plan = planPeriod(cfa('2026-11-02', '2026-11-08'), [], s);
    expect(plan.errors).toEqual([]);
    expect(plan.create.map((d) => d.date)).toEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06']);
    expect(plan.create.every((d) => d.type === 'cfa' && d.breakMinutes === 60)).toBe(true);
    expect(plan.skipped).toEqual([]);
  });

  it('respecte les jours de la semaine choisis', () => {
    const plan = planPeriod(cfa('2026-11-02', '2026-11-15', { weekdays: [0, 2] }), [], s);
    expect(plan.create.map((d) => d.date)).toEqual(['2026-11-02', '2026-11-04', '2026-11-09', '2026-11-11']);
  });

  it('ignore les journées déjà saisies sans les écraser', () => {
    const existing = [make('2026-11-03', [['06:00', '14:00']], 30)];
    const plan = planPeriod(cfa('2026-11-02', '2026-11-04'), existing, s);
    expect(plan.create.map((d) => d.date)).toEqual(['2026-11-02', '2026-11-04']);
    expect(plan.skipped).toEqual([{ date: '2026-11-03', reason: 'journée déjà saisie' }]);
  });

  it('ignore une journée qui chevaucherait une nuit déjà saisie', () => {
    const existing = [make('2026-11-01', [['22:00', '10:00']], 30)];
    const plan = planPeriod(cfa('2026-11-02', '2026-11-02'), existing, s);
    expect(plan.create).toEqual([]);
    expect(plan.skipped[0].reason).toMatch(/chevauchent/);
  });

  it('gère les nuits successives sur la période', () => {
    const plan = planPeriod(cfa('2026-11-02', '2026-11-04', { type: 'entreprise', segments: [{ start: '22:00', end: '06:00' }], breakMinutes: 30 }), [], s);
    expect(plan.create).toHaveLength(3);
  });

  it('refuse les demandes invalides', () => {
    expect(planPeriod(cfa('2026-11-08', '2026-11-02'), [], s).errors[0]).toMatch(/après la date de début/);
    expect(planPeriod(cfa('2026-11-02', '2026-11-06', { weekdays: [] }), [], s).errors[0]).toMatch(/au moins un jour/);
    expect(planPeriod(cfa('2026-11-02', '2026-11-06', { segments: [{ start: '09:00', end: '09:00' }] }), [], s).errors[0]).toMatch(/identiques/);
    expect(planPeriod(cfa('2026-01-01', '2027-06-01'), [], s).errors[0]).toMatch(/un an/);
    expect(planPeriod(cfa('2026-11-07', '2026-11-08'), [], s).errors[0]).toMatch(/Aucun des jours/);
  });
});
