import type { ReactNode } from 'react';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Lock, LogOut, Settings, ShieldCheck, Trash2, UserRound } from 'lucide-react';

import type { SessionSummary } from './AppShell';
import styles from './app-shell.module.css';

export interface UserMenuProps {
  readonly session: SessionSummary;
  readonly children: ReactNode;
}

export function UserMenu({ session, children }: UserMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={styles.footerTrigger}
          aria-label={`Abrir menu de ${session.displayName}`}
        >
          {children}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={styles.popoverSurface}
          align="start"
          sideOffset={8}
        >
          <DropdownMenu.Label className={styles.userMenuSummary}>
            <span className={styles.userMenuUsername}>{session.username}</span>
            <span className={styles.userMenuEmail}>{session.email}</span>
          </DropdownMenu.Label>

          <DropdownMenu.Separator className={styles.userMenuSeparator} />

          <DropdownMenu.Item className={styles.userMenuItem}>
            <UserRound aria-hidden="true" size={16} />
            Meu perfil
          </DropdownMenu.Item>
          <DropdownMenu.Item className={styles.userMenuItem}>
            <Trash2 aria-hidden="true" size={16} />
            Lixeira
          </DropdownMenu.Item>
          <DropdownMenu.Item className={styles.userMenuItem}>
            <Settings aria-hidden="true" size={16} />
            Configurações
          </DropdownMenu.Item>
          {session.role === 'admin' && (
            <DropdownMenu.Item className={styles.userMenuItem}>
              <ShieldCheck aria-hidden="true" size={16} />
              Administração
            </DropdownMenu.Item>
          )}

          <DropdownMenu.Separator className={styles.userMenuSeparator} />

          <DropdownMenu.Item className={styles.userMenuItem}>
            <Lock aria-hidden="true" size={16} />
            Bloquear agora
          </DropdownMenu.Item>
          <DropdownMenu.Item className={styles.userMenuItem}>
            <LogOut aria-hidden="true" size={16} />
            Sair
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
