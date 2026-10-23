# Mon Alternance CDG

Application web installable (PWA), en français, pour suivre un contrat en alternance chez **CITY ONE ACCUEIL PASSAGER**
à l'aéroport Paris-Charles-de-Gaulle (du 23/10/2026 au 31/08/2027, 35 h/semaine, 100 % du SMIC, 26 ans ou plus).

- Tableau de bord : progression du contrat, compteur des **45 journées de formation pratique en entreprise**, heures de la semaine, salaire estimé du mois.
- Saisie des journées **Entreprise** et **CFA** (séparées), avec plusieurs plages horaires, pauses et passages après minuit.
- Récapitulatif hebdomadaire, **heures supplémentaires estimées** (paramètres modifiables, avertissement tant que les règles ne sont pas confirmées).
- **Salaire brut estimé** par mois, avec taux horaires et dates d'effet modifiables.
- Historique avec modification et suppression.
- Export **CSV**, **sauvegarde / restauration** JSON.
- Écran d'aide : installation sur iPhone, emplacement des données, méthode de calcul.

**Aucun coût récurrent** : pas de serveur, pas de base de données distante, pas de compte, pas d'API payante.
Toutes les données sont stockées dans le `localStorage` **de l'appareil uniquement** ; elles ne sont synchronisées avec rien.

## Prérequis

- [Node.js](https://nodejs.org) LTS (version 20 ou plus ; testé avec 24).

> Sur ce poste, Node.js n'était pas installé : une version portable a été placée dans `.tools/` (ignorée par git).
> Pour l'utiliser dans PowerShell :
> `$env:Path = "$PWD\.tools\node-v24.22.1-win-x64;" + $env:Path`

## Commandes

```bash
npm install          # installer les dépendances
npm run dev          # serveur de développement (http://localhost:5173)
npm test             # tests automatisés (Vitest)
npm run build        # vérification TypeScript + build de production dans dist/
npm run preview      # servir le build localement (http://localhost:4173)
npm run icons        # régénérer les icônes PNG (script Node sans dépendance)
```

Pour tester sur l'iPhone pendant le développement (même réseau Wi-Fi) : `npm run dev -- --host`, puis ouvrir
l'adresse « Network » affichée. L'installation complète (service worker) nécessite toutefois HTTPS : utilisez la version publiée.

## Publication gratuite en HTTPS

L'application est un site statique (dossier `dist/`). Elle peut être hébergée gratuitement, sans carte bancaire :

### Option A — GitHub Pages (automatisée)

1. Créer un compte gratuit sur https://github.com/signup, puis un dépôt **public** nommé `mon-alternance-cdg`
   (https://github.com/new, sans README). GitHub Pages est gratuit pour les dépôts publics ; le dépôt ne contient aucune donnée personnelle.
2. Envoyer le code :
   - **sans Git** : sur la page du dépôt, « uploading an existing file », puis glisser-déposer **le contenu** du dossier
     `envoi-github/` (y compris le dossier `.github`), et valider avec « Commit changes » ;
   - **avec Git** : `git push` de ce projet sur la branche `main`.
3. Dans le dépôt : **Settings › Pages › Build and deployment › Source : GitHub Actions**, puis onglet **Actions** ›
   relancer « Publier sur GitHub Pages » si le premier passage a échoué avant l'activation.
3. Le workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml) lance les tests, construit avec le bon
   sous-chemin (`BASE_PATH=/<nom-du-dépôt>/`) et publie sur `https://<utilisateur>.github.io/<nom-du-dépôt>/`.

### Option B — Cloudflare Pages ou Netlify (offres gratuites)

- Commande de build : `npm run build` — dossier publié : `dist`.
- Ou, sans dépôt : `npm run build` puis glisser-déposer le dossier `dist` sur https://app.netlify.com/drop.

Le code source ne contient aucune donnée personnelle : les journées restent sur l'iPhone.

## Installation sur iPhone

1. Ouvrir l'adresse HTTPS dans **Safari**.
2. Bouton **Partager** › **Sur l'écran d'accueil** › **Ajouter**.
3. Lancer l'app depuis l'icône (plein écran, fonctionne hors connexion).

Important :
- L'app installée et Safari ont des stockages séparés. Pour changer d'appareil ou de navigateur : **Exporter une sauvegarde**, puis **Restaurer**.
- Supprimer l'icône de l'écran d'accueil supprime les données. Exporter une sauvegarde régulièrement (Fichiers, iCloud Drive…).

## Règles de calcul

| Élément | Règle appliquée |
|---|---|
| Temps de travail | Somme des plages − pauses (en minutes). |
| Après minuit | Une fin antérieure au début = lendemain. Les heures sont rattachées à la date de début. |
| Plages multiples | Saisies dans l'ordre ; une plage commençant avant la fin de la précédente est placée le lendemain. |
| Doublons | Une seule fiche par date (refus), et refus des chevauchements avec la veille / le lendemain. |
| Contrôles | Date réelle, heures valides, début ≠ fin, pause ≥ 0 et < présence, total ≤ 24 h ; avertissements : > 10 h/jour, > 6 h sans 20 min de pause, amplitude > 13 h, hors contrat, > 48 h/semaine. |
| Formation pratique | Nombre de journées « Entreprise » avec du temps de travail (objectif 45, modifiable). |
| Semaine | Lundi → dimanche, numéro ISO. CFA inclus dans le total (paramétrable). |
| Heures sup. | Au-delà de 35 h : +25 % pour les 8 premières, +50 % ensuite (paramétrable). **Estimation, à confirmer** (convention collective, accord d'entreprise). |
| Salaire de base | 35 h × 52 / 12 = 151,67 h × taux horaire × 100 %, proratisé par jour calendaire pour les mois incomplets et en cas de revalorisation en cours de mois. |
| Salaire HS | Heures sup. de chaque semaine × taux × (1 + majoration), rattachées au mois du dimanche. |

Le taux par défaut est le SMIC horaire brut au 01/01/2026 (12,02 €) : **à vérifier** et à compléter à chaque revalorisation
dans Paramètres. Les montants sont bruts et indicatifs (absences, primes, indemnités, majorations de nuit/dimanche et cotisations non gérées).

## Structure

```
src/
  lib/            logique métier pure, testée (dates, horaires, validation, semaines, salaire, CSV, sauvegarde, stockage)
  pages/          écrans (Accueil, Saisie, Historique, Heures, Salaire, Paramètres, Données, Aide)
  components/     composants d'interface (navigation basse, cartes, champs…)
  store.tsx       état de l'application + enregistrement automatique dans localStorage
scripts/generate-icons.mjs   génération des icônes PNG
public/                      icônes, favicon
```

Dépendances d'exécution : `react`, `react-dom` uniquement. Outils de développement : Vite, TypeScript, Tailwind CSS, vite-plugin-pwa, Vitest.
