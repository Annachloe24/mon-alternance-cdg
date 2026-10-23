import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createDefaultData } from './lib/defaults';
import { loadData, saveData } from './lib/storage';
import type { AppData, DayEntry, Settings } from './lib/types';

export type EntryInput = Omit<DayEntry, 'id' | 'createdAt' | 'updatedAt'>;

interface Store {
  data: AppData;
  /** Message affiché si la lecture ou l'écriture locale a échoué. */
  storageError?: string;
  addEntry: (input: EntryInput) => DayEntry;
  updateEntry: (id: string, input: EntryInput) => void;
  deleteEntry: (id: string) => void;
  updateSettings: (settings: Settings) => void;
  replaceAll: (data: AppData) => void;
  resetAll: () => void;
}

const StoreContext = createContext<Store | null>(null);

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const initial = useRef(loadData());
  const [data, setData] = useState<AppData>(initial.current.data);
  const [storageError, setStorageError] = useState<string | undefined>(initial.current.error);
  const firstRender = useRef(true);

  useEffect(() => {
    // Ne pas réécrire au premier rendu : cela écraserait une copie illisible avant que l'utilisateur ne la voie.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!saveData(data)) {
      setStorageError("Impossible d'enregistrer sur cet appareil (stockage plein ou navigation privée). Exportez une sauvegarde.");
    }
  }, [data]);

  const addEntry = useCallback((input: EntryInput) => {
    const now = new Date().toISOString();
    const entry: DayEntry = { ...input, id: newId(), createdAt: now, updatedAt: now };
    setData((d) => ({ ...d, entries: [...d.entries, entry] }));
    return entry;
  }, []);

  const updateEntry = useCallback((id: string, input: EntryInput) => {
    const now = new Date().toISOString();
    setData((d) => ({
      ...d,
      entries: d.entries.map((e) => (e.id === id ? { ...e, ...input, updatedAt: now } : e)),
    }));
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setData((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) }));
  }, []);

  const updateSettings = useCallback((settings: Settings) => setData((d) => ({ ...d, settings })), []);
  const replaceAll = useCallback((next: AppData) => setData(next), []);
  const resetAll = useCallback(() => setData(createDefaultData()), []);

  const value = useMemo(
    () => ({ data, storageError, addEntry, updateEntry, deleteEntry, updateSettings, replaceAll, resetAll }),
    [data, storageError, addEntry, updateEntry, deleteEntry, updateSettings, replaceAll, resetAll],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore doit être utilisé dans StoreProvider');
  return store;
}
