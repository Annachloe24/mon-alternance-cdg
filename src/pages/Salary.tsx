import { useMemo } from 'react';
import { Card, Notice, Page } from '../components/ui';
import { formatDateFr, todayIso } from '../lib/dates';
import { estimateContract, formatEuro, monthlyReferenceHours, rateOn } from '../lib/salary';
import { formatDuration } from '../lib/time';
import { summarizeWeeks } from '../lib/weekly';
import { useStore } from '../store';
import { OvertimeRulesWarning } from './Weeks';

export function Salary() {
  const { data } = useStore();
  const { settings } = data;
  const weeks = useMemo(() => summarizeWeeks(data.entries, settings.overtime), [data.entries, settings.overtime]);
  const months = useMemo(() => estimateContract(settings, weeks), [settings, weeks]);
  const today = todayIso();
  const currentKey = today.slice(0, 7);
  const rate = rateOn(today, settings.hourlyRates) ?? rateOn(settings.contractStart, settings.hourlyRates);
  const total = months.reduce((s, m) => s + m.totalGross, 0);
  const refHours = monthlyReferenceHours(settings.weeklyHours);

  return (
    <Page title="Salaire estimé" subtitle="Montants bruts, avant cotisations">
      {!settings.ratesConfirmed && (
        <Notice tone="warning">
          <strong>Taux horaire à vérifier.</strong> Le taux par défaut correspond au SMIC horaire brut connu au 1er janvier 2026.
          Il est revalorisé au moins chaque année : vérifiez-le sur service-public.fr ou sur votre fiche de paie et ajoutez les
          nouvelles dates d'effet dans{' '}
          <a href="#/parametres" className="font-semibold underline">
            Paramètres
          </a>
          .
        </Notice>
      )}
      {!settings.overtime.rulesConfirmed && <OvertimeRulesWarning />}

      <Card title="Base de calcul">
        <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
          <dt className="text-slate-500">Rémunération</dt>
          <dd className="text-right font-semibold">
            {settings.salaryPercent} % · {settings.ageBracket}
          </dd>
          <dt className="text-slate-500">Taux de référence actuel</dt>
          <dd className="text-right font-semibold">{rate !== undefined ? `${formatEuro(rate)} / h` : 'non défini'}</dd>
          <dt className="text-slate-500">Taux appliqué</dt>
          <dd className="text-right font-semibold">{rate !== undefined ? `${formatEuro((rate * settings.salaryPercent) / 100)} / h` : '—'}</dd>
          <dt className="text-slate-500">Heures mensualisées</dt>
          <dd className="text-right font-semibold">{refHours.toFixed(2).replace('.', ',')} h</dd>
        </dl>
      </Card>

      <Card title="Par mois">
        <ul className="divide-y divide-slate-100">
          {months.map((m) => {
            const key = `${m.year}-${String(m.month).padStart(2, '0')}`;
            return (
              <li key={key} className={`py-3 ${key === currentKey ? '-mx-2 rounded-xl bg-blue-50 px-2' : ''}`}>
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold capitalize text-slate-900">
                    {m.label}
                    {key === currentKey && <span className="ml-2 text-xs font-medium text-blue-700">ce mois-ci</span>}
                  </span>
                  <span className="text-lg font-bold tabular-nums">{formatEuro(m.totalGross)}</span>
                </div>
                <div className="text-xs text-slate-500">
                  Base {formatEuro(m.baseGross)}
                  {m.contractDays < m.daysInMonth && ` (prorata ${m.contractDays}/${m.daysInMonth} j)`}
                  {m.overtimeMinutes > 0 && ` · HS ${formatDuration(m.overtimeMinutes)} = ${formatEuro(m.overtimeGross)}`}
                  {m.effectiveRates.length > 1 && ' · revalorisation dans le mois'}
                </div>
                {m.missingRate && <div className="text-xs font-medium text-red-700">Aucun taux défini pour une partie du mois.</div>}
              </li>
            );
          })}
        </ul>
        <div className="mt-2 flex items-baseline justify-between border-t border-slate-200 pt-3">
          <span className="font-semibold text-slate-700">Total sur le contrat</span>
          <span className="text-lg font-bold tabular-nums">{formatEuro(total)}</span>
        </div>
      </Card>

      <Card title="Méthode">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-600">
          <li>
            Salaire de base mensualisé : {settings.weeklyHours} h × 52 / 12 = {refHours.toFixed(2).replace('.', ',')} h × taux × {settings.salaryPercent} %.
          </li>
          <li>
            Mois incomplets (du {formatDateFr(settings.contractStart)} au {formatDateFr(settings.contractEnd)}) proratisés selon les jours
            calendaires couverts. Votre employeur peut utiliser une autre méthode.
          </li>
          <li>Changement de taux en cours de mois : chaque jour utilise le taux en vigueur à sa date.</li>
          <li>Heures supplémentaires : rattachées au mois du dimanche qui termine la semaine.</li>
          <li>Non pris en compte : absences, primes, indemnités (transport, repas), majorations de nuit ou dimanche, cotisations.</li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">Estimation indicative, sans valeur contractuelle. Seule la fiche de paie fait foi.</p>
      </Card>
    </Page>
  );
}
