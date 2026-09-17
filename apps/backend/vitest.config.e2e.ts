import { resolve } from 'node:path';

import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

const fromRoot = (path: string) => resolve(__dirname, path);

export default defineConfig({
  plugins: [swc.vite()],
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
    include: ['{src,test}/**/*.e2e-spec.ts'],
    exclude: ['**/dist/**', '**/node_modules/**'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // E2E files intentionally share one disposable database and isolate through unique fixture data.
    // Keep application startup and file scheduling serial while workflows may exercise concurrency inside a file.
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
  },
});
