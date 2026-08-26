import {
	OrderItemType,
	PrismaClient,
	V2RentableItemKind,
	V2RentableItemStatus,
} from "../../../generated/prisma/client";

export type TenantV2MigrationContext = {
	prisma: PrismaClient;
	legacyTenantId: string;
	v2TenantId: string;
	dryRun: boolean;
	now: Date;
	log: (message: string, data?: unknown) => void;
};

export async function assertNoHistoricalRentalsReferenceOmittedCatalogItems(
	ctx: TenantV2MigrationContext,
) {
	const affectedOrderItems = await ctx.prisma.orderItem.findMany({
		where: {
			order: { tenantId: ctx.legacyTenantId, deletedAt: null },
			OR: [
				{
					type: OrderItemType.PRODUCT,
					productType: {
						OR: [{ deletedAt: { not: null } }, { retiredAt: { not: null } }],
					},
				},
				{
					type: OrderItemType.BUNDLE,
					bundle: {
						OR: [
							{ retiredAt: { not: null } },
							{
								components: {
									some: {
										productType: {
											OR: [
												{ deletedAt: { not: null } },
												{ retiredAt: { not: null } },
											],
										},
									},
								},
							},
						],
					},
				},
			],
		},
		select: { id: true, type: true, orderId: true, productTypeId: true, bundleId: true },
	});

	if (affectedOrderItems.length === 0) return;

	ctx.log("Historical rentals reference catalog items omitted by V2 migration", {
		affectedOrderItems: affectedOrderItems.length,
		examples: affectedOrderItems.slice(0, 10),
	});

	throw new Error(
		`Cannot migrate tenant: ${affectedOrderItems.length} non-deleted order item(s) reference retired or deleted catalog items.`,
	);
}

export async function migrateCatalogStage(ctx: TenantV2MigrationContext) {
	ctx.log("Starting Stage 3: Rental Catalog");

	await migrateSingleRentableItems(ctx);
	await migrateSingleRentableItemRequirements(ctx);
	await migrateBundleRentableItems(ctx);
	await migrateBundleRentableItemRequirements(ctx);
	await migrateRentalOffers(ctx);

	ctx.log("Finished Stage 3: Rental Catalog");
}

export async function migrateCategoriesStage(ctx: TenantV2MigrationContext) {
	ctx.log("Starting Stage 1.5: Shared Categories");
	const categories = await ctx.prisma.productCategory.findMany({
		where: { tenantId: ctx.legacyTenantId },
		orderBy: { createdAt: "asc" },
	});

	ctx.log(`Migrating shared categories: ${categories.length}`);

	if (ctx.dryRun) return;

	let sortOrder = 0;

	for (const category of categories) {
		await ctx.prisma.v2Category.upsert({
			where: { id: category.id },
			create: {
				id: category.id,
				tenantId: category.tenantId,
				name: category.name,
				slug: slugify(category.name),
				sortOrder: sortOrder++,
				isActive: true,
				deletedAt: null,
				createdAt: category.createdAt,
				updatedAt: category.updatedAt,
			},
			update: {
				name: category.name,
				slug: slugify(category.name),
				sortOrder: sortOrder++,
				isActive: true,
				deletedAt: null,
				updatedAt: category.updatedAt,
			},
		});
	}

	ctx.log("Finished Stage 1.5: Shared Categories");
}

async function migrateSingleRentableItems(ctx: TenantV2MigrationContext) {
	const productTypes = await ctx.prisma.productType.findMany({
		where: { tenantId: ctx.legacyTenantId },
	});

	ctx.log(`Migrating single rentable items from product types: ${productTypes.length}`);

	if (ctx.dryRun) return;

	for (const productType of productTypes) {
		if (!isEligibleProductType(productType)) continue;

		await ctx.prisma.v2RentableItem.upsert({
			where: { id: productType.id },
			create: {
				id: productType.id,
				tenantId: productType.tenantId,
				name: productType.name,
				description: productType.description,
				imageUrl: productType.imageUrl,
				categoryId: productType.categoryId,
				kind: V2RentableItemKind.SINGLE,
				status: mapProductTypeStatus(productType),
				createdAt: productType.createdAt,
				updatedAt: productType.updatedAt,
			},
			update: {
				name: productType.name,
				description: productType.description,
				imageUrl: productType.imageUrl,
				categoryId: productType.categoryId,
				status: mapProductTypeStatus(productType),
				updatedAt: productType.updatedAt,
			},
		});
	}
}

