import {
  CustomDomainStatus,
  PrismaClient,
  V2PasswordAlgorithm,
  V2RentalCustomerOnboardingStatus,
  V2TenantDomainStatus,
  V2TenantStatus,
  V2UserRole,
  V2UserStatus,
} from "../../../generated/prisma/client";
import { localDateToPrismaDate, prismaDateToLocalDate } from '../../../core/temporal/local-date';

export type TenantV2MigrationContext = {
  prisma: PrismaClient;
  legacyTenantId: string;
  v2TenantId: string;
  dryRun: boolean;
  now: Date;
  log: (message: string, data?: unknown) => void;
};


export async function migrateTenantManagementStage(
  ctx: TenantV2MigrationContext,
) {
  ctx.log('Starting Stage 1: Tenant Management');

  await migrateTenant(ctx);
  await migrateTenantBranding(ctx);
  await migrateTenantDomain(ctx);
  await migrateBranches(ctx);
  await migrateBranchSchedules(ctx);
  await migrateTenantUsers(ctx);
  await migrateTenantContractSigners(ctx);
  await migrateRentalCustomers(ctx);
  await migrateCustomerProfiles(ctx);

  ctx.log('Finished Stage 1: Tenant Management');
}

async function migrateTenant(ctx: TenantV2MigrationContext) {
  const tenant = await ctx.prisma.tenant.findUniqueOrThrow({
    where: { id: ctx.legacyTenantId },
  });

  const data = {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    status: tenant.deletedAt ? V2TenantStatus.DISABLED : V2TenantStatus.ACTIVE,
    config: tenant.config ?? {},
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
    deletedAt: tenant.deletedAt,
  };

  ctx.log('Migrating tenant', data);

  if (ctx.dryRun) return;

  await ctx.prisma.v2Tenant.upsert({
    where: { id: data.id },
    create: data,
    update: {
      name: data.name,
      slug: data.slug,
      status: data.status,
      config: data.config,
      updatedAt: data.updatedAt,
      deletedAt: data.deletedAt,
    },
  });
}

async function migrateTenantBranding(ctx: TenantV2MigrationContext) {
  const tenant = await ctx.prisma.tenant.findUniqueOrThrow({
    where: { id: ctx.legacyTenantId },
  });

  const data = {
    tenantId: tenant.id,
    logoUrl: tenant.logoUrl,
    faviconUrl: tenant.faviconUrl,
    primaryColor: tenant.primaryColor,
    accentColor: null,
    storefrontName: tenant.name,
    tagline: null,
  };

  ctx.log('Migrating tenant branding', data);

  if (ctx.dryRun) return;

  await ctx.prisma.v2TenantBranding.upsert({
    where: { tenantId: data.tenantId },
    create: data,
    update: {
      logoUrl: data.logoUrl,
      faviconUrl: data.faviconUrl,
      primaryColor: data.primaryColor,
      storefrontName: data.storefrontName,
    },
  });
}

async function migrateTenantDomain(ctx: TenantV2MigrationContext) {
  const tenant = await ctx.prisma.tenant.findUniqueOrThrow({
    where: { id: ctx.legacyTenantId },
    include: { managedCustomDomain: true },
  });

  const legacyDomain = tenant.managedCustomDomain;

  if (!legacyDomain && !tenant.customDomain) {
    ctx.log('No custom domain to migrate');
    return;
  }

  const domain = legacyDomain?.domain ?? tenant.customDomain;

  if (!domain) {
    ctx.log('No domain value found');
    return;
  }

  const data = {
    tenantId: tenant.id,
    domain,
    status: legacyDomain
      ? mapCustomDomainStatus(legacyDomain.status)
      : V2TenantDomainStatus.PENDING,
    isPrimary: true,
    cfHostnameId: legacyDomain?.cfHostnameId ?? null,
    verifiedAt: legacyDomain?.verifiedAt ?? null,
    lastCheckedAt: null,
    failureReason: legacyDomain?.lastError ?? null,
    createdAt: legacyDomain?.createdAt ?? tenant.createdAt,
    updatedAt: legacyDomain?.updatedAt ?? tenant.updatedAt,
    deletedAt: null,
  };

  ctx.log('Migrating tenant domain', data);

  if (ctx.dryRun) return;

  await ctx.prisma.v2TenantDomain.upsert({
    where: { domain: data.domain },
    create: data,
    update: {
      tenantId: data.tenantId,
      status: data.status,
      isPrimary: data.isPrimary,
      cfHostnameId: data.cfHostnameId,
      verifiedAt: data.verifiedAt,
      lastCheckedAt: data.lastCheckedAt,
      failureReason: data.failureReason,
      updatedAt: data.updatedAt,
      deletedAt: data.deletedAt,
    },
  });
}

