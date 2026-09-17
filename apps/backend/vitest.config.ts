import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

const fromRoot = (path: string) => resolve(__dirname, path);

export default defineConfig({
  resolve: {
    alias: [
      { find: '@generated/prisma', replacement: fromRoot('./src/generated/prisma/client.ts') },
      { find: /^src\/(.*)$/, replacement: `${fromRoot('./src')}/$1` },
      { find: 'jose', replacement: fromRoot('./test/support/mocks/jose.ts') },
      { find: '@react-pdf/renderer', replacement: fromRoot('./test/support/mocks/react-pdf-renderer.ts') },
    ],
  },
  test: {
    environment: 'node',
    include: ['{src,test}/**/*.spec.ts'],
    exclude: ['**/*.integration-spec.ts', '**/*.e2e-spec.ts', '**/dist/**', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/generated/**'],
    },
  },
});
