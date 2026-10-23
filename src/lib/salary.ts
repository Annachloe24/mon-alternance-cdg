import { daysInMonth, formatMonthFr, isValidIsoDate } from './dates';
import type { HourlyRate, IsoDate, Settings } from './types';
import type { WeekSummary } from './weekly';

/** Taux horaire applicable à une date (dernier taux dont la date d'effet est passée). */
export function rateOn(date: IsoDate, rates: HourlyRate[]): number | undefined {
  let found: HourlyRate | undefined;
  for (const r of rates) {
    if (r.from <= date && (!found || r.from > found.from)) found = r;
  }
  return found?.rate;
}

/** Heures mensualisées : 35 h × 52 / 12 = 151,67 h. */
export function monthlyReferenceHours(weeklyHours: number): number {
  return (weeklyHours * 52) / 12;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface MonthEstimate {
  year: number;
  month: number;
  label: string;
  /** Jours calendaires du mois couverts par le contrat. */
  contractDays: number;
  daysInMonth: number;
  baseGross: number;
  overtimeMinutes: number;
  overtimeGross: number;
  totalGross: number;
  /** Taux horaires (après application du pourcentage) utilisés dans le mois. */
  effectiveRates: number[];
  /** Au moins un jour du mois n'a aucun taux horaire défini. */
  missingRate: boolean;
}

/**
 * Estimation du salaire brut d'un mois :
 * - salaire de base mensualisé, proratisé au nombre de jours calendaires couverts par le contrat
 *   et selon le taux en vigueur chaque jour (gère les revalorisations en cours de mois) ;
 * - heures supplémentaires des semaines qui se terminent (dimanche) dans le mois.
 * Il s'agit d'une estimation : absences, primes, indemnités et cotisations ne sont pas prises en compte.
 */
export function estimateMonth(year: number, month: number, settings: Settings, weeks: WeekSummary[]): MonthEstimate {
  const dim = daysInMonth(year, month);
  const pct = settings.salaryPercent / 100;
  const dailyHours = monthlyReferenceHours(settings.weeklyHours) / dim;
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;

  let base = 0;
  let contractDays = 0;
  let missingRate = false;
  const rates = new Set<number>();
  for (let d = 1; d <= dim; d++) {
    const date = prefix + String(d).padStart(2, '0');
    if (date < settings.contractStart || date > settings.contractEnd) continue;
    contractDays++;
    const rate = rateOn(date, settings.hourlyRates);
    if (rate === undefined) {
      missingRate = true;
      continue;
    }
    rates.add(round2(rate * pct));
    base += dailyHours * rate * pct;
  }

  const { tier1RatePercent, tier2RatePercent } = settings.overtime;
  let overtimeMinutes = 0;
  let overtimeGross = 0;
  for (const w of weeks) {
    if (!w.weekEnd.startsWith(prefix) || w.overtime.totalMinutes === 0) continue;
    const rate = rateOn(w.weekEnd, settings.hourlyRates);
    if (rate === undefined) {
      missingRate = true;
      continue;
    }
    const hourly = rate * pct;
    overtimeMinutes += w.overtime.totalMinutes;
    overtimeGross +=
      (w.overtime.tier1Minutes / 60) * hourly * (1 + tier1RatePercent / 100) +
      (w.overtime.tier2Minutes / 60) * hourly * (1 + tier2RatePercent / 100);
  }

  const baseGross = round2(base);
  const overtimeRounded = round2(overtimeGross);
  return {
    year,
    month,
    label: formatMonthFr(year, month),
    contractDays,
    daysInMonth: dim,
    baseGross,
    overtimeMinutes,
    overtimeGross: overtimeRounded,
    totalGross: round2(baseGross + overtimeRounded),
    effectiveRates: [...rates],
    missingRate,
  };
}

/** Estimations pour chaque mois du contrat, du premier au dernier. */
export function estimateContract(settings: Settings, weeks: WeekSummary[]): MonthEstimate[] {
  if (!isValidIsoDate(settings.contractStart) || !isValidIsoDate(settings.contractEnd)) return [];
  if (settings.contractEnd < settings.contractStart) return [];
  let year = Number(settings.contractStart.slice(0, 4));
  let month = Number(settings.contractStart.slice(5, 7));
  const endYear = Number(settings.contractEnd.slice(0, 4));
  const endMonth = Number(settings.contractEnd.slice(5, 7));
  const result: MonthEstimate[] = [];
  while (year < endYear || (year === endYear && month <= endMonth)) {
    result.push(estimateMonth(year, month, settings, weeks));
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }
  return result;
}

export function formatEuro(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}
