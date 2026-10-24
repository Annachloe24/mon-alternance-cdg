import { useRef, useState } from 'react';
import { SaveIcon, ShareIcon } from '../components/icons';
import { Button, Card, LocalDataNotice, Notice, Page } from '../components/ui';
import { parseBackup, serializeBackup } from '../lib/backup';
import { entriesToCsv } from '../lib/csv';
import { formatDateFr, todayIso } from '../lib/dates';
import { clearDocuments } from '../lib/documents';
import { offerFile } from '../lib/download';
import { getLastBackup, setLastBackup } from '../lib/storage';
import { useStore } from '../store';

type Message = { tone: 'success' | 'error' | 'info'; text: string } | null;

export function DataPage() {
  const { data, replaceAll, resetAll } = useStore();
  const [message, setMessage] = useState<Message>(null);
  const [lastBackup, setLast] = useState(getLastBackup());
  const fileInput = useRef<HTMLInputElement>(null);
  const stamp = todayIso();

  async function exportCsv() {
    const r = await offerFile(entriesToCsv(data.entries), `alternance-cdg-journees-${stamp}.csv`, 'text/csv;charset=utf-8');
    if (r !== 'cancelled') setMessage({ tone: 'success', text: `Export CSV prêt (${data.entries.length} journées).` });
  }

  async function exportBackup() {
    const r = await offerFile(serializeBackup(data), `alternance-cdg-sauvegarde-${stamp}.json`, 'application/json');
    if (r === 'cancelled') return;
    const now = new Date().toISOString();
    setLastBackup(now);
    setLast(now);
    setMessage({ tone: 'success', text: 'Sauvegarde créée. Conservez ce fichier en lieu sûr (Fichiers, iCloud Drive, e-mail…).' });
  }

  async function importBackup(file: File) {
    try {
      const restored = parseBackup(await file.text());
      const ok = window.confirm(
        `Restaurer cette sauvegarde (${restored.entries.length} journées) ?\n\nLes ${data.entries.length} journées et les paramètres actuels de cet appareil seront remplacés.`,
      );
      if (!ok) return;
      replaceAll(restored);
      setMessage({ tone: 'success', text: `Sauvegarde restaurée : ${restored.entries.length} journées.` });
    } catch (e) {
      setMessage({ tone: 'error', text: (e as Error).message });
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  function reset() {
    if (!window.confirm('Effacer toutes les journées et paramètres de cet appareil ?')) return;
    if (!window.confirm('Dernière confirmation : cette action est irréversible sans sauvegarde. Continuer ?')) return;
    resetAll();
    void clearDocuments().catch(() => undefined);
    setMessage({ tone: 'info', text: 'Toutes les données (journées, paramètres et plannings PDF) ont été effacées.' });
  }

  return (
    <Page title="Données et sauvegarde">
      <LocalDataNotice />

      <Card title="Sauvegarde">
        <p className="mb-3 text-sm text-slate-600">
          {lastBackup ? `Dernière sauvegarde : ${formatDateFr(lastBackup.slice(0, 10))}.` : 'Aucune sauvegarde exportée depuis cet appareil.'} La
          sauvegarde contient toutes les journées et tous les paramètres (pas les plannings PDF : gardez l'original reçu de
          l'école). Elle permet de restaurer les données sur un nouvel appareil ou après une suppression de l'application.
        </p>
        <div className="space-y-2">
          <Button className="w-full" onClick={exportBackup}>
            <SaveIcon /> Exporter une sauvegarde (.json)
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => fileInput.current?.click()}>
            Restaurer une sauvegarde…
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importBackup(f);
            }}
          />
        </div>
      </Card>

      <Card title="Export pour tableur">
        <p className="mb-3 text-sm text-slate-600">Fichier CSV (séparateur « ; ») lisible dans Excel, Numbers ou Google Sheets.</p>
        <Button variant="secondary" className="w-full" disabled={!data.entries.length} onClick={exportCsv}>
          <ShareIcon /> Exporter les journées en CSV
        </Button>
      </Card>

      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <Card title="Zone sensible">
        <Button variant="danger" className="w-full" onClick={reset}>
          Effacer toutes les données
        </Button>
      </Card>
    </Page>
  );
}
