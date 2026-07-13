import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'domain',
      passWithNoTests: true,
      root: './packages/domain',
    },
  },
  {
    test: {
      name: 'contracts',
      passWithNoTests: true,
      root: './packages/contracts',
    },
  },
]);
