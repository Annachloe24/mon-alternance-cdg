import type { IsoDate } from './types';

const MS_PER_DAY = 86_400_000;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Vérifie qu'une chaîne est une date calendaire réelle au format AAAA-MM-JJ (ex. refuse 2027-02-30). */
export function isValidIsoDate(value: string): boolean {
  const m = ISO_RE.exec(value);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1) return false;
  return d <= daysInMonth(y, mo);
}

/** Nombre de jours depuis le 01/01/1970, calculé en UTC pour éviter les effets des changements d'heure. */
export function toDayNumber(iso: IsoDate): number {
  const m = ISO_RE.exec(iso);
  if (!m) throw new Error(`Date invalide : ${iso}`);
  return Math.round(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / MS_PER_DAY);
}

export function fromDayNumber(n: number): IsoDate {
  const d = new Date(n * MS_PER_DAY);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  return fromDayNumber(toDayNumber(iso) + days);
}

export function diffDays(from: IsoDate, to: IsoDate): number {
  return toDayNumber(to) - toDayNumber(from);
}

/** 0 = lundi … 6 = dimanche. */
export function weekdayIndex(iso: IsoDate): number {
  // Le 01/01/1970 était un jeudi (index 3).
  return (((toDayNumber(iso) + 3) % 7) + 7) % 7;
}

/** Lundi de la semaine contenant la date. */
export function weekStart(iso: IsoDate): IsoDate {
  return addDays(iso, -weekdayIndex(iso));
}

/** Numéro de semaine ISO 8601 et année ISO correspondante. */
export function isoWeek(iso: IsoDate): { year: number; week: number } {
  const thursday = addDays(iso, 3 - weekdayIndex(iso));
  const year = Number(thursday.slice(0, 4));
  const firstThursday = addDays(`${year}-01-04`, 3 - weekdayIndex(`${year}-01-04`));
  return { year, week: 1 + Math.round(diffDays(firstThursday, thursday) / 7) };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Date du jour dans le fuseau local de l'appareil. */
export function todayIso(now: Date = new Date()): IsoDate {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function asUtcDate(iso: IsoDate): Date {
  return new Date(toDayNumber(iso) * MS_PER_DAY);
}

export function formatDateFr(iso: IsoDate, style: 'short' | 'long' | 'weekday' = 'short'): string {
  if (!isValidIsoDate(iso)) return iso;
  const options: Intl.DateTimeFormatOptions =
    style === 'long'
      ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
      : style === 'weekday'
        ? { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' }
        : { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' };
  return new Intl.DateTimeFormat('fr-FR', options).format(asUtcDate(iso));
}

export function formatMonthFr(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
}
