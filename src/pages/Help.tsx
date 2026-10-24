import type { ReactNode } from 'react';
import { Card, LocalDataNotice, Page } from '../components/ui';

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-800 text-sm font-bold text-white">{n}</span>
      <span className="pt-0.5 text-[15px] leading-snug text-slate-700">{children}</span>
    </li>
  );
}

export function Help() {
  const standalone =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

  return (
    <Page title="Aide">
      {standalone ? (
        <Card>
          <p className="text-emerald-700">✓ L'application est installée sur l'écran d'accueil.</p>
        </Card>
      ) : (
        <Card title="Installer sur iPhone">
          <ol className="space-y-3">
            <Step n={1}>
              Ouvrez l'adresse de l'application dans <strong>Safari</strong> (connexion sécurisée https).
            </Step>
            <Step n={2}>
              Touchez le bouton <strong>Partager</strong> (carré avec une flèche vers le haut), en bas de l'écran ou dans le menu « ••• ».
            </Step>
            <Step n={3}>
              Faites défiler et choisissez <strong>« Sur l'écran d'accueil »</strong>.
            </Step>
            <Step n={4}>
              Vérifiez le nom « Alternance CDG », activez « Ouvrir comme app web » si proposé, puis touchez <strong>Ajouter</strong>.
            </Step>
            <Step n={5}>Lancez ensuite l'application depuis son icône : elle s'ouvre en plein écran et fonctionne hors connexion.</Step>
          </ol>
        </Card>
      )}

      <Card title="Où sont mes données ?">
        <div className="space-y-2 text-[15px] leading-snug text-slate-700">
          <p>
            Tout est enregistré <strong>uniquement dans la mémoire de cet appareil</strong>, dans le navigateur. Rien n'est envoyé sur
            internet et il n'y a <strong>aucune synchronisation</strong> avec un autre iPhone, un ordinateur ou iCloud.
          </p>
          <p>Les données peuvent être perdues si vous :</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>supprimez l'icône de l'application de l'écran d'accueil ;</li>
            <li>effacez l'historique et les données de sites dans Réglages › Safari ;</li>
            <li>changez ou réinitialisez votre iPhone.</li>
          </ul>
          <p>
            Sans installation sur l'écran d'accueil, Safari peut aussi effacer les données d'un site non consulté pendant plusieurs
            jours. Installez l'application et <a href="#/donnees" className="font-semibold text-blue-800 underline">exportez une sauvegarde</a>{' '}
            régulièrement (par exemple chaque semaine) dans Fichiers ou iCloud Drive.
          </p>
          <p>
            Attention : l'application installée et Safari ont des espaces de stockage séparés. Pour transférer vos données de l'un à
            l'autre, ou vers un nouvel iPhone, utilisez Exporter puis Restaurer une sauvegarde.
          </p>
        </div>
      </Card>

      <Card title="Comment sont faits les calculs ?">
        <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-snug text-slate-700">
          <li>Temps de travail d'une journée = somme des plages horaires − pauses.</li>
          <li>Une plage dont l'heure de fin est plus tôt que l'heure de début passe minuit ; elle reste comptée sur la date de début.</li>
          <li>Une seule fiche par date : pour une journée coupée, ajoutez plusieurs plages dans la même fiche.</li>
          <li>« Plusieurs jours » crée la même journée sur une période ; les dates déjà saisies sont ignorées, jamais écrasées.</li>
          <li>Le planning PDF de l'école est seulement affiché : l'application ne lit pas son contenu.</li>
          <li>Le compteur de formation pratique compte les journées « Entreprise » avec des heures saisies.</li>
          <li>Les semaines vont du lundi au dimanche (numérotation ISO).</li>
          <li>Heures supplémentaires et salaire sont des estimations, à vérifier avec l'employeur et la fiche de paie.</li>
        </ul>
      </Card>

      <LocalDataNotice />
      <p className="px-1 text-center text-xs text-slate-400">Mon Alternance CDG · version {__APP_VERSION__} · application gratuite, sans compte ni publicité</p>
    </Page>
  );
}
