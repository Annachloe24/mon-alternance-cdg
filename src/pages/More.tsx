import { EuroIcon, HelpIcon, SaveIcon, SettingsIcon } from '../components/icons';
import { LocalDataNotice, ListLink, Page } from '../components/ui';
import { formatEuro } from '../lib/salary';
import { useStore } from '../store';

export function More() {
  const { data } = useStore();
  const s = data.settings;
  return (
    <Page title="Plus">
      <div className="divide-y divide-slate-100 rounded-2xl bg-white px-3 shadow-sm ring-1 ring-slate-200/70">
        <ListLink href="#/salaire" icon={<EuroIcon />} label="Salaire estimé" hint={`${s.salaryPercent} % · ${formatEuro(s.hourlyRates.at(-1)?.rate ?? 0)} / h de référence`} />
        <ListLink href="#/parametres" icon={<SettingsIcon />} label="Paramètres" hint="Contrat, taux horaires, heures supplémentaires" />
        <ListLink href="#/donnees" icon={<SaveIcon />} label="Données et sauvegarde" hint="Export CSV, sauvegarde, restauration" />
        <ListLink href="#/aide" icon={<HelpIcon />} label="Aide et installation sur iPhone" />
      </div>
      <LocalDataNotice />
    </Page>
  );
}
