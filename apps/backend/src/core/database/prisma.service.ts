import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';
import { ConfigService } from '@nestjs/config';
import { Env } from 'src/config/env.schema';
import { PrismaPg } from '@prisma/adapter-pg';
import { TenantContextService } from 'src/modules/shared/tenant/tenant-context.service';
import { LogContext } from '../logger/log-context';

const TENANT_EXCLUDED_MODELS = new Set([
  'Tenant',
  'CustomDomain',
  'BillingUnit', // global lookup table, no tenant scope
  'TenantBillingUnit', // join table — tenantId is the FK, not a scope guard
  'RefreshToken',
  'UserProfile', // scoped through User
  'Asset', // scoped through Location
  'AssetAssignment', // scoped through Asset
  'OrderItem', // scoped through Order
  'BundleComponent', // scoped through Bundle
  'BundleSnapshot', // scoped through OrderItem
  'BundleSnapshotComponent', // scoped through BundleSnapshot
  'PricingTier', // scoped through ProductType or Bundle
  'RolePermission', // scoped through Role
  'UserRole', // scoped through User
  'LocationSchedule', // scoped through Location
  'CouponRedemption', // scoped through Coupon / Order
  'LongRentalDiscountExclusion', // scoped through LongRentalDiscount
  'PromotionExclusion', // scoped through Promotion
  'OrderDeliveryRequest',
  'CustomerProfile',
  // V2
  'V2Tenant',
  'V2BranchSchedule',
  'V2Contract',
  'V2CustomerProfile',
]);

// Operations that only need WHERE injection
const READ_OPS = new Set(['findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate', 'groupBy']);

// Mutations that need WHERE injection to prevent cross-tenant writes
const MUTATE_WITH_WHERE_OPS = new Set(['update', 'updateMany', 'delete', 'deleteMany']);

// findUnique variants — need special treatment (see comment in `client` getter)
const FIND_UNIQUE_OPS = new Set(['findUnique', 'findUniqueOrThrow']);

export function injectTenantId(operation: string, args: Record<string, any>, tenantId: string): Record<string, any> {
  if (READ_OPS.has(operation) || MUTATE_WITH_WHERE_OPS.has(operation)) {
    args.where = { ...args.where, tenantId };
    return args;
  }

  return args;
}

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly _prisma: PrismaClient;

  constructor(
    readonly configService: ConfigService<Env, true>,
    private readonly tenantContext: TenantContextService,
  ) {
    const adapter = new PrismaPg({
      connectionString: configService.get('DATABASE_URL'),
    });

    this._prisma = new PrismaClient({ adapter });
  }

  async onModuleInit() {
    await this._prisma.$connect();
    console.log('📦 Database connected successfully');
  }

  async onModuleDestroy() {
    await this._prisma.$disconnect();
    console.log('📦 Database disconnected');
  }

  get client() {
    // Capture the reference so the closure inside $extends doesn't need
    // to reach back through `this` (which can be confusing in async contexts).
    const prisma = this._prisma;
    const tenantContext = this.tenantContext;

    const tenantClient = prisma.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            // ── Guard 1: model has no tenantId column ──────────────────────
            if (TENANT_EXCLUDED_MODELS.has(model ?? '')) {
              return query(args);
            }

            // ── Guard 2: resolve tenantId from ALS ─────────────────────────
            const tenantId = tenantContext.getTenantId();
            if (!tenantId) {
              return query(args);
            }

            // ── findUnique / findUniqueOrThrow → downgrade to findFirst ────
            //
            // Prisma enforces that findUnique's `where` may ONLY contain fields
            // that form a declared unique constraint (@@unique or @unique).
            // `tenantId` alone is not a unique constraint, so injecting it
            // would cause a compile-time and runtime type error.
            //
            // Fix: downgrade to findFirst, which accepts arbitrary `where`
            // filters. The semantics are equivalent because the unique field
            // (e.g. `id`) already guarantees at most one row; tenantId just
            // adds the RLS boundary on top of that.
            if (FIND_UNIQUE_OPS.has(operation)) {
              const downgradedOp = operation === 'findUnique' ? 'findFirst' : 'findFirstOrThrow';

              const mutatedArgs = {
                ...args,
                where: { ...(args as any).where, tenantId },
              };

              // Call the downgraded operation on the raw client's model
              // delegate. The cast is unavoidable here because TypeScript
              // cannot statically index PrismaClient by a runtime model name.
              return (prisma as any)[model][downgradedOp](mutatedArgs);
            }

            // ── All other operations ────────────────────────────────────────
            const mutatedArgs = injectTenantId(operation, args as Record<string, any>, tenantId);

            return query(mutatedArgs);
          },
        },
      },
    });

    return tenantClient.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            const start = Date.now();

            try {
              return await query(args);
            } finally {
              // finally guarantees we track even queries that throw
              LogContext.increment('dbQueries');
              LogContext.increment('dbDurationMs', Date.now() - start);
            }
          },
        },
      },
    });
  }
}
