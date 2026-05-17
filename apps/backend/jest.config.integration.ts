import { integrationConfig } from '@repo/jest-config';
import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  ...integrationConfig,
  rootDir: '.',
  globalSetup: '<rootDir>/test/setup/global-setup.ts',
  globalTeardown: '<rootDir>/test/setup/global-teardown.ts',
  moduleNameMapper: {
    ...integrationConfig.moduleNameMapper,
    '^@generated/prisma$': '<rootDir>/src/generated/prisma',
    '^jose$': '<rootDir>/src/__mocks__/jose.ts',
  },
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        diagnostics: false,
      },
    ],
  },
};

export default config;
