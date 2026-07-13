import { useLocation } from 'react-router-dom';

import { NAV_GROUPS } from '../app/routes';
import styles from './app-shell.module.css';

function findCurrentSectionLabel(pathname: string): string {
  for (const group of NAV_GROUPS) {
    const match = group.items.find((item) => item.path === pathname);
    if (match) {
      return match.label;
    }
  }

  return 'Orbe';
}

export function TopBar() {
  const location = useLocation();
  const label = findCurrentSectionLabel(location.pathname);

  return (
    <header className={styles.topBar}>
      <p className={styles.topBarLabel}>{label}</p>
    </header>
  );
}
