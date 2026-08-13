import { v5 as uuidv5 } from "uuid";
import {
	PrismaClient,
	V2BillingUnit,
} from "../../../generated/prisma/client";

export type TenantV2MigrationContext = {
	prisma: PrismaClient;
	legacyTenantId: string;
	v2TenantId: string;
	dryRun: boolean;
	now: Date;
	log: (message: string, data?: unknown) => void;
};

type LegacyPricingGroupKey = string;

type LegacyPricingGroup = {
	key: LegacyPricingGroupKey;
	tenantId: string;
	rentableItemId: string;
	locationId: string | null;
	sourceKind: "PRODUCT_TYPE" | "BUNDLE";
	sourceId: string;
	billingUnit: {
		label: string;
		durationMinutes: number;
	};
	name: string;
	tiers: Array<{
		id: string;
		fromUnit: number;
		toUnit: number | null;
		pricePerUnit: unknown;
		createdAt: Date;
		updatedAt: Date;
	}>;
};

export async function migratePricingStage(ctx: TenantV2MigrationContext) {
	ctx.log("Starting Stage 4: Pricing");

	const groups = await buildLegacyPricingGroups(ctx);

	ctx.log("Migrating pricing groups", {
		groups: groups.length,
		ratePlans: groups.length,
		ratePlanTiers: groups.reduce((sum, group) => sum + group.tiers.length, 0),
	});

	await migrateRatePlans(ctx, groups);
	await migrateRatePlanTiers(ctx, groups);
	await migrateRentalOfferPricings(ctx, groups);

	ctx.log("Finished Stage 4: Pricing");
}

async function buildLegacyPricingGroups(
	ctx: TenantV2MigrationContext,
): Promise<LegacyPricingGroup[]> {
	const pricingTiers = await ctx.prisma.pricingTier.findMany({
		where: {
			OR: [
				{
					productType: {
						tenantId: ctx.legacyTenantId,
					},
				},
				{
					bundle: {
						tenantId: ctx.legacyTenantId,
					},
				},
			],
		},
		include: {
			productType: {
				include: {
					billingUnit: true,
				},
			},
			bundle: {
				include: {
					billingUnit: true,
					components: { include: { productType: true } },
				},
			},
			location: true,
		},
		orderBy: [
			{ productTypeId: "asc" },
			{ bundleId: "asc" },
			{ locationId: "asc" },
			{ fromUnit: "asc" },
		],
	});

	const groups = new Map<LegacyPricingGroupKey, LegacyPricingGroup>();

	for (const tier of pricingTiers) {
		if (!tier.productTypeId && !tier.bundleId) {
			ctx.log("Skipping pricing tier without productTypeId or bundleId", {
				pricingTierId: tier.id,
			});
			continue;
		}

		if (tier.productTypeId && tier.bundleId) {
			ctx.log("Skipping pricing tier with both productTypeId and bundleId", {
				pricingTierId: tier.id,
				productTypeId: tier.productTypeId,
				bundleId: tier.bundleId,
			});
			continue;
		}

		if (
			(tier.productType && (tier.productType.deletedAt || tier.productType.retiredAt)) ||
			(tier.bundle && (tier.bundle.retiredAt || tier.bundle.components.some((component) => component.productType.deletedAt || component.productType.retiredAt)))
		) {
			continue;
		}

		const source = tier.productType ?? tier.bundle;

		if (!source) {
			ctx.log("Skipping pricing tier with missing source relation", {
				pricingTierId: tier.id,
				productTypeId: tier.productTypeId,
				bundleId: tier.bundleId,
			});
			continue;
		}

		const sourceKind = tier.productType
			? "PRODUCT_TYPE"
			: "BUNDLE";

		const sourceId = tier.productTypeId ?? tier.bundleId;

		if (!sourceId) {
			throw new Error(`Missing source id for pricing tier ${tier.id}`);
		}

		const billingUnit = source.billingUnit;

		const locationKey = tier.locationId ?? "GLOBAL";
		const key = `${sourceKind}:${sourceId}:LOCATION:${locationKey}`;

		const existing = groups.get(key);

		if (!existing) {
			groups.set(key, {
				key,
				tenantId: ctx.v2TenantId,
				rentableItemId: sourceId,
				locationId: tier.locationId,
				sourceKind,
				sourceId,
				billingUnit: {
					label: billingUnit.label,
					durationMinutes: billingUnit.durationMinutes,
				},
				name: buildRatePlanName({
					sourceName: source.name,
					locationName: tier.location?.name ?? null,
				}),
				tiers: [
					{
						id: tier.id,
						fromUnit: tier.fromUnit,
						toUnit: tier.toUnit,
						pricePerUnit: tier.pricePerUnit,
						createdAt: tier.createdAt,
						updatedAt: tier.updatedAt,
					},
				],
			});

			continue;
		}

		existing.tiers.push({
			id: tier.id,
			fromUnit: tier.fromUnit,
			toUnit: tier.toUnit,
			pricePerUnit: tier.pricePerUnit,
			createdAt: tier.createdAt,
			updatedAt: tier.updatedAt,
		});
	}

	return [...groups.values()];
}

