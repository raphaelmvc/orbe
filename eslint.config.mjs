import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '.superpowers/**',
      '**/coverage/**',
      '**/dist/**',
      '**/node_modules/**',
      '**/target/**',
    ],
  },
  eslint.configs.recommended,
  {
    files: ['**/*.cjs'],
    languageOptions: {
      globals: {
        module: 'readonly',
      },
      sourceType: 'commonjs',
    },
  },
  ...tseslint.configs.recommended,
  {
    files: ['packages/domain/src/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'navigator',
        'location',
        'localStorage',
        'sessionStorage',
        'indexedDB',
      ],
    },
  },
);
