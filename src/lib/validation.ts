import { formatDateFr, isValidIsoDate, toDayNumber } from './dates';
import { MINUTES_PER_DAY, computeDay, formatClock, formatDuration, isValidClock, placeSegments } from './time';
import type { DayEntry, Settings } from './types';

export interface ValidationResult {
  /** Bloquant : l'enregistrement est refusé. */
  errors: string[];
  /** À vérifier, mais l'enregistrement reste possible. */
  warnings: string[];
  /** Simple information (ex. passage après minuit). */
  infos: string[];
}

export type EntryDraft = Pick<DayEntry, 'date' | 'type' | 'segments' | 'breakMinutes'> & { id?: string };

const MAX_GAP_MINUTES = 12 * 60;

/** Bornes absolues (en minutes depuis le 01/01/1970) d'une entrée valide. */
export function absoluteBounds(entry: Pick<DayEntry, 'date' | 'segments'>): { start: number; end: number } {
  const placed = placeSegments(entry.segments);
  const base = toDayNumber(entry.date) * MINUTES_PER_DAY;
  return { start: base + placed[0].start, end: base + placed[placed.length - 1].end };
}

export function validateEntry(draft: EntryDraft, existing: DayEntry[], settings: Settings): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const infos: string[] = [];

  if (!isValidIsoDate(draft.date)) errors.push('La date est invalide.');
  if (draft.type !== 'entreprise' && draft.type !== 'cfa') errors.push('Le type de journée est invalide.');
  if (!draft.segments.length) errors.push('Ajoutez au moins une plage horaire.');

  draft.segments.forEach((seg, i) => {
    const label = draft.segments.length > 1 ? `Plage ${i + 1} : ` : '';
    if (!isValidClock(seg.start) || !isValidClock(seg.end)) {
      errors.push(`${label}heure de début ou de fin invalide.`);
    } else if (seg.start === seg.end) {
      errors.push(`${label}le début et la fin sont identiques.`);
    }
  });

  const breakMinutes = draft.breakMinutes;
  if (!Number.isFinite(breakMinutes) || breakMinutes < 0 || !Number.isInteger(breakMinutes)) {
    errors.push('La pause doit être un nombre entier de minutes, positif ou nul.');
  }

  if (errors.length) return { errors, warnings, infos };

  const placed = placeSegments(draft.segments);
  const day = computeDay(draft);

  if (day.amplitudeMinutes > MINUTES_PER_DAY) {
    errors.push("L'ensemble des plages dépasse 24 heures : vérifiez les horaires et leur ordre.");
  }
  if (breakMinutes >= day.presenceMinutes) {
    errors.push('La pause est supérieure ou égale au temps de présence.');
  }

  for (let i = 1; i < placed.length; i++) {
    if (placed[i].start - placed[i - 1].end > MAX_GAP_MINUTES) {
      warnings.push(
        `Plus de 12 h d'écart entre la plage ${i} et la plage ${i + 1} : les plages doivent être saisies dans l'ordre chronologique.`,
      );
    }
  }

  // Doublons : une seule fiche par date (les plages multiples se saisissent dans la même fiche).
  const others = existing.filter((e) => e.id !== draft.id);
  const duplicate = others.find((e) => e.date === draft.date);
  if (duplicate) {
    errors.push(
      `Une journée existe déjà le ${formatDateFr(draft.date)} : modifiez-la ou ajoutez une plage à cette journée.`,
    );
  }

  if (!errors.length) {
    // Chevauchement avec la veille ou le lendemain (ex. une nuit qui déborde sur la journée suivante).
    const bounds = absoluteBounds(draft);
    const dayNum = toDayNumber(draft.date);
    for (const other of others) {
      const diff = toDayNumber(other.date) - dayNum;
      if (Math.abs(diff) > 1) continue;
      const ob = absoluteBounds(other);
      if (bounds.start < ob.end && ob.start < bounds.end) {
        errors.push(`Les horaires chevauchent la journée du ${formatDateFr(other.date)}.`);
      }
    }
  }

  if (day.crossesMidnight) {
    const last = placed[placed.length - 1];
    infos.push(`Passage après minuit : fin le lendemain à ${formatClock(last.end)}. Les heures restent comptées le ${formatDateFr(draft.date)}.`);
  }

  if (isValidIsoDate(settings.contractStart) && isValidIsoDate(settings.contractEnd)) {
    if (draft.date < settings.contractStart || draft.date > settings.contractEnd) {
      warnings.push('Cette date est en dehors des dates du contrat.');
    }
  }

  if (day.workedMinutes > 10 * 60) {
    warnings.push(`Durée de travail de ${formatDuration(day.workedMinutes)} : au-delà de 10 h, la durée maximale quotidienne est normalement dépassée.`);
  }
  if (day.workedMinutes > 6 * 60 && breakMinutes < 20) {
    warnings.push('Plus de 6 h de travail avec moins de 20 min de pause : vérifiez la pause saisie.');
  }
  if (day.amplitudeMinutes > 13 * 60 && day.amplitudeMinutes <= MINUTES_PER_DAY) {
    warnings.push("Amplitude supérieure à 13 h : le repos quotidien de 11 h pourrait ne pas être respecté.");
  }

  return { errors, warnings, infos };
}
