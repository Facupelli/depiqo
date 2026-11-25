import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';

import { Env } from 'src/config/env.schema';
import { TenantContextService } from 'src/modules/shared/tenant/tenant-context.service';

import { PrismaClient } from '../../generated/prisma/client';
import { LogContext } from '../logger/log-context';

// These models bypass only generic direct where.tenantId injection and may still be tenant-owned through another policy.
export const DIRECT_TENANT_WHERE_EXCLUDED_MODELS = new Set([
  'Tenant',
  'CustomDomain',
  'BillingUnit',
  'TenantBillingUnit',
  'RefreshToken',
  'UserProfile',
  'Asset',
  'AssetAssignment',
  'OrderItem',
  'OwnerPaymentSplit',
  'OrderItemOwnerSplit',
  'BundleComponent',
  'BundleSnapshot',
  'BundleSnapshotComponent',
  'PricingTier',
  'RolePermission',
  'UserRole',
  'LocationSchedule',
  'CouponRedemption',
  'LongRentalDiscountExclusion',
  'PromotionExclusion',
  'OrderDeliveryRequest',
  'CustomerProfile',

  'V2Tenant',
  'V2TenantRolePermission',
  'V2BranchSchedule',
  'V2BranchDeliveryDistancePriceBand',
  'V2Contract',
  'V2CustomerProfile',
  'V2LocalCredential',
  'V2PasswordResetToken',
  'V2AuthAuditEvent',
]);

const READ_WITH_WHERE_OPS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'findUnique',
  'findUniqueOrThrow',
  'count',
  'aggregate',
  'groupBy',
]);

const MUTATE_WITH_WHERE_OPS = new Set(['update', 'updateMany', 'delete', 'deleteMany']);

function requiresTenantWhere(operation: string): boolean {
  return READ_WITH_WHERE_OPS.has(operation) || MUTATE_WITH_WHERE_OPS.has(operation);
}

function createExtendedClient(prisma: PrismaClient, tenantContext: TenantContextService) {
  const tenantScopedClient = prisma.$extends({
    name: 'tenant-scope',

    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (DIRECT_TENANT_WHERE_EXCLUDED_MODELS.has(model ?? '')) {
            return query(args);
          }

          const tenantId = tenantContext.getTenantId();

          if (!tenantId) {
            return query(args);
          }

          if (requiresTenantWhere(operation)) {
            args.where = {
              ...args.where,
              tenantId,
            };
          }

          return query(args);
        },
      },
    },
  });

  return tenantScopedClient.$extends({
    name: 'query-metrics',

    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const start = Date.now();

          try {
            return await query(args);
          } finally {
            LogContext.increment('dbQueries');
            LogContext.increment('dbDurationMs', Date.now() - start);
          }
        },
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createExtendedClient>;

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly prisma: PrismaClient;
  private readonly extendedClient: ExtendedPrismaClient;

  constructor(
    readonly configService: ConfigService<Env, true>,
    tenantContext: TenantContextService,
  ) {
    const adapter = new PrismaPg({
      connectionString: configService.get('DATABASE_URL'),
    });

    this.prisma = new PrismaClient({ adapter });

    this.extendedClient = createExtendedClient(this.prisma, tenantContext);
  }

  async onModuleInit(): Promise<void> {
    await this.prisma.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }

  get client(): ExtendedPrismaClient {
    return this.extendedClient;
  }
}
