const domainSource = '^packages/domain/src';

module.exports = {
  forbidden: [
    {
      name: 'domain-purity',
      severity: 'error',
      comment:
        'The domain must not depend on apps, contracts, UI/runtime frameworks, or databases.',
      from: {
        path: domainSource,
      },
      to: {
        path: [
          '^apps/',
          '^packages/contracts/',
          '(^|/)node_modules/(?:react(?:-dom)?|@tauri-apps/|fastify(?:/|$)|express(?:/|$)|@prisma/|prisma(?:/|$)|mysql2?(?:/|$)|sqlite3?(?:/|$)|better-sqlite3(?:/|$)|@libsql/)',
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
