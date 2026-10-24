/**
 * Planning(s) PDF de l'école, stockés dans IndexedDB sur l'appareil.
 * localStorage serait trop petit (≈ 5 Mo) pour des fichiers : IndexedDB accepte des Blob de plusieurs dizaines de Mo.
 */

export interface StoredDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  addedAt: string;
  blob: Blob;
}

export type DocumentInfo = Omit<StoredDocument, 'blob'>;

const DB_NAME = 'mon-alternance-cdg';
const STORE = 'documents';
export const MAX_DOCUMENT_BYTES = 30 * 1024 * 1024;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) {
      reject(new Error("Le stockage de fichiers n'est pas disponible sur ce navigateur."));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Impossible d'ouvrir le stockage de fichiers."));
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error ?? new Error('Erreur de stockage.'));
      tx.onabort = () => reject(tx.error ?? new Error('Stockage plein ou refusé.'));
    });
  } finally {
    db.close();
  }
}

/** Vérifie le fichier choisi avant enregistrement. Renvoie un message d'erreur, ou null si le fichier est accepté. */
export function checkPdf(file: Pick<File, 'name' | 'size' | 'type'>): string | null {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) return 'Seuls les fichiers PDF sont acceptés.';
  if (file.size === 0) return 'Ce fichier est vide.';
  if (file.size > MAX_DOCUMENT_BYTES) return 'Fichier trop volumineux (30 Mo maximum).';
  return null;
}

export async function listDocuments(): Promise<DocumentInfo[]> {
  const all = await run<StoredDocument[]>('readonly', (s) => s.getAll() as IDBRequest<StoredDocument[]>);
  return all
    .map(({ blob: _blob, ...info }) => info)
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

export async function getDocument(id: string): Promise<StoredDocument | undefined> {
  return run<StoredDocument | undefined>('readonly', (s) => s.get(id) as IDBRequest<StoredDocument | undefined>);
}

export async function saveDocument(file: File): Promise<DocumentInfo> {
  const error = checkPdf(file);
  if (error) throw new Error(error);
  const doc: StoredDocument = {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,
    name: file.name,
    size: file.size,
    type: 'application/pdf',
    addedAt: new Date().toISOString(),
    // Copie en mémoire : Safari ne garde pas toujours l'accès au fichier d'origine après sa sélection.
    blob: new Blob([await file.arrayBuffer()], { type: 'application/pdf' }),
  };
  await run('readwrite', (s) => s.put(doc));
  const { blob: _blob, ...info } = doc;
  return info;
}

export async function deleteDocument(id: string): Promise<void> {
  await run('readwrite', (s) => s.delete(id));
}

export async function clearDocuments(): Promise<void> {
  await run('readwrite', (s) => s.clear());
}

export function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;
}
