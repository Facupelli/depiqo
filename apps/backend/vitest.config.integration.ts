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
    include: ['{src,test}/**/*.integration-spec.ts'],
    exclude: ['**/*.e2e-spec.ts', '**/dist/**', '**/node_modules/**'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Integration files intentionally share one disposable database and isolate through unique fixture data.
    // Keep file scheduling serial while allowing tests to exercise concurrency explicitly inside a file.
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
  },
});
