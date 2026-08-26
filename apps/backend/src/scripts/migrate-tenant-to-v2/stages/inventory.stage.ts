import {
	ContractBasis,
	PrismaClient,
	V2AssetStatus,
	V2OwnerContractBasis,
	V2RentalAssetOwnershipKind,
} from "../../../generated/prisma/client";

export type TenantV2MigrationContext = {
	prisma: PrismaClient;
	legacyTenantId: string;
	v2TenantId: string;
	dryRun: boolean;
	now: Date;
	log: (message: string, data?: unknown) => void;
};

export async function migrateInventoryStage(ctx: TenantV2MigrationContext) {
	ctx.log("Starting Stage 2: Asset Inventory");

	await migrateAssetOwners(ctx);
	await migrateEquipmentTypes(ctx);
	await migrateAssets(ctx);
	await migrateOwnerContracts(ctx);
	await migrateEquipmentTypeAccessoryDefaults(ctx);
	await migrateRentalAssetCandidates(ctx);

	ctx.log("Finished Stage 2: Asset Inventory");
}

async function migrateAssetOwners(ctx: TenantV2MigrationContext) {
	const owners = await ctx.prisma.owner.findMany({
		where: { tenantId: ctx.legacyTenantId },
	});

	ctx.log(`Migrating asset owners: ${owners.length}`);

	if (ctx.dryRun) return;

	for (const owner of owners) {
		await ctx.prisma.v2AssetOwner.upsert({
			where: { id: owner.id },
			create: {
				id: owner.id,
				tenantId: owner.tenantId,
				name: owner.name,
				contactInfo: {
					email: owner.email,
					phone: owner.phone,
					notes: owner.notes,
					legacyIsActive: owner.isActive,
					migratedFromLegacy: true,
				},
				createdAt: owner.createdAt,
				updatedAt: owner.updatedAt,
			},
			update: {
				name: owner.name,
				contactInfo: {
					email: owner.email,
					phone: owner.phone,
					notes: owner.notes,
					legacyIsActive: owner.isActive,
					migratedFromLegacy: true,
				},
				updatedAt: owner.updatedAt,
			},
		});
	}
}

async function migrateEquipmentTypes(ctx: TenantV2MigrationContext) {
	const productTypes = await ctx.prisma.productType.findMany({
		where: { tenantId: ctx.legacyTenantId },
	});

	ctx.log(`Migrating equipment types from product types: ${productTypes.length}`);

	if (ctx.dryRun) return;

	for (const productType of productTypes) {
		if (productType.deletedAt || productType.retiredAt) continue;

		await ctx.prisma.v2EquipmentType.upsert({
			where: { id: productType.id },
			create: {
				id: productType.id,
				tenantId: productType.tenantId,
				name: productType.name,
				description: productType.description,
				imageUrl: productType.imageUrl,
				categoryId: productType.categoryId,
				createdAt: productType.createdAt,
				updatedAt: productType.updatedAt,
			},
			update: {
				name: productType.name,
				description: productType.description,
				imageUrl: productType.imageUrl,
				categoryId: productType.categoryId,
				updatedAt: productType.updatedAt,
			},
		});
	}
}

async function migrateAssets(ctx: TenantV2MigrationContext) {
	const assets = await ctx.prisma.asset.findMany({
		where: {
			location: {
				tenantId: ctx.legacyTenantId,
			},
		},
		include: { productType: true },
	});

	ctx.log(`Migrating assets: ${assets.length}`);

	if (ctx.dryRun) return;

	for (const asset of assets) {
		if (asset.deletedAt || asset.productType.deletedAt || asset.productType.retiredAt) continue;

		await ctx.prisma.v2Asset.upsert({
			where: { id: asset.id },
			create: {
				id: asset.id,
				tenantId: ctx.v2TenantId,
				branchId: asset.locationId,
				equipmentTypeId: asset.productTypeId,
				ownerId: asset.ownerId,
				serialNumber: asset.serialNumber,
				notes: asset.notes,
				status: mapLegacyAssetStatus(asset),
				createdAt: asset.createdAt,
				updatedAt: asset.updatedAt,
			},
			update: {
				branchId: asset.locationId,
				equipmentTypeId: asset.productTypeId,
				ownerId: asset.ownerId,
				serialNumber: asset.serialNumber,
				notes: asset.notes,
				status: mapLegacyAssetStatus(asset),
				updatedAt: asset.updatedAt,
			},
		});
	}
}

