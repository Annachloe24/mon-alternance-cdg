import { useState } from 'react';
import { TrashIcon } from '../components/icons';
import { Button, Card, Field, Notice, NumberInput, Page, Toggle, inputClass } from '../components/ui';
import { DEFAULT_SETTINGS } from '../lib/defaults';
import { isValidIsoDate } from '../lib/dates';
import type { Settings as SettingsType } from '../lib/types';
import { useStore } from '../store';

function validateSettings(s: SettingsType): string[] {
  const errors: string[] = [];
  if (!isValidIsoDate(s.contractStart) || !isValidIsoDate(s.contractEnd)) errors.push('Dates du contrat invalides.');
  else if (s.contractEnd < s.contractStart) errors.push('La fin du contrat doit être après le début.');
  if (s.weeklyHours <= 0 || s.weeklyHours > 48) errors.push('La durée hebdomadaire doit être comprise entre 1 et 48 h.');
  if (s.salaryPercent <= 0 || s.salaryPercent > 200) errors.push('Le pourcentage de rémunération doit être compris entre 1 et 200 %.');
  if (s.practicalDaysTarget < 1) errors.push("L'objectif de journées doit être d'au moins 1.");
  if (!s.hourlyRates.length) errors.push('Ajoutez au moins un taux horaire.');
  s.hourlyRates.forEach((r, i) => {
    if (!isValidIsoDate(r.from)) errors.push(`Taux ${i + 1} : date d'effet invalide.`);
    if (!(r.rate > 0)) errors.push(`Taux ${i + 1} : montant invalide.`);
  });
  const dates = s.hourlyRates.map((r) => r.from);
  if (new Set(dates).size !== dates.length) errors.push("Deux taux horaires ont la même date d'effet.");
  return errors;
}