function mapCustomDomainStatus(
  status: CustomDomainStatus,
): V2TenantDomainStatus {
  switch (status) {
    case CustomDomainStatus.ACTIVE:
      return V2TenantDomainStatus.VERIFIED;
    case CustomDomainStatus.FAILED:
      return V2TenantDomainStatus.DISABLED;
    case CustomDomainStatus.PENDING:
    case CustomDomainStatus.ACTION_REQUIRED:
    default:
      return V2TenantDomainStatus.PENDING;
  }
}

async function migrateBranches(ctx: TenantV2MigrationContext) {
  const locations = await ctx.prisma.location.findMany({
    where: { tenantId: ctx.legacyTenantId },
  });

  ctx.log(`Migrating branches: ${locations.length}`);

  if (ctx.dryRun) return;

  for (const location of locations) {
    await ctx.prisma.v2Branch.upsert({
      where: { id: location.id },
      create: {
        id: location.id,
        tenantId: location.tenantId,
        name: location.name,
        address: location.address,
        timezone: location.timezone,
        isActive: location.isActive,
        supportsDelivery: location.supportsDelivery,
        deliveryDefaultCountry: location.deliveryDefaultCountry,
        deliveryDefaultStateRegion: location.deliveryDefaultStateRegion,
        deliveryDefaultCity: location.deliveryDefaultCity,
        deliveryDefaultPostalCode: location.deliveryDefaultPostalCode,
        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
        deletedAt: null,
      },
      update: {
        name: location.name,
        address: location.address,
        timezone: location.timezone,
        isActive: location.isActive,
        supportsDelivery: location.supportsDelivery,
        deliveryDefaultCountry: location.deliveryDefaultCountry,
        deliveryDefaultStateRegion: location.deliveryDefaultStateRegion,
        deliveryDefaultCity: location.deliveryDefaultCity,
        deliveryDefaultPostalCode: location.deliveryDefaultPostalCode,
        updatedAt: location.updatedAt,
      },
    });
  }
}

async function migrateBranchSchedules(ctx: TenantV2MigrationContext) {
  const schedules = await ctx.prisma.locationSchedule.findMany({
    where: {
      location: {
        tenantId: ctx.legacyTenantId,
      },
    },
  });

  ctx.log(`Migrating branch schedules: ${schedules.length}`);

  if (ctx.dryRun) return;

  for (const schedule of schedules) {
    await ctx.prisma.v2BranchSchedule.upsert({
      where: { id: schedule.id },
      create: {
        id: schedule.id,
        branchId: schedule.locationId,
        type: schedule.type,
        dayOfWeek: schedule.dayOfWeek,
        specificDate: schedule.specificDate ? localDateToPrismaDate(prismaDateToLocalDate(schedule.specificDate)) : null,
        openTime: schedule.openTime,
        closeTime: schedule.closeTime,
        slotIntervalMinutes: schedule.slotIntervalMinutes,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt,
      },
      update: {
        type: schedule.type,
        dayOfWeek: schedule.dayOfWeek,
        specificDate: schedule.specificDate ? localDateToPrismaDate(prismaDateToLocalDate(schedule.specificDate)) : null,
        openTime: schedule.openTime,
        closeTime: schedule.closeTime,
        slotIntervalMinutes: schedule.slotIntervalMinutes,
        updatedAt: schedule.updatedAt,
      },
    });
  }
}

