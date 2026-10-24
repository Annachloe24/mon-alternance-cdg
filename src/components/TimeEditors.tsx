import { TrashIcon } from './icons';
import { Button, Card, Field, NumberInput, inputClass } from './ui';
import { formatClock, isValidClock, parseClock, type PlacedSegment } from '../lib/time';
import type { TimeSegment } from '../lib/types';

const BREAK_PRESETS = [0, 15, 20, 30, 45, 60];

/** Liste des plages horaires d'une journée, avec ajout / suppression. */
export function SegmentsEditor({
  segments,
  placed,
  onChange,
}: {
  segments: TimeSegment[];
  /** Plages placées (si valides) pour afficher les badges « lendemain ». */
  placed: PlacedSegment[] | null;
  onChange: (segments: TimeSegment[]) => void;
}) {
  const update = (i: number, patch: Partial<TimeSegment>) => onChange(segments.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  function add() {
    // Nouvelle plage proposée 1 h après la fin de la précédente, pour 4 h.
    const last = segments[segments.length - 1];
    const lastEnd = last && isValidClock(last.end) ? parseClock(last.end) : 7 * 60;
    onChange([...segments, { start: formatClock(lastEnd + 60), end: formatClock(lastEnd + 300) }]);
  }

  return (
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
                    onClick={() => onChange(segments.filter((_, j) => j !== i))}
                    aria-label={`Supprimer la plage ${i + 1}`}
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Début">
                  <input type="time" className={inputClass} value={seg.start} onChange={(e) => update(i, { start: e.target.value })} required />
                </Field>
                <Field label="Fin">
                  <input type="time" className={inputClass} value={seg.end} onChange={(e) => update(i, { end: e.target.value })} required />
                </Field>
              </div>
            </div>
          );
        })}
        <Button variant="secondary" className="w-full" onClick={add}>
          + Ajouter une plage
        </Button>
        <p className="text-xs text-slate-500">
          Saisissez les plages dans l'ordre. Une fin plus tôt que le début signifie un passage après minuit : les heures restent
          comptées sur la date de début.
        </p>
      </div>
    </Card>
  );
}

export function BreakEditor({ value, onChange }: { value: number; onChange: (minutes: number) => void }) {
  return (
    <Card title="Pause non rémunérée">
      <div className="mb-3 flex flex-wrap gap-2">
        {BREAK_PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={`min-h-11 min-w-14 rounded-xl px-3 text-[15px] font-semibold ring-1 ${value === m ? 'bg-blue-800 text-white ring-blue-800' : 'bg-white text-slate-700 ring-slate-200'}`}
          >
            {m} min
          </button>
        ))}
      </div>
      <Field label="Durée totale des pauses (minutes)">
        <NumberInput value={value} onChange={onChange} min={0} max={1440} step="integer" />
      </Field>
    </Card>
  );
}
