import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';

import { AppShell } from './AppShell';
import type { SessionSummary, SyncVisualState } from './AppShell';

const baseSession: SessionSummary = {
  displayName: 'Ana Beatriz',
  username: 'ana.beatriz',
  email: 'ana@example.com',
  role: 'user',
};

function renderShell(session: SessionSummary = baseSession, syncState: SyncVisualState = 'offline') {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AppShell session={session} syncState={syncState}>
        <p>Conteúdo da página</p>
      </AppShell>
    </MemoryRouter>,
  );
}

test('renders the brand and a highlighted Adicionar control', () => {
  renderShell();

  expect(screen.getByText('Orbe')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Adicionar' })).toBeInTheDocument();
});

test('groups navigation under Principal, Planejamento, and Análise', () => {
  renderShell();

  expect(screen.getByRole('heading', { name: 'Principal' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Planejamento' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Análise' })).toBeInTheDocument();
});

test('exposes a navigation link for every route', () => {
  renderShell();

  const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
  const expectedLinks = [
    'Início',
    'Transações',
    'Contas',
    'Cartões',
    'Recorrências',
    'Orçamentos',
    'Relatórios',
  ];

  for (const name of expectedLinks) {
    expect(within(nav).getByRole('link', { name })).toBeInTheDocument();
  }
});

test('shows the footer avatar, user name, sync state, and expansion control', () => {
  renderShell(baseSession, 'syncing');

  expect(screen.getByRole('button', { name: /Ana Beatriz/ })).toBeInTheDocument();
  expect(screen.getByText('Ana Beatriz')).toBeInTheDocument();
  expect(screen.getByText('Sincronizando')).toBeInTheDocument();
});

describe.each([
  ['synced', 'Sincronizado'],
  ['offline', 'Aguardando internet'],
  ['syncing', 'Sincronizando'],
  ['conflict', 'Conflito'],
  ['error', 'Erro ao sincronizar'],
] as const)('sync state %s', (syncState, label) => {
  test(`renders the label "${label}"`, () => {
    renderShell(baseSession, syncState);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

test('opens the user menu with the expected entries for a regular user', async () => {
  const user = userEvent.setup();
  renderShell(baseSession, 'offline');

  await user.click(screen.getByRole('button', { name: /Abrir menu de Ana Beatriz/ }));

  expect(screen.getByRole('menuitem', { name: 'Meu perfil' })).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: 'Lixeira' })).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: 'Configurações' })).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: 'Bloquear agora' })).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: 'Sair' })).toBeInTheDocument();
  expect(screen.getByText('ana.beatriz')).toBeInTheDocument();
  expect(screen.getByText('ana@example.com')).toBeInTheDocument();
  expect(screen.queryByRole('menuitem', { name: 'Administração' })).not.toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('shows Administração only for admin sessions', async () => {
  const user = userEvent.setup();
  renderShell({ ...baseSession, role: 'admin' }, 'offline');

  await user.click(screen.getByRole('button', { name: /Abrir menu de Ana Beatriz/ }));

  expect(screen.getByRole('menuitem', { name: 'Administração' })).toBeInTheDocument();
});

test('selecting Sair does not open a confirmation modal', async () => {
  const user = userEvent.setup();
  renderShell(baseSession, 'offline');

  await user.click(screen.getByRole('button', { name: /Abrir menu de Ana Beatriz/ }));
  await user.click(screen.getByRole('menuitem', { name: 'Sair' }));

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('collapsing the sidebar preserves icons, accessible names, Adicionar, avatar, and sync state', async () => {
  const user = userEvent.setup();
  renderShell(baseSession, 'synced');

  await user.click(screen.getByRole('button', { name: 'Recolher navegação' }));

  expect(screen.getByRole('button', { name: 'Expandir navegação' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Início' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Transações' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Adicionar' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Abrir menu de Ana Beatriz/ })).toBeInTheDocument();
  expect(screen.getByText('Sincronizado')).toBeInTheDocument();
});

test('shows a tooltip for a navigation item once the sidebar is collapsed', async () => {
  const user = userEvent.setup();
  renderShell(baseSession, 'offline');

  await user.click(screen.getByRole('button', { name: 'Recolher navegação' }));
  await user.hover(screen.getByRole('link', { name: 'Início' }));

  expect(await screen.findByRole('tooltip', { name: 'Início' })).toBeInTheDocument();
});

test('provides a skip link that targets the main content region', () => {
  renderShell();

  const skipLink = screen.getByRole('link', { name: 'Pular para o conteúdo principal' });
  expect(skipLink).toHaveAttribute('href', '#main-content');
  expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  expect(screen.getByText('Conteúdo da página')).toBeInTheDocument();
});