async function migrateSingleRentableItemRequirements(
	ctx: TenantV2MigrationContext,
) {
	const productTypes = await ctx.prisma.productType.findMany({
		where: { tenantId: ctx.legacyTenantId },
	});

	ctx.log(
		`Migrating single rentable item requirements: ${productTypes.length}`,
	);

	if (ctx.dryRun) return;

	for (const productType of productTypes) {
		if (!isEligibleProductType(productType)) continue;

		await ctx.prisma.v2RentableItemRequirement.upsert({
			where: {
				rentableItemId_equipmentTypeId: {
					rentableItemId: productType.id,
					equipmentTypeId: productType.id,
				},
			},
			create: {
				tenantId: productType.tenantId,
				rentableItemId: productType.id,
				equipmentTypeId: productType.id,
				quantityPerItem: 1,
				createdAt: productType.createdAt,
				updatedAt: productType.updatedAt,
			},
			update: {
				quantityPerItem: 1,
				updatedAt: productType.updatedAt,
			},
		});
	}
}

async function migrateBundleRentableItems(ctx: TenantV2MigrationContext) {
	const bundles = await ctx.prisma.bundle.findMany({
		where: { tenantId: ctx.legacyTenantId },
		include: { components: { include: { productType: true } } },
	});

	ctx.log(`Migrating bundle rentable items: ${bundles.length}`);

	if (ctx.dryRun) return;

	for (const bundle of bundles) {
		if (!isEligibleBundle(bundle)) continue;

		await ctx.prisma.v2RentableItem.upsert({
			where: { id: bundle.id },
			create: {
				id: bundle.id,
				tenantId: bundle.tenantId,
				name: bundle.name,
				description: bundle.description,
				imageUrl: bundle.imageUrl,
				categoryId: null,
				kind: V2RentableItemKind.PACKAGE,
				status: mapBundleStatus(bundle),
				createdAt: bundle.createdAt,
				updatedAt: bundle.updatedAt,
			},
			update: {
				name: bundle.name,
				description: bundle.description,
				imageUrl: bundle.imageUrl,
				categoryId: null,
				status: mapBundleStatus(bundle),
				updatedAt: bundle.updatedAt,
			},
		});
	}
}

async function migrateBundleRentableItemRequirements(
	ctx: TenantV2MigrationContext,
) {
	const bundleComponents = await ctx.prisma.bundleComponent.findMany({
		where: {
			bundle: {
				tenantId: ctx.legacyTenantId,
			},
		},
		include: {
			bundle: { include: { components: { include: { productType: true } } } },
			productType: true,
		},
	});

	ctx.log(
		`Migrating bundle rentable item requirements: ${bundleComponents.length}`,
	);

	if (ctx.dryRun) return;

	for (const component of bundleComponents) {
		if (!isEligibleBundle(component.bundle) || !isEligibleProductType(component.productType)) continue;

		await ctx.prisma.v2RentableItemRequirement.upsert({
			where: {
				rentableItemId_equipmentTypeId: {
					rentableItemId: component.bundleId,
					equipmentTypeId: component.productTypeId,
				},
			},
			create: {
				tenantId: component.bundle.tenantId,
				rentableItemId: component.bundleId,
				equipmentTypeId: component.productTypeId,
				quantityPerItem: component.quantity,
				createdAt: component.bundle.createdAt,
				updatedAt: component.bundle.updatedAt,
			},
			update: {
				quantityPerItem: component.quantity,
				updatedAt: component.bundle.updatedAt,
			},
		});
	}
}