async function migrateRatePlans(
	ctx: TenantV2MigrationContext,
	groups: LegacyPricingGroup[],
) {
	ctx.log(`Migrating rate plans: ${groups.length}`);

	if (ctx.dryRun) return;

	for (const group of groups) {
		const ratePlanId = buildRatePlanId(group);

		await ctx.prisma.v2RatePlan.upsert({
			where: { id: ratePlanId },
			create: {
				id: ratePlanId,
				tenantId: group.tenantId,
				name: group.name,
				billingUnit: mapLegacyBillingUnitToV2(group.billingUnit),
				currency: resolveCurrencyFromTenantConfig(ctx, "ARS"),
				isActive: true,
				deletedAt: null,
				createdAt: getEarliestCreatedAt(group),
				updatedAt: getLatestUpdatedAt(group),
			},
			update: {
				name: group.name,
				billingUnit: mapLegacyBillingUnitToV2(group.billingUnit),
				currency: resolveCurrencyFromTenantConfig(ctx, "ARS"),
				isActive: true,
				deletedAt: null,
				updatedAt: getLatestUpdatedAt(group),
			},
		});
	}
}

async function migrateRatePlanTiers(
	ctx: TenantV2MigrationContext,
	groups: LegacyPricingGroup[],
) {
	const tiersCount = groups.reduce((sum, group) => sum + group.tiers.length, 0);

	ctx.log(`Migrating rate plan tiers: ${tiersCount}`);

	if (ctx.dryRun) return;

	for (const group of groups) {
		const ratePlanId = buildRatePlanId(group);

		for (const tier of group.tiers) {
			await ctx.prisma.v2RatePlanTier.upsert({
				where: {
					ratePlanId_fromUnit: {
						ratePlanId,
						fromUnit: tier.fromUnit,
					},
				},
				create: {
					id: tier.id,
					tenantId: group.tenantId,
					ratePlanId,
					fromUnit: tier.fromUnit,
					toUnit: tier.toUnit,
					pricePerUnit: tier.pricePerUnit,
					createdAt: tier.createdAt,
					updatedAt: tier.updatedAt,
				},
				update: {
					toUnit: tier.toUnit,
					pricePerUnit: tier.pricePerUnit,
					updatedAt: tier.updatedAt,
				},
			});
		}
	}
}

