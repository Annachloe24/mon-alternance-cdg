import { useState } from 'react';
import { TrashIcon } from '../components/icons';
import { BreakEditor, SegmentsEditor } from '../components/TimeEditors';
import { Button, Card, Field, Notice, Page, Segmented, inputClass } from '../components/ui';
import { formatDateFr, isValidIsoDate, todayIso } from '../lib/dates';
import { computeDay, formatDuration, placeSegments } from '../lib/time';
import type { DayEntry, DayType, TimeSegment } from '../lib/types';
import { validateEntry } from '../lib/validation';
import { navigate } from '../router';
import { useStore } from '../store';

const DEFAULTS: Record<DayType, { segments: TimeSegment[]; breakMinutes: number }> = {
  entreprise: { segments: [{ start: '06:00', end: '14:00' }], breakMinutes: 30 },
  cfa: { segments: [{ start: '09:00', end: '17:00' }], breakMinutes: 60 },
};

/** Reprend les horaires de la dernière journée du même type pour accélérer la saisie. */
export function template(entries: DayEntry[], type: DayType) {
  const last = [...entries].filter((e) => e.type === type).sort((a, b) => b.date.localeCompare(a.date))[0];
  return last ? { segments: last.segments.map((s) => ({ ...s })), breakMinutes: last.breakMinutes } : structuredClone(DEFAULTS[type]);
}

export function EntryForm({ id, initialDate }: { id?: string; initialDate?: string }) {
  const { data, addEntry, updateEntry, deleteEntry } = useStore();
  const editing = id ? data.entries.find((e) => e.id === id) : undefined;

  const [date, setDate] = useState(editing?.date ?? (initialDate && isValidIsoDate(initialDate) ? initialDate : todayIso()));
  const [type, setType] = useState<DayType>(editing?.type ?? 'entreprise');
  const initial = editing ?? template(data.entries, type);
  const [segments, setSegments] = useState<TimeSegment[]>(initial.segments.map((s) => ({ ...s })));
  const [breakMinutes, setBreakMinutes] = useState(initial.breakMinutes);
  const [note, setNote] = useState(editing?.note ?? '');
  const [touchedTimes, setTouchedTimes] = useState(Boolean(editing));

  const draft = { id: editing?.id, date, type, segments, breakMinutes };
  const result = validateEntry(draft, data.entries, data.settings);
  const duplicate = data.entries.find((e) => e.date === date && e.id !== editing?.id);
  const summary = result.errors.length ? null : computeDay(draft);
  const placed = result.errors.length ? null : placeSegments(segments);

  if (id && !editing) {
    return (
      <Page title="Journée introuvable">
        <Notice tone="error">Cette journée a été supprimée ou n'existe pas.</Notice>
        <Button onClick={() => navigate('/historique')}>Retour à l'historique</Button>
      </Page>
    );
  }

  function changeType(t: DayType) {
    setType(t);
    // Tant que l'utilisateur n'a pas modifié les horaires, on propose ceux habituels du type choisi.
    if (!touchedTimes) {
      const tpl = template(data.entries, t);
      setSegments(tpl.segments);
      setBreakMinutes(tpl.breakMinutes);
    }
  }

  function save() {
    if (result.errors.length) return;
    const input = { date, type, segments, breakMinutes, note: note.trim() || undefined };
    if (editing) updateEntry(editing.id, input);
    else addEntry(input);
    navigate('/historique');
  }

  function remove() {
    if (editing && window.confirm(`Supprimer la journée du ${formatDateFr(editing.date)} ? Cette action est définitive.`)) {
      deleteEntry(editing.id);
      navigate('/historique');
    }
  }

  return (
    <Page title={editing ? 'Modifier la journée' : 'Nouvelle journée'} subtitle={isValidIsoDate(date) ? formatDateFr(date, 'long') : undefined}>
      <Card>
        <div className="space-y-4">
          <Segmented<DayType>
            value={type}
            onChange={changeType}
            options={[
              { value: 'entreprise', label: 'Entreprise' },
              { value: 'cfa', label: 'CFA' },
            ]}
          />
          <Field label="Date">
            <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          {!editing && (
            <a href="#/periode" className="flex min-h-11 items-center justify-center rounded-xl text-[15px] font-semibold text-blue-800 active:bg-blue-50">
              Saisir plusieurs jours d'un coup (ex. semaine CFA) ›
            </a>
          )}
        </div>
      </Card>

      <SegmentsEditor
        segments={segments}
        placed={placed}
        onChange={(list) => {
          setTouchedTimes(true);
          setSegments(list);
        }}
      />

      <BreakEditor value={breakMinutes} onChange={setBreakMinutes} />

      <Card title="Note (facultatif)">
        <textarea className={`${inputClass} min-h-20 py-2`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Terminal, poste, remarque…" maxLength={500} />
      </Card>

      {summary && (
        <Card title="Récapitulatif">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-slate-500">Présence</div>
              <div className="text-lg font-semibold tabular-nums">{formatDuration(summary.presenceMinutes)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Pause</div>
              <div className="text-lg font-semibold tabular-nums">{formatDuration(breakMinutes)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Travail</div>
              <div className="text-lg font-bold tabular-nums text-blue-900">{formatDuration(summary.workedMinutes)}</div>
            </div>
          </div>
        </Card>
      )}

      {result.errors.map((m) => (
        <Notice key={m} tone="error">
          {m}
          {duplicate && m.includes('existe déjà') && (
            <>
              {' '}
              <a className="font-semibold underline" href={`#/saisie/${duplicate.id}`}>
                Ouvrir cette journée
              </a>
            </>
          )}
        </Notice>
      ))}
      {result.warnings.map((m) => (
        <Notice key={m} tone="warning">
          {m}
        </Notice>
      ))}
      {result.infos.map((m) => (
        <Notice key={m}>{m}</Notice>
      ))}

      <div className="space-y-3 pt-1">
        <Button className="w-full" disabled={result.errors.length > 0} onClick={save}>
          {editing ? 'Enregistrer les modifications' : 'Enregistrer la journée'}
        </Button>
        {editing && (
          <Button variant="danger" className="w-full" onClick={remove}>
            <TrashIcon /> Supprimer cette journée
          </Button>
        )}
        <Button variant="ghost" className="w-full" onClick={() => history.back()}>
          Annuler
        </Button>
      </div>
    </Page>
  );
}
