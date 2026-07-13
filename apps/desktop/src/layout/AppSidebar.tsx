import type { ReactNode } from 'react';
import { useState } from 'react';

import * as Tooltip from '@radix-ui/react-tooltip';
import {
  AlertTriangle,
  Check,
  ChevronsLeft,
  ChevronsRight,
  CloudOff,
  Plus,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { NAV_GROUPS, type IconComponent, type NavItemConfig } from '../app/routes';
import type { SessionSummary, SyncVisualState } from './AppShell';
import { UserMenu } from './UserMenu';
import styles from './app-shell.module.css';

const SYNC_LABELS: Record<SyncVisualState, string> = {
  synced: 'Sincronizado',
  offline: 'Aguardando internet',
  syncing: 'Sincronizando',
  conflict: 'Conflito',
  error: 'Erro ao sincronizar',
};

const SYNC_ICONS: Record<SyncVisualState, IconComponent> = {
  synced: Check,
  offline: CloudOff,
  syncing: RefreshCw,
  conflict: AlertTriangle,
  error: XCircle,
};

function getInitials(displayName: string): string {
  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase());

  return initials.join('') || '?';
}

interface CollapsibleTooltipProps {
  readonly label: string;
  readonly collapsed: boolean;
  readonly children: ReactNode;
}

function CollapsibleTooltip({ label, collapsed, children }: CollapsibleTooltipProps) {
  if (!collapsed) {
    return <>{children}</>;
  }

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className={styles.tooltipSurface} side="right" sideOffset={8}>
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

interface NavItemProps {
  readonly item: NavItemConfig;
  readonly collapsed: boolean;
}

function NavItem({ item, collapsed }: NavItemProps) {
  const Icon = item.icon;

  return (
    <CollapsibleTooltip label={item.label} collapsed={collapsed}>
      <NavLink
        to={item.path}
        end={item.path === '/'}
        className={({ isActive }) =>
          isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
        }
      >
        <Icon aria-hidden="true" size={18} />
        <span className={styles.navLabel}>{item.label}</span>
      </NavLink>
    </CollapsibleTooltip>
  );
}

export interface AppSidebarProps {
  readonly session: SessionSummary;
  readonly syncState: SyncVisualState;
}

export function AppSidebar({ session, syncState }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const SyncIcon = SYNC_ICONS[syncState];

  return (
    <Tooltip.Provider delayDuration={0}>
      <aside
        className={collapsed ? `${styles.sidebar} ${styles.sidebarCollapsed}` : styles.sidebar}
        aria-label="Barra lateral"
      >
        <div className={styles.sidebarHeader}>
          <span className={styles.brandMark} aria-hidden="true" />
          {!collapsed && <span className={styles.brandName}>Orbe</span>}
          <button
            type="button"
            className={styles.collapseToggle}
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expandir navegação' : 'Recolher navegação'}
          >
            {collapsed ? (
              <ChevronsRight aria-hidden="true" size={16} />
            ) : (
              <ChevronsLeft aria-hidden="true" size={16} />
            )}
          </button>
        </div>

        <CollapsibleTooltip label="Adicionar" collapsed={collapsed}>
          <button type="button" className={styles.addButton}>
            <Plus aria-hidden="true" size={18} />
            <span className={styles.navLabel}>Adicionar</span>
          </button>
        </CollapsibleTooltip>

        <nav className={styles.navGroups} aria-label="Navegação principal">
          {NAV_GROUPS.map((group) => (
            <div className={styles.navGroup} key={group.label}>
              <h2 className={styles.navGroupLabel}>{group.label}</h2>
              <ul className={styles.navList}>
                {group.items.map((item) => (
                  <li key={item.path}>
                    <NavItem item={item} collapsed={collapsed} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <UserMenu session={session}>
            <span className={styles.avatar} aria-hidden="true">
              {getInitials(session.displayName)}
            </span>
            <span className={styles.footerText}>
              <span className={styles.userName}>{session.displayName}</span>
              <span className={styles.syncState}>
                <SyncIcon aria-hidden="true" size={13} />
                {SYNC_LABELS[syncState]}
              </span>
            </span>
          </UserMenu>
        </div>
      </aside>
    </Tooltip.Provider>
  );
}