async function migrateRentalOffers(ctx: TenantV2MigrationContext) {
	const branches = await ctx.prisma.v2Branch.findMany({
		where: { tenantId: ctx.v2TenantId },
	});

	if (ctx.dryRun) {
		const [productTypesCount, bundlesCount] = await Promise.all([
			ctx.prisma.productType.count({
				where: { tenantId: ctx.legacyTenantId },
			}),
			ctx.prisma.bundle.count({
				where: { tenantId: ctx.legacyTenantId },
			}),
		]);

		const rentableItemsCount = productTypesCount + bundlesCount;

		ctx.log("Migrating rental offers", {
			branches: branches.length,
			rentableItems: rentableItemsCount,
			offers: branches.length * rentableItemsCount,
		});

		return;
	}

	const [rentableItems, productTypes, bundles] = await Promise.all([
		ctx.prisma.v2RentableItem.findMany({
			where: { tenantId: ctx.v2TenantId },
		}),
		ctx.prisma.productType.findMany({
			where: { tenantId: ctx.legacyTenantId },
			select: { id: true, publishedAt: true },
		}),
		ctx.prisma.bundle.findMany({
			where: { tenantId: ctx.legacyTenantId },
			select: { id: true, publishedAt: true },
		}),
	]);
	const publishedAtByRentableItemId = new Map([
		...productTypes.map((productType) => [productType.id, productType.publishedAt] as const),
		...bundles.map((bundle) => [bundle.id, bundle.publishedAt] as const),
	]);

	ctx.log("Migrating rental offers", {
		branches: branches.length,
		rentableItems: rentableItems.length,
		offers: branches.length * rentableItems.length,
	});

	for (const branch of branches) {
		for (const item of rentableItems) {
			const isAvailableForCatalog =
				item.status === V2RentableItemStatus.ACTIVE;
			const publishedAt = publishedAtByRentableItemId.get(item.id) ?? null;

			const existingOffer = await ctx.prisma.v2RentalOffer.findUnique({
				where: {
					tenantId_branchId_rentableItemId: {
						tenantId: item.tenantId,
						branchId: branch.id,
						rentableItemId: item.id,
					},
				},
			});

			if (existingOffer) {
				await ctx.prisma.v2RentalOffer.update({
					where: { id: existingOffer.id },
					data: {
						isVisible: isAvailableForCatalog,
						isRentable: isAvailableForCatalog,
						publishedAt,
						updatedAt: item.updatedAt,
					},
				});

				continue;
			}

			await ctx.prisma.v2RentalOffer.create({
				data: {
					tenantId: item.tenantId,
					branchId: branch.id,
					rentableItemId: item.id,
					isVisible: isAvailableForCatalog,
					isRentable: isAvailableForCatalog,
					publishedAt,
					createdAt: item.createdAt,
					updatedAt: item.updatedAt,
				},
			});
		}
	}
}

function isEligibleProductType(productType: {
	retiredAt: Date | null;
	deletedAt: Date | null;
}): boolean {
	return !productType.deletedAt && !productType.retiredAt;
}

function isEligibleBundle(bundle: {
	retiredAt: Date | null;
	components?: Array<{ productType: { deletedAt: Date | null; retiredAt: Date | null } }>;
}): boolean {
	return !bundle.retiredAt && (bundle.components?.every((component) => isEligibleProductType(component.productType)) ?? true);
}

function mapProductTypeStatus(productType: {
	publishedAt: Date | null;
	retiredAt: Date | null;
	deletedAt: Date | null;
}): V2RentableItemStatus {
	if (productType.deletedAt || productType.retiredAt) {
		return V2RentableItemStatus.ARCHIVED;
	}

	if (productType.publishedAt) {
		return V2RentableItemStatus.ACTIVE;
	}

	return V2RentableItemStatus.DRAFT;
}

function mapBundleStatus(bundle: {
	publishedAt: Date | null;
	retiredAt: Date | null;
}): V2RentableItemStatus {
	if (bundle.retiredAt) {
		return V2RentableItemStatus.ARCHIVED;
	}

	if (bundle.publishedAt) {
		return V2RentableItemStatus.ACTIVE;
	}

	return V2RentableItemStatus.DRAFT;
}

function slugify(value: string): string {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}
