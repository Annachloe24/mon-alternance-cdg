import { formatDateFr, isoWeek } from './dates';
import { computeDay, formatHoursDecimal } from './time';
import type { DayEntry } from './types';

const SEPARATOR = ';';

function escapeField(value: string): string {
  return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Export CSV compatible avec Excel en français : séparateur « ; », virgule décimale,
 * encodage UTF-8 avec BOM pour que les accents s'affichent correctement.
 */
export function entriesToCsv(entries: DayEntry[]): string {
  const header = [
    'Date',
    'Jour',
    'Type',
    'Plages horaires',
    'Pause (min)',
    'Présence (h)',
    'Travail (h)',
    'Passage après minuit',
    'Semaine ISO',
    'Note',
  ];
  const rows = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => {
      const d = computeDay(e);
      const { year, week } = isoWeek(e.date);
      return [
        formatDateFr(e.date),
        new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${e.date}T00:00:00Z`)),
        e.type === 'entreprise' ? 'Entreprise' : 'CFA',
        e.segments.map((s) => `${s.start}-${s.end}`).join(' / '),
        String(e.breakMinutes),
        formatHoursDecimal(d.presenceMinutes),
        formatHoursDecimal(d.workedMinutes),
        d.crossesMidnight ? 'Oui' : 'Non',
        `${year}-S${String(week).padStart(2, '0')}`,
        e.note ?? '',
      ];
    });
  return '﻿' + [header, ...rows].map((r) => r.map(escapeField).join(SEPARATOR)).join('\r\n') + '\r\n';
}
