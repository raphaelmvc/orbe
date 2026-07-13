const domainSource = '^packages/domain/src';

module.exports = {
  forbidden: [
    {
      name: 'domain-purity',
      severity: 'error',
      comment:
        'The domain must not depend on apps, contracts, UI/runtime frameworks, databases, or browser globals.',
      from: {
        path: domainSource,
      },
      to: {
        path: [
          '^apps/',
          '^packages/contracts/',
          '(^|/)node_modules/(?:react(?:-dom)?|@tauri-apps/|@prisma/|prisma(?:/|$)|mysql2?(?:/|$)|sqlite3?(?:/|$)|better-sqlite3(?:/|$)|@libsql/)',
          '^(?:window|document|navigator|location|localStorage|sessionStorage|indexedDB)$',
        ].join('|'),
      },
    },
    {
      name: 'domain-no-node-builtins',
      severity: 'error',
      comment: 'The domain must remain independent of Node.js APIs.',
      from: {
        path: domainSource,
      },
      to: {
        dependencyTypes: ['core'],
      },
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: {
        circular: true,
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
  },
};
