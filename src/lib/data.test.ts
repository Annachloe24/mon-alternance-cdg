import { describe, expect, it } from 'vitest';
import { parseBackup, serializeBackup } from './backup';
import { contractProgress } from './contract';
import { entriesToCsv } from './csv';
import { createDefaultData } from './defaults';
import { STORAGE_KEY, loadData, saveData } from './storage';
import { make } from './testUtils';

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

describe('progression du contrat', () => {
  const settings = { contractStart: '2026-10-23', contractEnd: '2027-08-31' };

  it('calcule la durée et l’avancement', () => {
    const p = contractProgress(settings, '2026-10-24');
    expect(p.status).toBe('en-cours');
    expect(p.totalDays).toBe(313);
    expect(p.elapsedDays).toBe(2);
    expect(p.remainingDays).toBe(311);
  });

  it('borne avant et après le contrat', () => {
    expect(contractProgress(settings, '2026-10-01')).toMatchObject({ status: 'a-venir', elapsedDays: 0, percent: 0 });
    expect(contractProgress(settings, '2027-09-15')).toMatchObject({ status: 'termine', remainingDays: 0, percent: 100 });
    expect(contractProgress({ contractStart: '2027-01-01', contractEnd: '2026-01-01' }, '2026-10-24').status).toBe('invalide');
  });
});

describe('export CSV', () => {
  it('produit un CSV lisible par Excel en français', () => {
    const csv = entriesToCsv([
      make('2026-10-27', [['22:00', '06:00']], 30),
      make('2026-10-26', [['06:00', '10:00'], ['15:00', '19:00']], 0, 'cfa'),
    ]);
    expect(csv.startsWith('﻿Date;Jour;Type')).toBe(true);
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe('26/10/2026;lundi;CFA;06:00-10:00 / 15:00-19:00;0;8,00;8,00;Non;2026-S44;');
    expect(lines[2]).toBe('27/10/2026;mardi;Entreprise;22:00-06:00;30;8,00;7,50;Oui;2026-S44;');
  });

  it('échappe les notes contenant des points-virgules ou guillemets', () => {
    const e = { ...make('2026-10-26', [['08:00', '12:00']]), note: 'Terminal 2E; "renfort"' };
    expect(entriesToCsv([e])).toContain('"Terminal 2E; ""renfort"""');
  });
});

describe('sauvegarde et restauration', () => {
  it('restaure exactement les données exportées', () => {
    const data = createDefaultData();
    data.entries.push(make('2026-10-26', [['08:00', '12:00']], 0));
    data.settings.salaryPercent = 90;
    const restored = parseBackup(serializeBackup(data));
    expect(restored).toEqual(data);
  });

  it('refuse un fichier étranger ou corrompu', () => {
    expect(() => parseBackup('pas du json')).toThrow(/JSON/);
    expect(() => parseBackup('{"app":"autre"}')).toThrow(/Mon Alternance CDG/);
  });

  it('refuse une sauvegarde contenant des doublons ou des horaires invalides', () => {
    const data = createDefaultData();
    data.entries.push(make('2026-10-26', [['08:00', '12:00']]), make('2026-10-26', [['13:00', '17:00']]));
    expect(() => parseBackup(serializeBackup(data))).toThrow(/Doublon/);
    const bad = createDefaultData();
    bad.entries.push(make('2026-10-26', [['25:00', '12:00']]));
    expect(() => parseBackup(serializeBackup(bad))).toThrow(/Plage horaire invalide/);
  });

  it('complète les paramètres manquants', () => {
    const text = JSON.stringify({ app: 'mon-alternance-cdg', data: { version: 1, settings: { salaryPercent: 80 }, entries: [] } });
    const d = parseBackup(text);
    expect(d.settings.salaryPercent).toBe(80);
    expect(d.settings.contractStart).toBe('2026-10-23');
    expect(d.settings.overtime.tier1RatePercent).toBe(25);
  });
});

describe('stockage local', () => {
  it('enregistre puis relit les données', () => {
    const storage = memoryStorage();
    const data = createDefaultData();
    data.entries.push(make('2026-10-26', [['08:00', '12:00']]));
    expect(saveData(data, storage)).toBe(true);
    expect(loadData(storage).data).toEqual(data);
  });

  it('démarre avec les informations du contrat', () => {
    const { data, error } = loadData(memoryStorage());
    expect(error).toBeUndefined();
    expect(data.settings.company).toBe('CITY ONE ACCUEIL PASSAGER');
    expect(data.entries).toEqual([]);
  });

  it('conserve une copie des données illisibles', () => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, '{cassé');
    const { data, error } = loadData(storage);
    expect(error).toMatch(/illisibles/);
    expect(data.entries).toEqual([]);
    expect([...storage.map.keys()].some((k) => k.includes('corrompu'))).toBe(true);
  });
});
