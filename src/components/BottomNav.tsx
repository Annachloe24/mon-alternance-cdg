import { ClockIcon, HomeIcon, ListIcon, MoreIcon, PlusIcon } from './icons';

const TABS = [
  { path: '/', label: 'Accueil', icon: HomeIcon, match: (r: string) => r === '/' },
  { path: '/historique', label: 'Historique', icon: ListIcon, match: (r: string) => r.startsWith('/historique') },
  { path: '/saisie', label: 'Saisir', icon: PlusIcon, match: (r: string) => r.startsWith('/saisie'), primary: true },
  { path: '/semaines', label: 'Heures', icon: ClockIcon, match: (r: string) => r.startsWith('/semaines') },
  {
    path: '/plus',
    label: 'Plus',
    icon: MoreIcon,
    match: (r: string) => ['/plus', '/salaire', '/parametres', '/donnees', '/aide'].some((p) => r.startsWith(p)),
  },
];

export function BottomNav({ route }: { route: string }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg"
      aria-label="Navigation principale"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {TABS.map(({ path, label, icon: Icon, match, primary }) => {
          const active = match(route);
          return (
            <li key={path}>
              <a
                href={`#${path}`}
                aria-current={active ? 'page' : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${active ? 'text-blue-800' : 'text-slate-500'}`}
              >
                {primary ? (
                  <span className={`grid h-10 w-10 place-items-center rounded-full text-white shadow-md ${active ? 'bg-blue-900' : 'bg-blue-800'}`}>
                    <Icon />
                  </span>
                ) : (
                  <Icon />
                )}
                <span>{label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
