import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const host = loadEnv(mode, '.', '').TAURI_DEV_HOST;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@orbe/contracts': fileURLToPath(
          new URL('../../packages/contracts/src/index.ts', import.meta.url),
        ),
        '@orbe/domain': fileURLToPath(
          new URL('../../packages/domain/src/index.ts', import.meta.url),
        ),
      },
    },
    clearScreen: false,
    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      hmr: host
        ? {
            protocol: 'ws',
            host,
            port: 1421,
          }
        : undefined,
      watch: {
        ignored: ['**/src-tauri/**'],
      },
    },
  };
});
