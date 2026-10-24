import { useState } from 'react';
import { BreakEditor, SegmentsEditor } from '../components/TimeEditors';
import { Button, Card, Field, Notice, Page, Segmented, inputClass } from '../components/ui';
import { addDays, formatDateFr, todayIso, weekStart } from '../lib/dates';
import { planPeriod } from '../lib/period';
import { computeDay, formatDuration, placeSegments } from '../lib/time';
import type { DayType, TimeSegment } from '../lib/types';
import { navigate } from '../router';
import { useStore } from '../store';
import { template } from './EntryForm';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const WEEKDAY_NAMES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

export function Period() {
  const { data, addEntries } = useStore();
  const nextMonday = addDays(weekStart(todayIso()), 7);
  const [type, setType] = useState<DayType>('cfa');
  const [from, setFrom] = useState(nextMonday);
  const [to, setTo] = useState(addDays(nextMonday, 4));
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4]);
  const initial = template(data.entries, 'cfa');
  const [segments, setSegments] = useState<TimeSegment[]>(initial.segments);
  const [breakMinutes, setBreakMinutes] = useState(initial.breakMinutes);
  const [touchedTimes, setTouchedTimes] = useState(false);

  const plan = planPeriod({ from, to, weekdays, type, segments, breakMinutes }, data.entries, data.settings);
  const placed = plan.errors.length ? null : placeSegments(segments);
  const perDay = plan.create.length ? computeDay(plan.create[0]).workedMinutes : 0;

  function changeType(t: DayType) {
    setType(t);
    if (!touchedTimes) {
      const tpl = template(data.entries, t);
      setSegments(tpl.segments);
      setBreakMinutes(tpl.breakMinutes);
    }
  }

  function toggleDay(i: number) {
    setWeekdays((list) => (list.includes(i) ? list.filter((d) => d !== i) : [...list, i].sort()));
  }

  function create() {
    if (plan.errors.length || !plan.create.length) return;
    addEntries(plan.create.map(({ date, type: t, segments: s, breakMinutes: b }) => ({ date, type: t, segments: s, breakMinutes: b })));
    navigate('/historique');
  }

  return (
    <Page title="Plusieurs jours" subtitle="Crée la même journée sur une période">
      <Notice>
        Pratique pour reporter le planning de l'école : par exemple une semaine de CFA du lundi au vendredi.{' '}
        <a href="#/planning" className="font-semibold underline">
          Consulter le planning PDF
        </a>
      </Notice>

      <Card>
        <div className="space-y-4">
          <Segmented<DayType>
            value={type}
            onChange={changeType}
            options={[
              { value: 'cfa', label: 'CFA' },
              { value: 'entreprise', label: 'Entreprise' },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Du">
              <input type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="Au (inclus)">
              <input type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Jours concernés</span>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={weekdays.includes(i)}
                  aria-label={WEEKDAY_NAMES[i]}
                  onClick={() => toggleDay(i)}
                  className={`h-11 rounded-xl text-[15px] font-semibold ring-1 ${weekdays.includes(i) ? 'bg-blue-800 text-white ring-blue-800' : 'bg-white text-slate-600 ring-slate-200'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
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

      {plan.errors.map((m) => (
        <Notice key={m} tone="error">
          {m}
        </Notice>
      ))}

      {!plan.errors.length && (
        <Card title="Aperçu">
          <p className="text-slate-900">
            <strong>{plan.create.length}</strong> journée{plan.create.length > 1 ? 's' : ''} {type === 'cfa' ? 'CFA' : 'entreprise'} à créer
            {plan.create.length > 0 && ` · ${formatDuration(perDay)} chacune · ${formatDuration(perDay * plan.create.length)} au total`}
          </p>
          {plan.create.length > 0 && (
            <p className="mt-1 text-sm text-slate-500">
              {plan.create.map((d) => formatDateFr(d.date, 'weekday')).join(', ')}
            </p>
          )}
          {plan.skipped.length > 0 && (
            <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <strong>{plan.skipped.length} date{plan.skipped.length > 1 ? 's' : ''} ignorée{plan.skipped.length > 1 ? 's' : ''}</strong> (rien n'est écrasé) :
              <ul className="mt-1 list-disc pl-5">
                {plan.skipped.map((s) => (
                  <li key={s.date}>
                    {formatDateFr(s.date, 'weekday')} : {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      <div className="space-y-3 pt-1">
        <Button className="w-full" disabled={!!plan.errors.length || !plan.create.length} onClick={create}>
          Créer {plan.create.length || ''} journée{plan.create.length > 1 ? 's' : ''}
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => history.back()}>
          Annuler
        </Button>
      </div>
    </Page>
  );
}
