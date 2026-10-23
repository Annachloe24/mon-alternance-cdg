import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from './defaults';
import { make } from './testUtils';
import { validateEntry } from './validation';

const s = DEFAULT_SETTINGS;
const draft = (date: string, ranges: [string, string][], breakMinutes = 0, type: 'entreprise' | 'cfa' = 'entreprise') => {
  const e = make(date, ranges, breakMinutes, type);
  return { date: e.date, type: e.type, segments: e.segments, breakMinutes: e.breakMinutes };
};

describe('validation des journées', () => {
  it('accepte une journée normale', () => {
    const r = validateEntry(draft('2026-10-26', [['08:00', '16:00']], 45), [], s);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it('refuse date, heure ou pause invalides', () => {
    expect(validateEntry(draft('2027-02-30', [['08:00', '12:00']]), [], s).errors).toContain('La date est invalide.');
    expect(validateEntry(draft('2026-10-26', [['8h', '12:00']]), [], s).errors[0]).toMatch(/invalide/);
    expect(validateEntry(draft('2026-10-26', [['08:00', '08:00']]), [], s).errors[0]).toMatch(/identiques/);
    expect(validateEntry(draft('2026-10-26', [['08:00', '12:00']], -5), [], s).errors[0]).toMatch(/pause/i);
    expect(validateEntry(draft('2026-10-26', []), [], s).errors[0]).toMatch(/au moins une plage/);
  });

  it('refuse une pause supérieure au temps de présence', () => {
    const r = validateEntry(draft('2026-10-26', [['08:00', '09:00']], 60), [], s);
    expect(r.errors).toContain('La pause est supérieure ou égale au temps de présence.');
  });

  it('détecte les doublons de date', () => {
    const existing = [make('2026-10-26', [['08:00', '12:00']])];
    const r = validateEntry(draft('2026-10-26', [['14:00', '18:00']]), existing, s);
    expect(r.errors[0]).toMatch(/existe déjà/);
  });

  it("ne signale pas de doublon lors de la modification de la même journée", () => {
    const existing = [make('2026-10-26', [['08:00', '12:00']])];
    const r = validateEntry({ ...draft('2026-10-26', [['08:00', '13:00']]), id: existing[0].id }, existing, s);
    expect(r.errors).toEqual([]);
  });

  it('signale un passage après minuit', () => {
    const r = validateEntry(draft('2026-10-26', [['22:00', '05:30']], 30), [], s);
    expect(r.errors).toEqual([]);
    expect(r.infos[0]).toMatch(/lendemain à 05:30/);
  });

  it('détecte un chevauchement avec la nuit précédente', () => {
    const existing = [make('2026-10-26', [['22:00', '06:00']], 30)];
    const r = validateEntry(draft('2026-10-27', [['05:00', '12:00']], 30), existing, s);
    expect(r.errors[0]).toMatch(/chevauchent/);
    const ok = validateEntry(draft('2026-10-27', [['06:00', '12:00']], 0), existing, s);
    expect(ok.errors).toEqual([]);
  });

  it("signale des plages saisies dans le désordre", () => {
    const r = validateEntry(draft('2026-10-26', [['14:00', '18:00'], ['08:00', '12:00']]), [], s);
    expect(r.warnings.some((w) => w.includes('ordre chronologique'))).toBe(true);
  });

  it('refuse un ensemble de plages dépassant 24 h', () => {
    const r = validateEntry(draft('2026-10-26', [['08:00', '20:00'], ['21:00', '09:00']]), [], s);
    expect(r.errors[0]).toMatch(/24 heures/);
  });

  it('avertit sur les longues journées, les pauses courtes et les dates hors contrat', () => {
    const r = validateEntry(draft('2026-10-01', [['06:00', '17:30']], 10), [], s);
    expect(r.warnings.some((w) => w.includes('hors') || w.includes('en dehors'))).toBe(true);
    expect(r.warnings.some((w) => w.includes('10 h'))).toBe(true);
    expect(r.warnings.some((w) => w.includes('20 min'))).toBe(true);
  });
});
