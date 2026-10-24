import { useEffect } from 'react';
import { BottomNav } from './components/BottomNav';
import { Notice } from './components/ui';
import { requestPersistentStorage } from './lib/storage';
import { Dashboard } from './pages/Dashboard';
import { DataPage } from './pages/DataPage';
import { EntryForm } from './pages/EntryForm';
import { Help } from './pages/Help';
import { History } from './pages/History';
import { More } from './pages/More';
import { Period } from './pages/Period';
import { Planning } from './pages/Planning';
import { Salary } from './pages/Salary';
import { Settings } from './pages/Settings';
import { Weeks } from './pages/Weeks';
import { useRoute } from './router';
import { useStore } from './store';

function Screen({ route }: { route: string }) {
  const [path, query = ''] = route.split('?');
  const edit = /^\/saisie\/(.+)$/.exec(path);
  // La clé force un formulaire neuf quand on passe d'une journée à une autre.
  if (edit) return <EntryForm key={edit[1]} id={decodeURIComponent(edit[1])} />;
  switch (path) {
    case '/saisie':
      return <EntryForm key={`new-${query}`} initialDate={new URLSearchParams(query).get('date') ?? undefined} />;
    case '/periode':
      return <Period />;
    case '/planning':
      return <Planning />;
    case '/historique':
      return <History />;
    case '/semaines':
      return <Weeks />;
    case '/salaire':
      return <Salary />;
    case '/plus':
      return <More />;
    case '/parametres':
      return <Settings />;
    case '/donnees':
      return <DataPage />;
    case '/aide':
      return <Help />;
    default:
      return <Dashboard />;
  }
}

export function App() {
  const route = useRoute();
  const { storageError } = useStore();

  useEffect(() => {
    void requestPersistentStorage();
  }, []);

  return (
    <div className="min-h-dvh pb-[calc(5rem+env(safe-area-inset-bottom))]">
      {storageError && (
        <div className="mx-auto max-w-xl px-4 pt-[max(env(safe-area-inset-top),0.75rem)]">
          <Notice tone="error">{storageError}</Notice>
        </div>
      )}
      <main>
        <Screen route={route} />
      </main>
      <BottomNav route={route} />
    </div>
  );
}
