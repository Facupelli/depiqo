import { integrationConfig } from '@repo/jest-config';
import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  ...integrationConfig,
  rootDir: '.',
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  moduleNameMapper: {
    ...integrationConfig.moduleNameMapper,
    '^@generated/prisma$': '<rootDir>/src/generated/prisma',
    '^jose$': '<rootDir>/src/__mocks__/jose.ts',
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
