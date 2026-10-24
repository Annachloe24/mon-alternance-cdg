import { addDays, diffDays, formatDateFr, isValidIsoDate, weekdayIndex } from './dates';
import type { DayEntry, DayType, IsoDate, Settings, TimeSegment } from './types';
import { validateEntry, type EntryDraft } from './validation';

export interface PeriodRequest {
  from: IsoDate;
  to: IsoDate;
  /** Jours retenus : 0 = lundi … 6 = dimanche. */
  weekdays: number[];
  type: DayType;
  segments: TimeSegment[];
  breakMinutes: number;
}

export interface PeriodPlan {
  /** Erreurs bloquantes sur la demande elle-même (dates, horaires…). */
  errors: string[];
  /** Journées qui seront créées. */
  create: EntryDraft[];
  /** Dates ignorées, avec la raison (journée déjà saisie, chevauchement…). */
  skipped: { date: IsoDate; reason: string }[];
}

export const MAX_PERIOD_DAYS = 366;

/**
 * Prépare la création de plusieurs journées identiques sur une période.
 * Chaque date est validée comme une saisie individuelle : les doublons et chevauchements sont ignorés, jamais écrasés.
 */
export function planPeriod(req: PeriodRequest, existing: DayEntry[], settings: Settings): PeriodPlan {
  const errors: string[] = [];
  if (!isValidIsoDate(req.from) || !isValidIsoDate(req.to)) errors.push('Les dates de début et de fin sont obligatoires.');
  else if (req.to < req.from) errors.push('La date de fin doit être après la date de début.');
  else if (diffDays(req.from, req.to) + 1 > MAX_PERIOD_DAYS) errors.push('La période ne peut pas dépasser un an.');
  if (!req.weekdays.length) errors.push('Choisissez au moins un jour de la semaine.');

  if (!errors.length) {
    // Contrôle des horaires une seule fois, sur une date neutre, pour éviter de répéter la même erreur sur chaque jour.
    const sample = validateEntry({ date: req.from, type: req.type, segments: req.segments, breakMinutes: req.breakMinutes }, [], settings);
    errors.push(...sample.errors);
  }
  if (errors.length) return { errors, create: [], skipped: [] };

  const create: EntryDraft[] = [];
  const skipped: PeriodPlan['skipped'] = [];
  const known: DayEntry[] = [...existing];
  const days = diffDays(req.from, req.to);
  for (let i = 0; i <= days; i++) {
    const date = addDays(req.from, i);
    if (!req.weekdays.includes(weekdayIndex(date))) continue;
    const draft: EntryDraft = { date, type: req.type, segments: req.segments.map((s) => ({ ...s })), breakMinutes: req.breakMinutes };
    const result = validateEntry(draft, known, settings);
    if (result.errors.length) {
      const reason = known.some((e) => e.date === date) ? 'journée déjà saisie' : result.errors[0];
      skipped.push({ date, reason });
      continue;
    }
    create.push(draft);
    known.push({ ...draft, id: `period-${date}`, createdAt: '', updatedAt: '' });
  }
  if (!create.length && !skipped.length) {
    errors.push(`Aucun des jours choisis ne tombe entre le ${formatDateFr(req.from)} et le ${formatDateFr(req.to)}.`);
  }
  return { errors, create, skipped };
}
