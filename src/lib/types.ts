/** Date au format ISO « AAAA-MM-JJ » (date locale, sans fuseau). */
export type IsoDate = string;
/** Heure au format « HH:MM » (00:00 à 23:59). */
export type ClockTime = string;

export type DayType = 'entreprise' | 'cfa';

export interface TimeSegment {
  start: ClockTime;
  end: ClockTime;
}

export interface DayEntry {
  id: string;
  /** Date de début de la journée (une plage qui passe minuit reste rattachée à cette date). */
  date: IsoDate;
  type: DayType;
  segments: TimeSegment[];
  /** Pause non rémunérée totale, en minutes, déduite du temps de présence. */
  breakMinutes: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HourlyRate {
  /** Date d'effet (incluse). */
  from: IsoDate;
  /** Taux horaire brut de référence (SMIC ou minimum conventionnel), en euros. */
  rate: number;
}

export interface OvertimeSettings {
  /** Seuil hebdomadaire au-delà duquel les heures sont supplémentaires. */
  weeklyThreshold: number;
  /** Nombre d'heures majorées au premier taux (ex. de la 36e à la 43e heure = 8 h). */
  tier1Hours: number;
  tier1RatePercent: number;
  tier2RatePercent: number;
  /** Compter les heures CFA dans le total hebdomadaire. */
  includeCfa: boolean;
  /** L'utilisateur a confirmé les règles auprès de l'employeur / de la convention collective. */
  rulesConfirmed: boolean;
}

export interface Settings {
  company: string;
  location: string;
  contractStart: IsoDate;
  contractEnd: IsoDate;
  weeklyHours: number;
  /** Pourcentage du taux de référence appliqué (100 = 100 % du SMIC). */
  salaryPercent: number;
  ageBracket: string;
  practicalDaysTarget: number;
  hourlyRates: HourlyRate[];
  /** Les taux horaires saisis ont été vérifiés par l'utilisateur. */
  ratesConfirmed: boolean;
  overtime: OvertimeSettings;
}

export interface AppData {
  version: 1;
  settings: Settings;
  entries: DayEntry[];
}
