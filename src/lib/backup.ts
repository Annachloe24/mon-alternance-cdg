import { DEFAULT_SETTINGS } from './defaults';
import { isValidIsoDate } from './dates';
import { isValidClock } from './time';
import type { AppData, DayEntry, HourlyRate, Settings } from './types';

export const BACKUP_APP_ID = 'mon-alternance-cdg';

interface BackupFile {
  app: typeof BACKUP_APP_ID;
  exportedAt: string;
  data: AppData;
}

export function serializeBackup(data: AppData, now: Date = new Date()): string {
  const file: BackupFile = { app: BACKUP_APP_ID, exportedAt: now.toISOString(), data };
  return JSON.stringify(file, null, 2);
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const str = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback);
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

/** Complète les paramètres manquants avec les valeurs par défaut. */
export function normalizeSettings(raw: unknown): Settings {
  const d = DEFAULT_SETTINGS;
  if (!isObj(raw)) return structuredClone(d);
  const ot = isObj(raw.overtime) ? raw.overtime : {};
  const rates: HourlyRate[] = Array.isArray(raw.hourlyRates)
    ? raw.hourlyRates
        .filter((r): r is Obj => isObj(r) && typeof r.from === 'string' && isValidIsoDate(r.from) && typeof r.rate === 'number' && r.rate > 0)
        .map((r) => ({ from: r.from as string, rate: r.rate as number }))
    : structuredClone(d.hourlyRates);
  const date = (v: unknown, fallback: string) => (typeof v === 'string' && isValidIsoDate(v) ? v : fallback);
  return {
    company: str(raw.company, d.company),
    location: str(raw.location, d.location),
    contractStart: date(raw.contractStart, d.contractStart),
    contractEnd: date(raw.contractEnd, d.contractEnd),
    weeklyHours: num(raw.weeklyHours, d.weeklyHours),
    salaryPercent: num(raw.salaryPercent, d.salaryPercent),
    ageBracket: str(raw.ageBracket, d.ageBracket),
    practicalDaysTarget: num(raw.practicalDaysTarget, d.practicalDaysTarget),
    hourlyRates: rates,
    ratesConfirmed: bool(raw.ratesConfirmed, d.ratesConfirmed),
    overtime: {
      weeklyThreshold: num(ot.weeklyThreshold, d.overtime.weeklyThreshold),
      tier1Hours: num(ot.tier1Hours, d.overtime.tier1Hours),
      tier1RatePercent: num(ot.tier1RatePercent, d.overtime.tier1RatePercent),
      tier2RatePercent: num(ot.tier2RatePercent, d.overtime.tier2RatePercent),
      includeCfa: bool(ot.includeCfa, d.overtime.includeCfa),
      rulesConfirmed: bool(ot.rulesConfirmed, d.overtime.rulesConfirmed),
    },
  };
}

function parseEntry(raw: unknown, index: number): DayEntry {
  const where = `journée n° ${index + 1}`;
  if (!isObj(raw)) throw new Error(`Format invalide (${where}).`);
  if (typeof raw.date !== 'string' || !isValidIsoDate(raw.date)) throw new Error(`Date invalide (${where}).`);
  if (raw.type !== 'entreprise' && raw.type !== 'cfa') throw new Error(`Type invalide (${where}).`);
  if (!Array.isArray(raw.segments) || raw.segments.length === 0) throw new Error(`Plages horaires manquantes (${where}).`);
  const segments = raw.segments.map((s) => {
    if (!isObj(s) || typeof s.start !== 'string' || typeof s.end !== 'string' || !isValidClock(s.start) || !isValidClock(s.end) || s.start === s.end) {
      throw new Error(`Plage horaire invalide (${where}).`);
    }
    return { start: s.start, end: s.end };
  });
  const breakMinutes = num(raw.breakMinutes, 0);
  if (breakMinutes < 0 || !Number.isInteger(breakMinutes)) throw new Error(`Pause invalide (${where}).`);
  const now = new Date().toISOString();
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `restored-${index}-${raw.date}`,
    date: raw.date,
    type: raw.type,
    segments,
    breakMinutes,
    note: typeof raw.note === 'string' && raw.note ? raw.note : undefined,
    createdAt: str(raw.createdAt, now),
    updatedAt: str(raw.updatedAt, now),
  };
}

/** Valide et normalise des données brutes (stockage local ou fichier de sauvegarde). Lève une erreur en français. */
export function normalizeData(raw: unknown): AppData {
  if (!isObj(raw)) throw new Error('Données illisibles.');
  if (raw.version !== 1) throw new Error('Version de données non prise en charge.');
  const entries = Array.isArray(raw.entries) ? raw.entries.map(parseEntry) : [];
  const seen = new Set<string>();
  for (const e of entries) {
    if (seen.has(e.date)) throw new Error(`Doublon : plusieurs journées le ${e.date}.`);
    seen.add(e.date);
  }
  const ids = new Set<string>();
  for (const e of entries) {
    if (ids.has(e.id)) e.id = `${e.id}-${e.date}`;
    ids.add(e.id);
  }
  return { version: 1, settings: normalizeSettings(raw.settings), entries };
}

/** Lit un fichier de sauvegarde exporté par l'application. */
export function parseBackup(text: string): AppData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Ce fichier n'est pas une sauvegarde valide (JSON illisible).");
  }
  if (!isObj(parsed) || parsed.app !== BACKUP_APP_ID) {
    throw new Error("Ce fichier n'est pas une sauvegarde de Mon Alternance CDG.");
  }
  return normalizeData(parsed.data);
}