async function migrateRentalOfferPricings(
	ctx: TenantV2MigrationContext,
	groups: LegacyPricingGroup[],
) {
	ctx.log(`Migrating rental offer pricings from pricing groups: ${groups.length}`);

	if (ctx.dryRun) return;

	for (const group of groups) {
		const branches = group.locationId
			? await ctx.prisma.v2Branch.findMany({
					where: {
						id: group.locationId,
						tenantId: ctx.v2TenantId,
					},
				})
			: await ctx.prisma.v2Branch.findMany({
					where: {
						tenantId: ctx.v2TenantId,
					},
				});

		if (branches.length === 0) {
			ctx.log("Skipping pricing group without matching V2 branch", {
				groupKey: group.key,
				locationId: group.locationId,
			});
			continue;
		}

		for (const branch of branches) {
			const rentalOffer = await ctx.prisma.v2RentalOffer.findUnique({
				where: {
					tenantId_branchId_rentableItemId: {
						tenantId: ctx.v2TenantId,
						branchId: branch.id,
						rentableItemId: group.rentableItemId,
					},
				},
			});

			if (!rentalOffer) {
				ctx.log("Skipping pricing group without matching rental offer", {
					groupKey: group.key,
					branchId: branch.id,
					rentableItemId: group.rentableItemId,
				});
				continue;
			}

			const existing = await ctx.prisma.v2RentalOfferPricing.findUnique({
				where: {
					catalogRentalOfferId: rentalOffer.id,
				},
			});

			const ratePlanId = buildRatePlanId(group);

			if (existing) {
				await ctx.prisma.v2RentalOfferPricing.update({
					where: { id: existing.id },
					data: {
						ratePlanId,
						isActive: true,
						deletedAt: null,
						updatedAt: getLatestUpdatedAt(group),
					},
				});

				continue;
			}

			await ctx.prisma.v2RentalOfferPricing.create({
				data: {
					tenantId: ctx.v2TenantId,
					catalogRentalOfferId: rentalOffer.id,
					ratePlanId,
					isActive: true,
					deletedAt: null,
					createdAt: getEarliestCreatedAt(group),
					updatedAt: getLatestUpdatedAt(group),
				},
			});
		}
	}
}


const MIGRATION_NAMESPACE = "a45fc5e2-ec5e-4d89-8cb8-c35c66d4f830";

function buildRatePlanId(group: LegacyPricingGroup): string {
	return uuidv5(
		`legacy-rate-plan:${group.sourceKind}:${group.sourceId}:location:${group.locationId ?? "global"}`,
		MIGRATION_NAMESPACE,
	);
}

function buildRatePlanName(input: {
	sourceName: string;
	locationName: string | null;
}): string {
	if (input.locationName) {
		return `${input.sourceName} · ${input.locationName}`;
	}

	return `${input.sourceName} · General`;
}

function mapLegacyBillingUnitToV2(input: {
	label: string;
	durationMinutes: number;
}): V2BillingUnit {
	const label = input.label.trim().toLowerCase();

	if (
		label.includes("hora") ||
		label.includes("hour") ||
		input.durationMinutes === 60
	) {
		return V2BillingUnit.HOUR;
	}

	if (
		label.includes("día") ||
		label.includes("dia") ||
		label.includes("day") ||
		input.durationMinutes === 1440
	) {
		return V2BillingUnit.DAY;
	}

	if (
		label.includes("semana") ||
		label.includes("week") ||
		input.durationMinutes === 10080
	) {
		return V2BillingUnit.WEEK;
	}

	throw new Error(
		`Unsupported legacy billing unit: ${input.label} (${input.durationMinutes} minutes)`,
	);
}

function getEarliestCreatedAt(group: LegacyPricingGroup): Date {
	return group.tiers.reduce((earliest, tier) => {
		return tier.createdAt < earliest ? tier.createdAt : earliest;
	}, group.tiers[0]?.createdAt ?? new Date());
}

function getLatestUpdatedAt(group: LegacyPricingGroup): Date {
	return group.tiers.reduce((latest, tier) => {
		return tier.updatedAt > latest ? tier.updatedAt : latest;
	}, group.tiers[0]?.updatedAt ?? new Date());
}

function resolveCurrencyFromTenantConfig(
	ctx: TenantV2MigrationContext,
	fallback: string,
): string {
	// For now we use fallback because this function does not have tenant config loaded.
	// If you want, we can load tenant config once in buildLegacyPricingGroups and pass currency into each group.
	return fallback;
}
