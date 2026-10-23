import { addDays, isoWeek, weekStart } from './dates';
import { computeDay } from './time';
import type { DayEntry, IsoDate, OvertimeSettings } from './types';

export interface OvertimeBreakdown {
  /** Heures majorées au premier taux, en minutes. */
  tier1Minutes: number;
  /** Heures majorées au second taux, en minutes. */
  tier2Minutes: number;
  totalMinutes: number;
}

export interface WeekSummary {
  weekStart: IsoDate;
  weekEnd: IsoDate;
  isoYear: number;
  isoWeek: number;
  entrepriseMinutes: number;
  cfaMinutes: number;
  entrepriseDays: number;
  cfaDays: number;
  /** Total retenu pour le calcul des heures supplémentaires (inclut le CFA si le paramètre est activé). */
  countedMinutes: number;
  overtime: OvertimeBreakdown;
  entries: DayEntry[];
}

export function computeOvertime(countedMinutes: number, rules: OvertimeSettings): OvertimeBreakdown {
  const threshold = Math.max(0, rules.weeklyThreshold) * 60;
  const over = Math.max(0, countedMinutes - threshold);
  const tier1 = Math.min(over, Math.max(0, rules.tier1Hours) * 60);
  return { tier1Minutes: tier1, tier2Minutes: over - tier1, totalMinutes: over };
}

/** Regroupe les journées par semaine (lundi → dimanche), de la plus récente à la plus ancienne. */
export function summarizeWeeks(entries: DayEntry[], rules: OvertimeSettings): WeekSummary[] {
  const byWeek = new Map<IsoDate, DayEntry[]>();
  for (const entry of entries) {
    const key = weekStart(entry.date);
    const list = byWeek.get(key);
    if (list) list.push(entry);
    else byWeek.set(key, [entry]);
  }

  const weeks: WeekSummary[] = [];
  for (const [start, list] of byWeek) {
    list.sort((a, b) => a.date.localeCompare(b.date));
    let entrepriseMinutes = 0;
    let cfaMinutes = 0;
    let entrepriseDays = 0;
    let cfaDays = 0;
    for (const e of list) {
      const worked = computeDay(e).workedMinutes;
      if (e.type === 'entreprise') {
        entrepriseMinutes += worked;
        entrepriseDays++;
      } else {
        cfaMinutes += worked;
        cfaDays++;
      }
    }
    const counted = entrepriseMinutes + (rules.includeCfa ? cfaMinutes : 0);
    const { year, week } = isoWeek(start);
    weeks.push({
      weekStart: start,
      weekEnd: addDays(start, 6),
      isoYear: year,
      isoWeek: week,
      entrepriseMinutes,
      cfaMinutes,
      entrepriseDays,
      cfaDays,
      countedMinutes: counted,
      overtime: computeOvertime(counted, rules),
      entries: list,
    });
  }
  return weeks.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

/** Nombre de journées en entreprise avec du temps de travail (compteur des journées de formation pratique). */
export function countPracticalDays(entries: DayEntry[]): number {
  return entries.filter((e) => e.type === 'entreprise' && computeDay(e).workedMinutes > 0).length;
}
