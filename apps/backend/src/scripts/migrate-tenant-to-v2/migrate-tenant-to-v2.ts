import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, V2RentableItemKind } from "../../generated/prisma/client";
import { migrateTenantManagementStage } from "./stages/tenant-management.stage";
import { TenantV2MigrationContext } from "./migration-context";
import { migrateInventoryStage } from "./stages/inventory.stage";
import { migrateCatalogStage } from "./stages/catalog.stage";
import { migratePricingStage } from "./stages/pricing.stage";
import { migrateRentalCommitmentStage, verifyRentalCommitmentStage } from "./stages/rental-commitment.stage";
import { verifyV2MigrationIntegrity } from "./stages/integrity-checks.stage";

function getArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main() {
	const tenantId = getArg("--tenantId");
	const dryRun = process.argv.includes("--dry-run");

	if (!tenantId) {
		throw new Error("Missing required argument: --tenantId <tenant-id>");
	}

	const connectionString = process.env.DATABASE_URL;

	if (!connectionString) {
		throw new Error("DATABASE_URL is not set");
	}

	const adapter = new PrismaPg({
		connectionString,
	});

	const prisma = new PrismaClient({
		adapter,
	});

	try {
		const ctx: TenantV2MigrationContext = {
			prisma,
			legacyTenantId: tenantId,
			v2TenantId: tenantId,
			dryRun,
			now: new Date(),
			log: (message, data) => {
				console.log(`[v2-migration] ${message}`);
				if (data !== undefined) {
					console.dir(data, { depth: null });
				}
			},
		};

		ctx.log("Starting migration", { tenantId, dryRun });

		await migrateTenantManagementStage(ctx);
    await migrateInventoryStage(ctx);
    await migrateCatalogStage(ctx);
    await migratePricingStage(ctx);
    await migrateRentalCommitmentStage(ctx);

    if (!ctx.dryRun) {
      await verifyTenantManagementStage(ctx);
      await verifyInventoryStage(ctx);
      await verifyCatalogStage(ctx);
      await verifyPricingStage(ctx);
      await verifyRentalCommitmentStage(ctx);
      await verifyV2MigrationIntegrity(ctx);
    }

		ctx.log("Migration finished");
	} finally {
		await prisma.$disconnect();
	}
}

main().catch((error) => {
  console.error("[v2-migration] Failed");
  console.error(error);
  process.exit(1);
});


async function verifyTenantManagementStage(ctx: TenantV2MigrationContext) {
	const [
		tenants,
		branding,
		domains,
		branches,
		branchSchedules,
		tenantUsers,
		localCredentials,
		contractSigners,
		rentalCustomers,
		customerProfiles,
	] = await Promise.all([
		ctx.prisma.v2Tenant.count({ where: { id: ctx.v2TenantId } }),
		ctx.prisma.v2TenantBranding.count({
			where: { tenantId: ctx.v2TenantId },
		}),
		ctx.prisma.v2TenantDomain.count({
			where: { tenantId: ctx.v2TenantId },
		}),
		ctx.prisma.v2Branch.count({
			where: { tenantId: ctx.v2TenantId },
		}),
		ctx.prisma.v2BranchSchedule.count({
			where: {
				branch: {
					tenantId: ctx.v2TenantId,
				},
			},
		}),
		ctx.prisma.v2TenantUser.count({
			where: { tenantId: ctx.v2TenantId },
		}),
		ctx.prisma.v2LocalCredential.count({
			where: {
				user: {
					tenantId: ctx.v2TenantId,
				},
			},
		}),
		ctx.prisma.v2TenantContractSigner.count({
			where: { tenantId: ctx.v2TenantId },
		}),
		ctx.prisma.v2RentalCustomer.count({
			where: { tenantId: ctx.v2TenantId },
		}),
		ctx.prisma.v2CustomerProfile.count({
			where: {
				customer: {
					tenantId: ctx.v2TenantId,
				},
			},
		}),
	]);

	ctx.log("Stage 1 verification", {
		tenants,
		branding,
		domains,
		branches,
		branchSchedules,
		tenantUsers,
		localCredentials,
		contractSigners,
		rentalCustomers,
		customerProfiles,
	});
}

async function verifyInventoryStage(ctx: TenantV2MigrationContext) {
	const [
		assetOwners,
		equipmentTypes,
		assets,
		ownerContracts,
		accessoryDefaults,
		rentalAssetCandidates,
	] = await Promise.all([
		ctx.prisma.v2AssetOwner.count({
			where: { tenantId: ctx.v2TenantId },
		}),
		ctx.prisma.v2EquipmentType.count({
			where: { tenantId: ctx.v2TenantId },
		}),
		ctx.prisma.v2Asset.count({
			where: { tenantId: ctx.v2TenantId },
		}),
		ctx.prisma.v2OwnerContract.count({
			where: { tenantId: ctx.v2TenantId },
		}),
		ctx.prisma.v2EquipmentTypeAccessoryDefault.count({
			where: { tenantId: ctx.v2TenantId },
		}),
		ctx.prisma.v2RentalAssetCandidate.count({
			where: { tenantId: ctx.v2TenantId },
		}),
	]);

	ctx.log("Stage 2 verification", {
		assetOwners,
		equipmentTypes,
		assets,
		ownerContracts,
		accessoryDefaults,
		rentalAssetCandidates,
	});
}

export async function verifyCatalogStage(ctx: TenantV2MigrationContext) {
	const [
		categories,
		rentableItems,
		singleItems,
		bundleItems,
		requirements,
		rentalOffers,
		activeOffers,
	] = await Promise.all([
		ctx.prisma.v2Category.count({
			where: { tenantId: ctx.v2TenantId },
		}),
		ctx.prisma.v2RentableItem.count({
			where: { tenantId: ctx.v2TenantId },
		}),
		ctx.prisma.v2RentableItem.count({
			where: {
				tenantId: ctx.v2TenantId,
				kind: V2RentableItemKind.SINGLE,
			},
		}),
		ctx.prisma.v2RentableItem.count({
			where: {
				tenantId: ctx.v2TenantId,
				kind: V2RentableItemKind.PACKAGE,
			},
		}),
		ctx.prisma.v2RentableItemRequirement.count({
			where: { tenantId: ctx.v2TenantId },
		}),
		ctx.prisma.v2RentalOffer.count({
			where: { tenantId: ctx.v2TenantId },
		}),
		ctx.prisma.v2RentalOffer.count({
			where: {
				tenantId: ctx.v2TenantId,
				isVisible: true,
				isRentable: true,
				deletedAt: null,
			},
		}),
	]);

	ctx.log("Stage 3 verification", {
		categories,
		rentableItems,
		singleItems,
		bundleItems,
		requirements,
		rentalOffers,
		activeOffers,
	});
}

export async function verifyPricingStage(ctx: TenantV2MigrationContext) {
	const [ratePlans, ratePlanTiers, rentalOfferPricings, activePricings] =
		await Promise.all([
			ctx.prisma.v2RatePlan.count({
				where: { tenantId: ctx.v2TenantId },
			}),
			ctx.prisma.v2RatePlanTier.count({
				where: { tenantId: ctx.v2TenantId },
			}),
			ctx.prisma.v2RentalOfferPricing.count({
				where: { tenantId: ctx.v2TenantId },
			}),
			ctx.prisma.v2RentalOfferPricing.count({
				where: {
					tenantId: ctx.v2TenantId,
					isActive: true,
					deletedAt: null,
				},
			}),
		]);

	ctx.log("Stage 4 verification", {
		ratePlans,
		ratePlanTiers,
		rentalOfferPricings,
		activePricings,
	});
}
