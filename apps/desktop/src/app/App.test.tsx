import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import App from './App';
import type { AppDependencies } from './composition';
import type { LocalFinanceStore } from './ports';

test('renders the initial Orbe shell without making a network request', () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected fetch'));
  const dependencies: AppDependencies = {
    localFinanceStore: {
      listAccounts: vi.fn<LocalFinanceStore['listAccounts']>().mockResolvedValue([]),
      applyMutation: vi.fn<LocalFinanceStore['applyMutation']>(),
    },
    clock: {
      now: vi.fn(() => new Date('2026-07-13T12:00:00-03:00')),
    },
    idGenerator: {
      next: vi.fn(() => '019f5a60-c01d-73b1-a118-d07d2fd75cba'),
    },
  };

  render(<App dependencies={dependencies} />);

  expect(screen.getByText('Orbe')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Configurar depois' })).toBeInTheDocument();
  expect(screen.getByRole('main')).toBeInTheDocument();
  expect(fetchSpy).not.toHaveBeenCalled();
});
