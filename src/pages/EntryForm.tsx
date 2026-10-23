import { useState } from 'react';
import { TrashIcon } from '../components/icons';
import { Button, Card, Field, Notice, NumberInput, Page, Segmented, inputClass } from '../components/ui';
import { formatDateFr, isValidIsoDate, todayIso } from '../lib/dates';
import { computeDay, formatClock, formatDuration, isValidClock, parseClock, placeSegments } from '../lib/time';
import type { DayEntry, DayType, TimeSegment } from '../lib/types';
import { validateEntry } from '../lib/validation';
import { navigate } from '../router';
import { useStore } from '../store';

const BREAK_PRESETS = [0, 15, 20, 30, 45, 60];
const DEFAULTS: Record<DayType, { segments: TimeSegment[]; breakMinutes: number }> = {
  entreprise: { segments: [{ start: '06:00', end: '14:00' }], breakMinutes: 30 },
  cfa: { segments: [{ start: '09:00', end: '17:00' }], breakMinutes: 60 },
};

/** Reprend les horaires de la dernière journée du même type pour accélérer la saisie. */
function template(entries: DayEntry[], type: DayType) {
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

  function updateSegment(i: number, patch: Partial<TimeSegment>) {
    setTouchedTimes(true);
    setSegments((list) => list.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  }

  function addSegment() {
    setTouchedTimes(true);
    setSegments((list) => {
      // Nouvelle plage proposée 1 h après la fin de la précédente, pour 4 h.
      const last = list[list.length - 1];
      const lastEnd = last && isValidClock(last.end) ? parseClock(last.end) : 7 * 60;
      return [...list, { start: formatClock(lastEnd + 60), end: formatClock(lastEnd + 300) }];
    });
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
        </div>
      </Card>

      <Card title="Plages horaires">
        <div className="space-y-3">
          {segments.map((seg, i) => {
            const nextDay = placed && placed[i].start >= 1440;
            const endsNextDay = placed && placed[i].end > 1440 && !nextDay;
            return (
              <div key={i} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">
                    Plage {i + 1}
                    {nextDay && <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-800">lendemain</span>}
                    {endsNextDay && <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-800">fin +1 j</span>}
                  </span>
                  {segments.length > 1 && (
                    <button
                      type="button"
                      className="grid h-10 w-10 place-items-center rounded-lg text-red-600 active:bg-red-50"
                      onClick={() => {
                        setTouchedTimes(true);
                        setSegments((list) => list.filter((_, j) => j !== i));
                      }}
                      aria-label={`Supprimer la plage ${i + 1}`}
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Début">
                    <input type="time" className={inputClass} value={seg.start} onChange={(e) => updateSegment(i, { start: e.target.value })} required />
                  </Field>
                  <Field label="Fin">
                    <input type="time" className={inputClass} value={seg.end} onChange={(e) => updateSegment(i, { end: e.target.value })} required />
                  </Field>
                </div>
              </div>
            );
          })}
          <Button variant="secondary" className="w-full" onClick={addSegment}>
            + Ajouter une plage
          </Button>
          <p className="text-xs text-slate-500">
            Saisissez les plages dans l'ordre. Une fin plus tôt que le début signifie un passage après minuit : les heures restent
            comptées sur la date de début.
          </p>
        </div>
      </Card>

      <Card title="Pause non rémunérée">
        <div className="mb-3 flex flex-wrap gap-2">
          {BREAK_PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setBreakMinutes(m)}
              className={`min-h-11 min-w-14 rounded-xl px-3 text-[15px] font-semibold ring-1 ${breakMinutes === m ? 'bg-blue-800 text-white ring-blue-800' : 'bg-white text-slate-700 ring-slate-200'}`}
            >
              {m} min
            </button>
          ))}
        </div>
        <Field label="Durée totale des pauses (minutes)">
          <NumberInput value={breakMinutes} onChange={setBreakMinutes} min={0} max={1440} step="integer" />
        </Field>
      </Card>

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
