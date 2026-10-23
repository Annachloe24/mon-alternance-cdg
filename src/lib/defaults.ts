import type { AppData, Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  company: 'CITY ONE ACCUEIL PASSAGER',
  location: 'Aéroport Paris-Charles-de-Gaulle',
  contractStart: '2026-10-23',
  contractEnd: '2027-08-31',
  weeklyHours: 35,
  salaryPercent: 100,
  ageBracket: '26 ans ou plus',
  practicalDaysTarget: 45,
  // SMIC horaire brut au 1er janvier 2026 (valeur à vérifier et à mettre à jour à chaque revalorisation).
  hourlyRates: [{ from: '2026-01-01', rate: 12.02 }],
  ratesConfirmed: false,
  overtime: {
    weeklyThreshold: 35,
    tier1Hours: 8,
    tier1RatePercent: 25,
    tier2RatePercent: 50,
    includeCfa: true,
    rulesConfirmed: false,
  },
};

export function createDefaultData(): AppData {
  return {
    version: 1,
    settings: structuredClone(DEFAULT_SETTINGS),
    entries: [],
  };
}
