import { defineConfig } from 'vitest/config';

import { passWithNoTests, workspaceProjects } from './vitest.workspace';

export default defineConfig({
  test: {
    passWithNoTests,
    projects: workspaceProjects,
  },
});
