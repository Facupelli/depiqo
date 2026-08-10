import { unitConfig } from '@repo/jest-config';
import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  ...unitConfig,
  rootDir: '.',
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  moduleNameMapper: {
    ...unitConfig.moduleNameMapper,
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
