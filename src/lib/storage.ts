import { normalizeData } from './backup';
import { createDefaultData } from './defaults';
import type { AppData } from './types';

export const STORAGE_KEY = 'mon-alternance-cdg:v1';
const LAST_BACKUP_KEY = 'mon-alternance-cdg:last-backup';

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStorage(): KeyValueStorage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export interface LoadResult {
  data: AppData;
  /** Message si les données enregistrées étaient illisibles (elles sont alors conservées sous une autre clé). */
  error?: string;
}

export function loadData(storage: KeyValueStorage | undefined = defaultStorage()): LoadResult {
  if (!storage) return { data: createDefaultData(), error: "Le stockage local n'est pas disponible sur ce navigateur." };
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return { data: createDefaultData() };
  try {
    return { data: normalizeData(JSON.parse(raw)) };
  } catch (e) {
    // On ne détruit jamais des données illisibles : copie de secours avant de repartir de zéro.
    storage.setItem(`${STORAGE_KEY}:corrompu:${Date.now()}`, raw);
    return { data: createDefaultData(), error: `Données locales illisibles (${(e as Error).message}). Une copie a été conservée.` };
  }
}

export function saveData(data: AppData, storage: KeyValueStorage | undefined = defaultStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function getLastBackup(storage: KeyValueStorage | undefined = defaultStorage()): string | null {
  try {
    return storage?.getItem(LAST_BACKUP_KEY) ?? null;
  } catch {
    return null;
  }
}

export function setLastBackup(iso: string, storage: KeyValueStorage | undefined = defaultStorage()): void {
  try {
    storage?.setItem(LAST_BACKUP_KEY, iso);
  } catch {
    /* sans effet */
  }
}

/** Demande au navigateur de ne pas effacer automatiquement les données (Safari, Chrome…). */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* non pris en charge */
  }
  return false;
}