function mapLegacyAssetStatus(asset: {
	isActive: boolean;
	deletedAt: Date | null;
}): V2AssetStatus {
	if (asset.deletedAt) return V2AssetStatus.RETIRED;
	if (!asset.isActive) return V2AssetStatus.INACTIVE;
	return V2AssetStatus.ACTIVE;
}

async function migrateOwnerContracts(ctx: TenantV2MigrationContext) {
	const contracts = await ctx.prisma.ownerContract.findMany({
		where: { tenantId: ctx.legacyTenantId },
		include: { asset: { include: { productType: true } } },
	});

	ctx.log(`Migrating owner contracts: ${contracts.length}`);

	if (ctx.dryRun) return;

	for (const contract of contracts) {
		if (contract.asset?.deletedAt || contract.asset?.productType.deletedAt || contract.asset?.productType.retiredAt) continue;

		await ctx.prisma.v2OwnerContract.upsert({
			where: { id: contract.id },
			create: {
				id: contract.id,
				tenantId: contract.tenantId,
				ownerId: contract.ownerId,
				assetId: contract.assetId,
				terms: {
					notes: contract.notes,
					legacyIsActive: contract.isActive,
					legacyBasis: contract.basis,
					migratedFromLegacy: true,
				},
				basis: mapOwnerContractBasis(contract.basis),
				ownerShare: contract.ownerShare,
				rentalShare: contract.rentalShare,
				validFrom: contract.validFrom,
				validTo: contract.validUntil,
				createdAt: contract.createdAt,
				updatedAt: contract.updatedAt,
			},
			update: {
				ownerId: contract.ownerId,
				assetId: contract.assetId,
				terms: {
					notes: contract.notes,
					legacyIsActive: contract.isActive,
					legacyBasis: contract.basis,
					migratedFromLegacy: true,
				},
				basis: mapOwnerContractBasis(contract.basis),
				ownerShare: contract.ownerShare,
				rentalShare: contract.rentalShare,
				validFrom: contract.validFrom,
				validTo: contract.validUntil,
				updatedAt: contract.updatedAt,
			},
		});
	}
}

function mapOwnerContractBasis(basis: ContractBasis): V2OwnerContractBasis {
	switch (basis) {
		case ContractBasis.NET_COLLECTED:
			return V2OwnerContractBasis.NET;
		default:
			throw new Error(`Unsupported owner contract basis: ${basis}`);
	}
}

async function migrateEquipmentTypeAccessoryDefaults(
	ctx: TenantV2MigrationContext,
) {
	const accessoryLinks = await ctx.prisma.accessoryLink.findMany({
		where: { tenantId: ctx.legacyTenantId },
		include: { primaryRentalItem: true, accessoryRentalItem: true },
	});

	const defaultLinks = accessoryLinks.filter((link) => link.isDefaultIncluded);
	const skippedOptionalLinks = accessoryLinks.length - defaultLinks.length;

	ctx.log("Migrating equipment accessory defaults", {
		totalAccessoryLinks: accessoryLinks.length,
		defaultIncluded: defaultLinks.length,
		skippedOptional: skippedOptionalLinks,
	});

	if (ctx.dryRun) return;

	for (const link of defaultLinks) {
		if (
			link.primaryRentalItem.deletedAt ||
			link.primaryRentalItem.retiredAt ||
			link.accessoryRentalItem.deletedAt ||
			link.accessoryRentalItem.retiredAt
		) continue;

		if (link.defaultQuantity <= 0) {
			ctx.log("Skipping accessory link with invalid quantity", {
				accessoryLinkId: link.id,
				defaultQuantity: link.defaultQuantity,
			});
			continue;
		}

		if (link.primaryRentalItemId === link.accessoryRentalItemId) {
			ctx.log("Skipping accessory link with self-reference", {
				accessoryLinkId: link.id,
				productTypeId: link.primaryRentalItemId,
			});
			continue;
		}

		await ctx.prisma.v2EquipmentTypeAccessoryDefault.upsert({
			where: {
				tenantId_equipmentTypeId_accessoryEquipmentTypeId: {
					tenantId: link.tenantId,
					equipmentTypeId: link.primaryRentalItemId,
					accessoryEquipmentTypeId: link.accessoryRentalItemId,
				},
			},
			create: {
				id: link.id,
				tenantId: link.tenantId,
				equipmentTypeId: link.primaryRentalItemId,
				accessoryEquipmentTypeId: link.accessoryRentalItemId,
				quantity: link.defaultQuantity,
				createdAt: link.createdAt,
				updatedAt: link.updatedAt,
			},
			update: {
				quantity: link.defaultQuantity,
				updatedAt: link.updatedAt,
			},
		});
	}
}

