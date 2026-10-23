import { useMemo } from 'react';
import { Button, Card, LocalDataNotice, Notice, ProgressBar, Stat } from '../components/ui';
import { contractProgress } from '../lib/contract';
import { diffDays, formatDateFr, todayIso, weekStart } from '../lib/dates';
import { estimateMonth, formatEuro } from '../lib/salary';
import { getLastBackup } from '../lib/storage';
import { formatDuration } from '../lib/time';
import { countPracticalDays, summarizeWeeks } from '../lib/weekly';
import { navigate } from '../router';
import { useStore } from '../store';

const STATUS_LABEL = { 'a-venir': 'À venir', 'en-cours': 'En cours', termine: 'Terminé', invalide: 'Dates à vérifier' };

export function Dashboard() {
  const { data } = useStore();
  const { settings, entries } = data;
  const today = todayIso();

  const progress = contractProgress(settings, today);
  const practical = countPracticalDays(entries);
  const target = Math.max(1, settings.practicalDaysTarget);
  const weeks = useMemo(() => summarizeWeeks(entries, settings.overtime), [entries, settings.overtime]);
  const thisWeek = weeks.find((w) => w.weekStart === weekStart(today));
  const month = estimateMonth(Number(today.slice(0, 4)), Number(today.slice(5, 7)), settings, weeks);
  const todayEntry = entries.find((e) => e.date === today);

  const lastBackup = getLastBackup();
  const backupAge = lastBackup ? diffDays(lastBackup.slice(0, 10), today) : null;
  const needsBackup = entries.length > 0 && (backupAge === null || backupAge > 14);

  return (
    <div className="mx-auto max-w-xl px-4 pb-6">
      <header className="-mx-4 mb-4 bg-gradient-to-br from-blue-900 to-blue-700 px-5 pb-6 pt-[max(env(safe-area-inset-top),1.25rem)] text-white">
        <p className="text-sm text-blue-200">{formatDateFr(today, 'long')}</p>
        <h1 className="mt-1 text-[26px] font-bold leading-tight">Mon Alternance CDG</h1>
        <p className="text-sm text-blue-100">
          {settings.company} · {settings.location}
        </p>
        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="font-semibold">Contrat · {STATUS_LABEL[progress.status]}</span>
            <span className="tabular-nums">{progress.percent.toLocaleString('fr-FR')} %</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-amber-400" style={{ width: `${progress.percent}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-blue-100">
            <span>{formatDateFr(settings.contractStart)}</span>
            <span>
              {progress.remainingDays} j restants sur {progress.totalDays}
            </span>
            <span>{formatDateFr(settings.contractEnd)}</span>
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {needsBackup && (
          <Notice tone="warning">
            {backupAge === null ? 'Aucune sauvegarde exportée pour le moment.' : `Dernière sauvegarde il y a ${backupAge} jours.`}{' '}
            <a href="#/donnees" className="font-semibold underline">
              Exporter une sauvegarde
            </a>
          </Notice>
        )}

        <Button className="w-full" onClick={() => navigate(todayEntry ? `/saisie/${todayEntry.id}` : `/saisie?date=${today}`)}>
          {todayEntry ? "Modifier la journée d'aujourd'hui" : "Saisir aujourd'hui"}
        </Button>

        <Card title="Formation pratique en entreprise">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-4xl font-bold tabular-nums text-slate-900">{practical}</span>
              <span className="text-lg text-slate-500"> / {target} jours</span>
            </div>
            <span className="text-sm font-medium text-slate-600">
              {practical >= target ? 'Objectif atteint ✓' : `${target - practical} restants`}
            </span>
          </div>
          <div className="mt-3">
            <ProgressBar percent={(practical / target) * 100} tone={practical >= target ? 'emerald' : 'blue'} />
          </div>
          <p className="mt-2 text-xs text-slate-500">Journées en entreprise avec des heures saisies. Les journées CFA ne sont pas comptées.</p>
        </Card>

        <Card title="Cette semaine">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Entreprise" value={formatDuration(thisWeek?.entrepriseMinutes ?? 0)} />
            <Stat label="CFA" value={formatDuration(thisWeek?.cfaMinutes ?? 0)} />
            <Stat
              label="Heures sup. (est.)"
              value={formatDuration(thisWeek?.overtime.totalMinutes ?? 0)}
              hint={settings.overtime.rulesConfirmed ? undefined : 'règles à confirmer'}
            />
          </div>
          <div className="mt-3">
            <ProgressBar percent={((thisWeek?.countedMinutes ?? 0) / (settings.weeklyHours * 60)) * 100} tone="amber" />
            <p className="mt-1 text-xs text-slate-500">
              {formatDuration(thisWeek?.countedMinutes ?? 0)} comptées sur {settings.weeklyHours} h contractuelles
            </p>
          </div>
        </Card>

        <Card title={`Salaire brut estimé · ${month.label}`}>
          <div className="text-3xl font-bold tabular-nums text-slate-900">{formatEuro(month.totalGross)}</div>
          <p className="mt-1 text-sm text-slate-500">
            Base {formatEuro(month.baseGross)}
            {month.overtimeGross > 0 && ` + heures sup. ${formatEuro(month.overtimeGross)}`}
          </p>
          {(!settings.ratesConfirmed || month.missingRate) && (
            <p className="mt-2 text-xs font-medium text-amber-700">Estimation indicative : taux horaire à vérifier dans les paramètres.</p>
          )}
          <a href="#/salaire" className="mt-2 inline-block text-sm font-semibold text-blue-800">
            Voir le détail par mois ›
          </a>
        </Card>

        <LocalDataNotice />
      </div>
    </div>
  );
}