async function migrateTenantUsers(ctx: TenantV2MigrationContext) {
  const users = await ctx.prisma.user.findMany({
    where: { tenantId: ctx.legacyTenantId },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  });

  ctx.log(`Migrating tenant users: ${users.length}`);

  if (ctx.dryRun) return;

  for (const user of users) {
    const role = mapLegacyUserToV2Role(user);

    await ctx.prisma.v2TenantUser.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        emailVerifiedAt: null,
        name: `${user.firstName} ${user.lastName}`.trim(),
        avatarUrl: null,
        role,
        status: mapLegacyUserStatus(user),
        sessionVersion: 1,
        passwordChangedAt: null,
        lastLoginAt: null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      update: {
        tenantId: user.tenantId,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        role,
        status: mapLegacyUserStatus(user),
        updatedAt: user.updatedAt,
      },
    });

    await ctx.prisma.v2LocalCredential.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        passwordHash: user.passwordHash,
        passwordAlgorithm: V2PasswordAlgorithm.BCRYPT,
        passwordUpdatedAt: user.updatedAt,
      },
      update: {
        passwordHash: user.passwordHash,
        passwordAlgorithm: V2PasswordAlgorithm.BCRYPT,
        passwordUpdatedAt: user.updatedAt,
      },
    });

  }
}

function mapLegacyUserToV2Role(user: {
  userRoles: Array<{ role: { code: string } }>;
}): V2UserRole {
  const hasAdminRole = user.userRoles.some((userRole) => {
    return userRole.role.code === 'TENANT_ADMIN';
  });

  return hasAdminRole ? V2UserRole.ADMIN : V2UserRole.ADMIN;
  // Intentionally ADMIN for first V2 tenant migration.
  // Later, change fallback to V2UserRole.USER if needed.
}

function mapLegacyUserStatus(user: {
  isActive: boolean;
  deletedAt: Date | null;
}): V2UserStatus {
  if (user.deletedAt) return V2UserStatus.DELETED;
  if (!user.isActive) return V2UserStatus.SUSPENDED;
  return V2UserStatus.ACTIVE;
}

