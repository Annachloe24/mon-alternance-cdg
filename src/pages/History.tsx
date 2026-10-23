import { useState } from 'react';
import { TrashIcon } from '../components/icons';
import { Button, Card, Page, Segmented, TypeBadge } from '../components/ui';
import { formatDateFr, formatMonthFr } from '../lib/dates';
import { computeDay, formatDuration } from '../lib/time';
import type { DayEntry } from '../lib/types';
import { navigate } from '../router';
import { useStore } from '../store';

type Filter = 'tous' | 'entreprise' | 'cfa';

export function History() {
  const { data, deleteEntry } = useStore();
  const [filter, setFilter] = useState<Filter>('tous');

  const entries = data.entries
    .filter((e) => filter === 'tous' || e.type === filter)
    .sort((a, b) => b.date.localeCompare(a.date));

  const groups = new Map<string, DayEntry[]>();
  for (const e of entries) {
    const key = e.date.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }

  function remove(e: DayEntry) {
    if (window.confirm(`Supprimer la journée du ${formatDateFr(e.date)} ? Cette action est définitive.`)) deleteEntry(e.id);
  }

  return (
    <Page title="Historique" subtitle={`${data.entries.length} journée${data.entries.length > 1 ? 's' : ''} enregistrée${data.entries.length > 1 ? 's' : ''}`}>
      <Segmented<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'tous', label: 'Tout' },
          { value: 'entreprise', label: 'Entreprise' },
          { value: 'cfa', label: 'CFA' },
        ]}
      />

      {entries.length === 0 && (
        <Card>
          <p className="text-center text-slate-500">Aucune journée {filter !== 'tous' ? 'de ce type ' : ''}pour le moment.</p>
          <Button className="mt-3 w-full" onClick={() => navigate('/saisie')}>
            Saisir une journée
          </Button>
        </Card>
      )}

      {[...groups].map(([month, list]) => {
        const total = list.reduce((s, e) => s + computeDay(e).workedMinutes, 0);
        return (
          <section key={month}>
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h2 className="font-semibold capitalize text-slate-700">{formatMonthFr(Number(month.slice(0, 4)), Number(month.slice(5, 7)))}</h2>
              <span className="text-sm tabular-nums text-slate-500">{formatDuration(total)}</span>
            </div>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
              {list.map((e) => {
                const d = computeDay(e);
                return (
                  <li key={e.id} className="flex items-center">
                    <a href={`#/saisie/${e.id}`} className="flex min-h-16 min-w-0 flex-1 items-center gap-3 px-4 py-3 active:bg-slate-50">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold capitalize text-slate-900">{formatDateFr(e.date, 'weekday')}</span>
                          <TypeBadge type={e.type} />
                        </div>
                        <div className="truncate text-sm text-slate-500">
                          {e.segments.map((s) => `${s.start}–${s.end}`).join(' · ')}
                          {e.breakMinutes > 0 && ` · pause ${e.breakMinutes} min`}
                          {d.crossesMidnight && ' · nuit'}
                        </div>
                        {e.note && <div className="truncate text-xs text-slate-400">{e.note}</div>}
                      </div>
                      <span className="text-lg font-semibold tabular-nums text-slate-900">{formatDuration(d.workedMinutes)}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => remove(e)}
                      className="grid h-16 w-12 shrink-0 place-items-center text-slate-400 active:bg-red-50 active:text-red-600"
                      aria-label={`Supprimer la journée du ${formatDateFr(e.date)}`}
                    >
                      <TrashIcon />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </Page>
  );
}