export function Settings() {
  const { data, updateSettings } = useStore();
  const [draft, setDraft] = useState<SettingsType>(() => structuredClone(data.settings));
  const [saved, setSaved] = useState(false);
  const errors = validateSettings(draft);
  const dirty = JSON.stringify(draft) !== JSON.stringify(data.settings);

  const set = (patch: Partial<SettingsType>) => {
    setSaved(false);
    setDraft((d) => ({ ...d, ...patch }));
  };
  const setOt = (patch: Partial<SettingsType['overtime']>) => set({ overtime: { ...draft.overtime, ...patch } });

  function save() {
    if (errors.length) return;
    updateSettings({ ...draft, hourlyRates: [...draft.hourlyRates].sort((a, b) => a.from.localeCompare(b.from)) });
    setSaved(true);
  }

  return (
    <Page title="Paramètres">
      <Card title="Contrat">
        <div className="space-y-3">
          <Field label="Entreprise">
            <input className={inputClass} value={draft.company} onChange={(e) => set({ company: e.target.value })} />
          </Field>
          <Field label="Lieu">
            <input className={inputClass} value={draft.location} onChange={(e) => set({ location: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Début">
              <input type="date" className={inputClass} value={draft.contractStart} onChange={(e) => set({ contractStart: e.target.value })} />
            </Field>
            <Field label="Fin">
              <input type="date" className={inputClass} value={draft.contractEnd} onChange={(e) => set({ contractEnd: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Durée hebdo (h)">
              <NumberInput value={draft.weeklyHours} onChange={(n) => set({ weeklyHours: n })} min={1} max={48} />
            </Field>
            <Field label="Objectif jours entreprise">
              <NumberInput value={draft.practicalDaysTarget} onChange={(n) => set({ practicalDaysTarget: n })} min={1} max={400} step="integer" />
            </Field>
          </div>
        </div>
      </Card>

      <Card title="Rémunération">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="% du taux de référence">
              <NumberInput value={draft.salaryPercent} onChange={(n) => set({ salaryPercent: n })} min={1} max={200} />
            </Field>
            <Field label="Tranche d'âge">
              <input className={inputClass} value={draft.ageBracket} onChange={(e) => set({ ageBracket: e.target.value })} />
            </Field>
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Taux horaires bruts et dates d'effet</span>
            <div className="space-y-2">
              {draft.hourlyRates.map((r, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <Field label={i === 0 ? "À partir du" : ''}>
                      <input
                        type="date"
                        className={inputClass}
                        value={r.from}
                        onChange={(e) => set({ hourlyRates: draft.hourlyRates.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)) })}
                      />
                    </Field>
                  </div>
                  <div className="w-28">
                    <Field label={i === 0 ? '€ / heure' : ''}>
                      <NumberInput
                        value={r.rate}
                        min={0.01}
                        onChange={(n) => set({ hourlyRates: draft.hourlyRates.map((x, j) => (j === i ? { ...x, rate: n } : x)) })}
                      />
                    </Field>
                  </div>
                  <button
                    type="button"
                    disabled={draft.hourlyRates.length === 1}
                    onClick={() => set({ hourlyRates: draft.hourlyRates.filter((_, j) => j !== i) })}
                    className="grid h-12 w-10 place-items-center rounded-lg text-red-600 active:bg-red-50 disabled:text-slate-300"
                    aria-label={`Supprimer le taux ${i + 1}`}
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
            <Button
              variant="secondary"
              className="mt-2 w-full"
              onClick={() => {
                const last = [...draft.hourlyRates].sort((a, b) => a.from.localeCompare(b.from)).at(-1);
                const nextYear = last ? `${Number(last.from.slice(0, 4)) + 1}-01-01` : draft.contractStart;
                set({ hourlyRates: [...draft.hourlyRates, { from: nextYear, rate: last?.rate ?? 12 }] });
              }}
            >
              + Ajouter une revalorisation
            </Button>
          </div>
          <Toggle
            checked={draft.ratesConfirmed}
            onChange={(v) => set({ ratesConfirmed: v })}
            label="J'ai vérifié ces taux"
            description="Masque l'avertissement « taux à vérifier » (fiche de paie, service-public.fr)."
          />
        </div>
      </Card>

      <Card title="Heures supplémentaires">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Seuil hebdo (h)">
              <NumberInput value={draft.overtime.weeklyThreshold} onChange={(n) => setOt({ weeklyThreshold: n })} min={0} max={60} />
            </Field>
            <Field label="Heures au 1er taux">
              <NumberInput value={draft.overtime.tier1Hours} onChange={(n) => setOt({ tier1Hours: n })} min={0} max={40} />
            </Field>
            <Field label="1er taux (%)">
              <NumberInput value={draft.overtime.tier1RatePercent} onChange={(n) => setOt({ tier1RatePercent: n })} min={0} max={200} />
            </Field>
            <Field label="2nd taux (%)">
              <NumberInput value={draft.overtime.tier2RatePercent} onChange={(n) => setOt({ tier2RatePercent: n })} min={0} max={200} />
            </Field>
          </div>
          <Toggle
            checked={draft.overtime.includeCfa}
            onChange={(v) => setOt({ includeCfa: v })}
            label="Compter les heures CFA dans la semaine"
            description="Le temps de formation au CFA est en principe du temps de travail : à confirmer avec votre employeur."
          />
          <Toggle
            checked={draft.overtime.rulesConfirmed}
            onChange={(v) => setOt({ rulesConfirmed: v })}
            label="Règles confirmées par mon employeur"
            description="Masque l'avertissement sur les heures supplémentaires."
          />
        </div>
      </Card>

      {errors.map((e) => (
        <Notice key={e} tone="error">
          {e}
        </Notice>
      ))}
      {saved && !dirty && <Notice tone="success">Paramètres enregistrés sur cet appareil.</Notice>}

      <div className="space-y-3">
        <Button className="w-full" disabled={!!errors.length || !dirty} onClick={save}>
          Enregistrer les paramètres
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => {
            if (window.confirm('Revenir aux paramètres initiaux du contrat ? (les journées saisies sont conservées)')) set(structuredClone(DEFAULT_SETTINGS));
          }}
        >
          Rétablir les valeurs initiales
        </Button>
      </div>
    </Page>
  );
}
