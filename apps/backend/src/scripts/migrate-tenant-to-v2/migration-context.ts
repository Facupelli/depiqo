import { PrismaClient } from "src/generated/prisma/client";

export type TenantV2MigrationOptions = {
  legacyTenantId: string;
  dryRun: boolean;
};

export type TenantV2MigrationContext = {
  prisma: PrismaClient;
  legacyTenantId: string;
  v2TenantId: string;
  dryRun: boolean;
  now: Date;
  log: (message: string, data?: unknown) => void;
};
