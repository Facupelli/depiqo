import { afterAll, beforeAll } from 'vitest';

type Closable = { close(): Promise<void> };

export function useIntegrationTestContext<T extends Closable>(createContext: () => Promise<T>): void {
  let context: T | undefined;

  beforeAll(async () => {
    context = await createContext();
  });

  afterAll(async () => {
    await context?.close();
  });
}
