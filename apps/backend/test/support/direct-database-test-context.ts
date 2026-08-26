import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../../src/generated/prisma/client';

export async function createDirectDatabaseTestContext(): Promise<DirectDatabaseTestContext> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required for database integration tests.');

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  await prisma.$connect();

  return {
    prisma,
    close: () => prisma.$disconnect(),
  };
}

export type DirectDatabaseTestContext = {
  prisma: PrismaClient;
  close(): Promise<void>;
};
