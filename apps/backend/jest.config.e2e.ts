import { e2eConfig } from '@repo/jest-config';
import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  ...e2eConfig,
  rootDir: '.',
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  moduleNameMapper: {
    ...e2eConfig.moduleNameMapper,
    '^@generated/prisma$': '<rootDir>/src/generated/prisma',
    '^jose$': '<rootDir>/test/support/mocks/jose.ts',
    '^@react-pdf/renderer$': '<rootDir>/test/support/mocks/react-pdf-renderer.ts',
  },
  transform: {
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        diagnostics: false,
      },
    ],
  },
};

export default config;