async function migrateTenantContractSigners(ctx: TenantV2MigrationContext) {
  const profiles = await ctx.prisma.userProfile.findMany({
    where: {
      user: {
        tenantId: ctx.legacyTenantId,
      },
    },
    include: {
      user: {
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  ctx.log(`Migrating tenant contract signers: ${profiles.length}`);

  if (ctx.dryRun) return;

  const defaultProfileId = profiles[0]?.id;

  for (const profile of profiles) {
    await ctx.prisma.v2TenantContractSigner.upsert({
      where: { id: profile.id },
      create: {
        id: profile.id,
        tenantId: profile.user.tenantId,
        fullName: profile.fullName,
        documentNumber: profile.documentNumber,
        phone: profile.phone,
        address: profile.address,
        signatureUrl: profile.signUrl,
        isDefault: profile.id === defaultProfileId,
        isActive: true,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
        deletedAt: null,
      },
      update: {
        fullName: profile.fullName,
        documentNumber: profile.documentNumber,
        phone: profile.phone,
        address: profile.address,
        signatureUrl: profile.signUrl,
        isDefault: profile.id === defaultProfileId,
        isActive: true,
        updatedAt: profile.updatedAt,
      },
    });
  }
}

async function migrateRentalCustomers(ctx: TenantV2MigrationContext) {
  const customers = await ctx.prisma.customer.findMany({
    where: { tenantId: ctx.legacyTenantId },
    include: { profile: true },
  });

  ctx.log(`Migrating rental customers: ${customers.length}`);

  if (ctx.dryRun) return;

  for (const customer of customers) {
    await ctx.prisma.v2RentalCustomer.upsert({
      where: { id: customer.id },
      create: {
        id: customer.id,
        tenantId: customer.tenantId,
        email: customer.email,
        passwordHash: customer.passwordHash,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.profile?.phone ?? null,
        emailVerifiedAt: null,
        avatarUrl: null,
        sessionVersion: 1,
        lastLoginAt: null,
        isCompany: customer.isCompany,
        companyName: customer.companyName,
        isActive: customer.isActive,
        onboardingStatus: customer.onboardingStatus as V2RentalCustomerOnboardingStatus,
        profileSnapshot: buildCustomerProfileSnapshot(customer.profile),
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        deletedAt: customer.deletedAt,
      },
      update: {
        email: customer.email,
        passwordHash: customer.passwordHash,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.profile?.phone ?? null,
        isCompany: customer.isCompany,
        companyName: customer.companyName,
        isActive: customer.isActive,
        onboardingStatus: customer.onboardingStatus as V2RentalCustomerOnboardingStatus,
        profileSnapshot: buildCustomerProfileSnapshot(customer.profile),
        updatedAt: customer.updatedAt,
        deletedAt: customer.deletedAt,
      },
    });
  }
}

function buildCustomerProfileSnapshot(profile: unknown) {
  if (!profile) {
    return {
      migratedFromLegacy: true,
    };
  }

  const typedProfile = profile as {
    status?: string;
    heardAboutUs?: string;
    heardAboutUsOther?: string | null;
  };

  return {
    migratedFromLegacy: true,
    legacyProfileStatus: typedProfile.status ?? null,
    heardAboutUs: typedProfile.heardAboutUs ?? null,
    heardAboutUsOther: typedProfile.heardAboutUsOther ?? null,
  };
}

async function migrateCustomerProfiles(ctx: TenantV2MigrationContext) {
  const profiles = await ctx.prisma.customerProfile.findMany({
    where: {
      customer: {
        tenantId: ctx.legacyTenantId,
      },
    },
  });

  ctx.log(`Migrating customer profiles: ${profiles.length}`);

  if (ctx.dryRun) return;

  for (const profile of profiles) {
    await ctx.prisma.v2CustomerProfile.upsert({
      where: { id: profile.id },
      create: {
        id: profile.id,
        customerId: profile.customerId,
        fullName: profile.fullName,
        phone: profile.phone,
        birthDate: localDateToPrismaDate(prismaDateToLocalDate(profile.birthDate)),
        documentNumber: profile.documentNumber,
        identityDocumentPath: profile.identityDocumentPath,
        address: profile.address,
        city: profile.city,
        stateRegion: profile.stateRegion,
        country: profile.country,
        occupation: profile.occupation,
        company: profile.company,
        taxId: profile.taxId,
        businessName: profile.businessName,
        bankName: profile.bankName,
        accountNumber: profile.accountNumber,
        instagram: profile.instagram,
        knowsExistingCustomer: profile.knowsExistingCustomer,
        knownCustomerName: profile.knownCustomerName,
        contact1Name: profile.contact1Name,
        contact1Phone: profile.contact1Phone,
        contact1Relationship: profile.contact1Relationship,
        contact2Name: profile.contact2Name,
        contact2Phone: profile.contact2Phone,
        contact2Relationship: profile.contact2Relationship,
        rejectionReason: profile.rejectionReason,
        reviewedAt: profile.reviewedAt,
        reviewedById: profile.reviewedById,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
      update: {
        fullName: profile.fullName,
        phone: profile.phone,
        birthDate: localDateToPrismaDate(prismaDateToLocalDate(profile.birthDate)),
        documentNumber: profile.documentNumber,
        identityDocumentPath: profile.identityDocumentPath,
        address: profile.address,
        city: profile.city,
        stateRegion: profile.stateRegion,
        country: profile.country,
        occupation: profile.occupation,
        company: profile.company,
        taxId: profile.taxId,
        businessName: profile.businessName,
        bankName: profile.bankName,
        accountNumber: profile.accountNumber,
        instagram: profile.instagram,
        knowsExistingCustomer: profile.knowsExistingCustomer,
        knownCustomerName: profile.knownCustomerName,
        contact1Name: profile.contact1Name,
        contact1Phone: profile.contact1Phone,
        contact1Relationship: profile.contact1Relationship,
        contact2Name: profile.contact2Name,
        contact2Phone: profile.contact2Phone,
        contact2Relationship: profile.contact2Relationship,
        rejectionReason: profile.rejectionReason,
        reviewedAt: profile.reviewedAt,
        reviewedById: profile.reviewedById,
        updatedAt: profile.updatedAt,
      },
    });
  }
}
