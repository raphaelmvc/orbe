import type { ReactNode } from 'react';

import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import styles from './app-shell.module.css';

export interface SessionSummary {
  readonly displayName: string;
  readonly username: string;
  readonly email: string;
  readonly role: 'user' | 'admin';
}

export type SyncVisualState = 'synced' | 'offline' | 'syncing' | 'conflict' | 'error';

export interface AppShellProps {
  readonly session: SessionSummary;
  readonly syncState: SyncVisualState;
  readonly children: ReactNode;
}

export function AppShell({ session, syncState, children }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main-content">
        Pular para o conteúdo principal
      </a>

      <AppSidebar session={session} syncState={syncState} />

      <div className={styles.contentColumn}>
        <TopBar />
        <main id="main-content" className={styles.main} tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
