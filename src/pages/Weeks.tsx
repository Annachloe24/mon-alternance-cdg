import { useMemo } from 'react';
import { Card, Notice, Page } from '../components/ui';
import { formatDateFr } from '../lib/dates';
import { formatDuration } from '../lib/time';
import { summarizeWeeks } from '../lib/weekly';
import { useStore } from '../store';

export function OvertimeRulesWarning() {
  return (
    <Notice tone="warning">
      <strong>Règles non confirmées.</strong> Les heures supplémentaires sont estimées avec des paramètres par défaut (au-delà de
      35 h : +25 % pour les 8 premières heures, +50 % ensuite). Votre convention collective ou un accord d'entreprise peut
      prévoir d'autres règles (taux, modulation, repos compensateur). Vérifiez auprès de votre employeur, puis confirmez dans{' '}
      <a href="#/parametres" className="font-semibold underline">
        Paramètres
      </a>
      .
    </Notice>
  );
}

export function Weeks() {
  const { data } = useStore();
  const { settings } = data;
  const ot = settings.overtime;
  const weeks = useMemo(() => summarizeWeeks(data.entries, ot), [data.entries, ot]);
  const totalOvertime = weeks.reduce((s, w) => s + w.overtime.totalMinutes, 0);

  return (
    <Page title="Heures" subtitle="Récapitulatif par semaine (lundi → dimanche)">
      {!ot.rulesConfirmed && <OvertimeRulesWarning />}

      <Card>
        <div className="flex items-center justify-between">
          <span className="text-slate-600">Heures sup. estimées (total)</span>
          <span className="text-xl font-bold tabular-nums">{formatDuration(totalOvertime)}</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Seuil {ot.weeklyThreshold} h · +{ot.tier1RatePercent} % jusqu'à {ot.weeklyThreshold + ot.tier1Hours} h · +{ot.tier2RatePercent} % au-delà ·
          CFA {ot.includeCfa ? 'inclus' : 'exclu'}
        </p>
      </Card>

      {weeks.length === 0 && (
        <Card>
          <p className="text-center text-slate-500">Les semaines apparaîtront ici dès la première journée saisie.</p>
        </Card>
      )}

      {weeks.map((w) => {
        const diff = w.countedMinutes - settings.weeklyHours * 60;
        return (
          <Card key={w.weekStart}>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-semibold text-slate-900">Semaine {w.isoWeek}</h2>
              <span className="text-sm text-slate-500">
                {formatDateFr(w.weekStart, 'weekday')} → {formatDateFr(w.weekEnd, 'weekday')}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-slate-500">Entreprise ({w.entrepriseDays} j)</dt>
              <dd className="text-right font-semibold tabular-nums">{formatDuration(w.entrepriseMinutes)}</dd>
              <dt className="text-slate-500">CFA ({w.cfaDays} j)</dt>
              <dd className="text-right font-semibold tabular-nums">{formatDuration(w.cfaMinutes)}</dd>
              <dt className="text-slate-500">Total retenu</dt>
              <dd className="text-right font-bold tabular-nums">{formatDuration(w.countedMinutes)}</dd>
              <dt className="text-slate-500">Écart / {settings.weeklyHours} h</dt>
              <dd className={`text-right font-semibold tabular-nums ${diff > 0 ? 'text-amber-700' : diff < 0 ? 'text-slate-500' : 'text-emerald-700'}`}>
                {diff > 0 ? '+' : ''}
                {formatDuration(diff)}
              </dd>
            </dl>
            {w.overtime.totalMinutes > 0 && (
              <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Heures sup. estimées : <strong>{formatDuration(w.overtime.totalMinutes)}</strong>
                <span className="block text-xs">
                  {formatDuration(w.overtime.tier1Minutes)} à +{ot.tier1RatePercent} %
                  {w.overtime.tier2Minutes > 0 && ` · ${formatDuration(w.overtime.tier2Minutes)} à +${ot.tier2RatePercent} %`}
                </span>
              </div>
            )}
            {w.countedMinutes > 48 * 60 && (
              <p className="mt-2 text-xs font-medium text-red-700">Plus de 48 h dans la semaine : durée maximale hebdomadaire dépassée.</p>
            )}
          </Card>
        );
      })}
    </Page>
  );
}
