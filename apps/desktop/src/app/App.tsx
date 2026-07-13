import { BrowserRouter } from 'react-router-dom';

import { AppShell, type SessionSummary, type SyncVisualState } from '../layout/AppShell';
import type { AppDependencies } from './composition';
import { AppRoutes } from './routes';

interface AppProps {
  readonly dependencies: AppDependencies;
}

const defaultSession: SessionSummary = {
  displayName: 'Usuário Orbe',
  username: 'usuario.local',
  email: 'usuario@orbe.local',
  role: 'user',
};

const defaultSyncState: SyncVisualState = 'offline';

export default function App({ dependencies }: AppProps) {
  void dependencies;

  return (
    <BrowserRouter>
      <AppShell session={defaultSession} syncState={defaultSyncState}>
        <AppRoutes />
      </AppShell>
    </BrowserRouter>
  );
}