async function migrateRentalAssetCandidates(ctx: TenantV2MigrationContext) {
	if (ctx.dryRun) {
		const legacyAssetsCount = await ctx.prisma.asset.count({
			where: {
				location: {
					tenantId: ctx.legacyTenantId,
				},
			},
		});

		ctx.log(`Migrating rental asset candidates: ${legacyAssetsCount}`);
		return;
	}

	const assets = await ctx.prisma.v2Asset.findMany({
		where: { tenantId: ctx.v2TenantId },
	});

	ctx.log(`Migrating rental asset candidates: ${assets.length}`);

	for (const asset of assets) {
		const ownerContractSnapshot = asset.ownerId
			? await buildOwnerContractSnapshot(ctx, {
					tenantId: asset.tenantId,
					ownerId: asset.ownerId,
					assetId: asset.id,
				})
			: null;


		await ctx.prisma.v2RentalAssetCandidate.upsert({
			where: {
				tenantId_assetId: {
					tenantId: asset.tenantId,
					assetId: asset.id,
				},
			},
			create: {
				tenantId: asset.tenantId,
				assetId: asset.id,
				branchId: asset.branchId,
				equipmentTypeId: asset.equipmentTypeId,
				assetStatus: asset.status,
				ownershipKind: asset.ownerId
					? V2RentalAssetOwnershipKind.THIRD_PARTY
					: V2RentalAssetOwnershipKind.TENANT_OWNED,
				ownerId: asset.ownerId,
				ownerContractSnapshot,
				projectedAt: ctx.now,
				sourceVersion: "legacy-v2-migration",
			},
			update: {
				branchId: asset.branchId,
				equipmentTypeId: asset.equipmentTypeId,
				assetStatus: asset.status,
				ownershipKind: asset.ownerId
					? V2RentalAssetOwnershipKind.THIRD_PARTY
					: V2RentalAssetOwnershipKind.TENANT_OWNED,
				ownerId: asset.ownerId,
				ownerContractSnapshot,
				projectedAt: ctx.now,
				sourceVersion: "legacy-v2-migration",
			},
		});

		if (asset.ownerId && !ownerContractSnapshot) {
			ctx.log("Third-party asset has no valid owner contract snapshot", {
				assetId: asset.id,
				ownerId: asset.ownerId,
			});
		}
	}
}

async function buildOwnerContractSnapshot(
	ctx: TenantV2MigrationContext,
	input: {
		tenantId: string;
		ownerId: string;
		assetId: string;
	},
) {
	const assetSpecificContract = await ctx.prisma.v2OwnerContract.findFirst({
		where: {
			tenantId: input.tenantId,
			ownerId: input.ownerId,
			assetId: input.assetId,
			validFrom: { lte: ctx.now },
			OR: [{ validTo: null }, { validTo: { gte: ctx.now } }],
		},
		orderBy: { validFrom: "desc" },
	});

	const ownerDefaultContract = assetSpecificContract
		? null
		: await ctx.prisma.v2OwnerContract.findFirst({
				where: {
					tenantId: input.tenantId,
					ownerId: input.ownerId,
					assetId: null,
					validFrom: { lte: ctx.now },
					OR: [{ validTo: null }, { validTo: { gte: ctx.now } }],
				},
				orderBy: { validFrom: "desc" },
			});

	const contract = assetSpecificContract ?? ownerDefaultContract;

	if (!contract) return null;

	return {
		ownerId: contract.ownerId,
		contractId: contract.id,
		ownerShare: contract.ownerShare.toString(),
		rentalShare: contract.rentalShare.toString(),
		basis: contract.basis,
		validFrom: contract.validFrom.toISOString(),
		validTo: contract.validTo?.toISOString() ?? null,
		migratedFromLegacy: true,
	};
}
