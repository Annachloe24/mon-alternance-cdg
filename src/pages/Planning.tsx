import { useEffect, useRef, useState } from 'react';
import { ShareIcon, TrashIcon } from '../components/icons';
import { Button, Card, Notice, Page } from '../components/ui';
import { formatDateFr } from '../lib/dates';
import { deleteDocument, formatSize, getDocument, listDocuments, saveDocument, type DocumentInfo } from '../lib/documents';
import { offerFile } from '../lib/download';

export function Planning() {
  const [docs, setDocs] = useState<DocumentInfo[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function refresh() {
    try {
      const list = await listDocuments();
      setDocs(list);
      return list;
    } catch (e) {
      setDocs([]);
      setMessage({ tone: 'error', text: (e as Error).message });
      return [];
    }
  }

  useEffect(() => {
    void refresh().then((list) => {
      if (list.length) setOpenId(list[0].id);
    });
  }, []);

  // Crée l'adresse temporaire du PDF affiché, et la libère quand on change de document.
  useEffect(() => {
    if (!openId) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    void getDocument(openId).then((doc) => {
      if (cancelled || !doc) return;
      objectUrl = URL.createObjectURL(doc.blob);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [openId]);

  async function add(file: File) {
    setBusy(true);
    setMessage(null);
    try {
      const info = await saveDocument(file);
      await refresh();
      setOpenId(info.id);
      setMessage({ tone: 'success', text: `« ${info.name} » est enregistré sur cet appareil.` });
    } catch (e) {
      setMessage({ tone: 'error', text: (e as Error).message });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  async function remove(doc: DocumentInfo) {
    if (!window.confirm(`Retirer « ${doc.name} » de l'application ?`)) return;
    await deleteDocument(doc.id);
    const list = await refresh();
    if (openId === doc.id) setOpenId(list[0]?.id ?? null);
  }

  async function share(doc: DocumentInfo) {
    const stored = await getDocument(doc.id);
    if (stored) await offerFile(stored.blob, stored.name, 'application/pdf');
  }

  const current = docs?.find((d) => d.id === openId);

  return (
    <Page title="Planning de l'école">
      <Notice>
        Le PDF est enregistré <strong>uniquement sur cet appareil</strong> et reste consultable hors connexion. Il n'est pas lu
        automatiquement : reportez les journées CFA avec{' '}
        <a href="#/periode" className="font-semibold underline">
          Plusieurs jours
        </a>
        .
      </Notice>

      <Button className="w-full" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? 'Enregistrement…' : '+ Ajouter un planning PDF'}
      </Button>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void add(f);
        }}
      />
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      {docs && docs.length > 0 && (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
          {docs.map((d) => (
            <li key={d.id} className={`flex items-center ${d.id === openId ? 'bg-blue-50' : ''}`}>
              <button type="button" onClick={() => setOpenId(d.id)} className="min-h-14 min-w-0 flex-1 px-4 py-2 text-left">
                <span className="block truncate font-medium text-slate-900">{d.name}</span>
                <span className="block text-xs text-slate-500">
                  Ajouté le {formatDateFr(d.addedAt.slice(0, 10))} · {formatSize(d.size)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => void remove(d)}
                className="grid h-14 w-12 shrink-0 place-items-center text-slate-400 active:bg-red-50 active:text-red-600"
                aria-label={`Retirer ${d.name}`}
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      {docs && docs.length === 0 && (
        <Card>
          <p className="text-center text-slate-500">Aucun planning enregistré. Ajoutez le PDF reçu de l'école (depuis Fichiers, Mail…).</p>
        </Card>
      )}

      {current && url && (
        <Card title={current.name}>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => window.open(url, '_blank')}>
              Plein écran
            </Button>
            <Button variant="secondary" onClick={() => void share(current)}>
              <ShareIcon /> Partager
            </Button>
          </div>
          <iframe title={current.name} src={url} className="h-[70vh] w-full rounded-xl bg-slate-100 ring-1 ring-slate-200" />
          <p className="mt-2 text-xs text-slate-500">
            Si l'aperçu n'affiche qu'une page, utilisez « Plein écran » ou « Partager › Enregistrer dans Fichiers ».
          </p>
        </Card>
      )}
    </Page>
  );
}
