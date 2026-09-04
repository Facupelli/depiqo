import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';

import { Env } from 'src/config/env.schema';
import { TenantContextService } from 'src/modules/shared/tenant/tenant-context.service';

import { PrismaClient } from '../../generated/prisma/client';
import { LogContext } from '../logger/log-context';

const TENANT_EXCLUDED_MODELS = new Set([
  'Tenant',
  'CustomDomain',
  'BillingUnit', // Global lookup table, no tenant scope.
  'TenantBillingUnit', // Join table — tenantId is the FK, not a scope guard.
  'RefreshToken',
  'UserProfile', // Scoped through User.
  'Asset', // Scoped through Location.
  'AssetAssignment', // Scoped through Asset.
  'OrderItem', // Scoped through Order.
  'BundleComponent', // Scoped through Bundle.
  'BundleSnapshot', // Scoped through OrderItem.
  'BundleSnapshotComponent', // Scoped through BundleSnapshot.
  'PricingTier', // Scoped through ProductType or Bundle.
  'RolePermission', // Scoped through Role.
  'UserRole', // Scoped through User.
  'LocationSchedule', // Scoped through Location.
  'CouponRedemption', // Scoped through Coupon / Order.
  'LongRentalDiscountExclusion', // Scoped through LongRentalDiscount.
  'PromotionExclusion', // Scoped through Promotion.
  'OrderDeliveryRequest',
  'CustomerProfile',

  // V2
  'V2Tenant',
  'V2BranchSchedule',
  'V2Contract',
  'V2CustomerProfile',
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

export function injectTenantId(operation: string, args: Record<string, any>, tenantId: string): Record<string, any> {
  if (!requiresTenantWhere(operation)) {
    return args;
  }

  return {
    ...args,
    where: {
      ...args.where,
      tenantId,
    },
  };
}

function createExtendedClient(prisma: PrismaClient, tenantContext: TenantContextService) {
  const tenantScopedClient = prisma.$extends({
    name: 'tenant-scope',

    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (TENANT_EXCLUDED_MODELS.has(model ?? '')) {
            return query(args);
          }

          const tenantId = tenantContext.getTenantId();

          if (!tenantId) {
            return query(args);
          }

          const mutatedArgs = injectTenantId(operation, args as Record<string, any>, tenantId) as typeof args;

          return query(mutatedArgs);
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
