import {
	AssignmentType,
	ContractBasis,
	OrderItemType,
	OrderStatus,
	Prisma,
	PrismaClient,
	V2AssetBlockType,
	V2FulfillmentMethod,
	V2OwnerContractBasis,
	V2RentalSource,
	V2RentalStatus,
	V2RentableItemKind,
} from "../../../generated/prisma/client";
import { v5 as uuidv5 } from "uuid";

const MIGRATION_UUID_NAMESPACE = "a45fc5e2-ec5e-4d89-8cb8-c35c66d4f830";

export type TenantV2MigrationContext = {
	prisma: PrismaClient;
	legacyTenantId: string;
	v2TenantId: string;
	dryRun: boolean;
	now: Date;
	log: (message: string, data?: unknown) => void;
};

export async function migrateRentalCommitmentStage(
	ctx: TenantV2MigrationContext,
) {
	ctx.log("Starting Stage 5A: Rental Commitment structure");

	await migrateRentals(ctx);
	await migrateRentalSelections(ctx);
	await migrateRentalDemandLines(ctx);
	await migrateRentalDeliveryDetails(ctx);

	ctx.log("Finished Stage 5A: Rental Commitment structure");

	ctx.log("Starting Stage 5B: Rental Commitment operational state");

	await migrateAssignedEquipmentAssets(ctx);
	await migrateEquipmentAssetBlocks(ctx);
	await migrateRentalAccessorySelections(ctx);
	await migrateRentalAccessoryAssetAssignments(ctx);
	await migrateAccessoryAssetBlocks(ctx);
	await migrateRentalOwnerSplits(ctx);

	ctx.log("Finished Stage 5B: Rental Commitment operational state");
}

async function migrateRentals(ctx: TenantV2MigrationContext) {
	const orders = await ctx.prisma.order.findMany({
		where: {
			tenantId: ctx.legacyTenantId,
			deletedAt: null,
		},
		orderBy: { createdAt: "asc" },
	});

	ctx.log(`Migrating rentals from orders: ${orders.length}`);

	if (ctx.dryRun) return;

	for (const order of orders) {
		const status = mapOrderStatusToV2(order.status);

		await ctx.prisma.v2Rental.upsert({
			where: { id: order.id },
			create: {
				id: order.id,
				tenantId: order.tenantId,
				branchId: order.locationId,
				customerId: order.customerId,

				status,
				fulfillmentMethod: mapFulfillmentMethod(order.fulfillmentMethod),
				notes: order.notes,
				insuranceSelected: order.insuranceSelected,
				bookingSnapshot: order.bookingSnapshot,
				priceSnapshot: order.financialSnapshot,
				source: V2RentalSource.FORMAL,

				periodStart: order.periodStart,
				periodEnd: order.periodEnd,

				createdAt: order.createdAt,
				updatedAt: order.updatedAt,
				confirmedAt: getConfirmedAt(order),
				cancelledAt: getCancelledAt(order),
			},
			update: {
				branchId: order.locationId,
				customerId: order.customerId,

				status,
				fulfillmentMethod: mapFulfillmentMethod(order.fulfillmentMethod),
				notes: order.notes,
				insuranceSelected: order.insuranceSelected,
				bookingSnapshot: order.bookingSnapshot,
				priceSnapshot: order.financialSnapshot,
				source: V2RentalSource.FORMAL,

				periodStart: order.periodStart,
				periodEnd: order.periodEnd,

				updatedAt: order.updatedAt,
				confirmedAt: getConfirmedAt(order),
				cancelledAt: getCancelledAt(order),
			},
		});
	}
}

async function migrateRentalSelections(ctx: TenantV2MigrationContext) {
	const orderItems = await ctx.prisma.orderItem.findMany({
		where: {
			order: {
				tenantId: ctx.legacyTenantId,
				deletedAt: null,
			},
		},
		include: {
			order: true,
			productType: true,
			bundle: true,
		},
		orderBy: { createdAt: "asc" },
	});

	ctx.log(`Migrating rental selections from order items: ${orderItems.length}`);

	if (ctx.dryRun) return;

	for (const orderItem of orderItems) {
		const rentableItemId = getOrderItemRentableItemId(orderItem);
		const rentableItemName = getOrderItemRentableItemName(orderItem);
		const rentableItemKind = mapOrderItemTypeToRentableItemKind(orderItem.type);

		const rentalOffer = await ctx.prisma.v2RentalOffer.findFirst({
			where: {
				tenantId: orderItem.order.tenantId,
				branchId: orderItem.order.locationId,
				rentableItemId,
				deletedAt: null,
			},
		});

		if (!rentalOffer) {
			throw new Error(
				`Missing V2RentalOffer for orderItem=${orderItem.id}, branch=${orderItem.order.locationId}, rentableItem=${rentableItemId}`,
			);
		}

		await ctx.prisma.v2RentalSelection.upsert({
			where: { id: orderItem.id },
			create: {
				id: orderItem.id,
				tenantId: orderItem.order.tenantId,
				rentalId: orderItem.orderId,
				rentalOfferId: rentalOffer.id,
				rentableItemId,
				rentableItemNameSnapshot: rentableItemName,
				rentableItemKindSnapshot: rentableItemKind,
				quantity: 1,
				priceSnapshot: orderItem.priceSnapshot,
				createdAt: orderItem.createdAt,
			},
			update: {
				rentalOfferId: rentalOffer.id,
				rentableItemId,
				rentableItemNameSnapshot: rentableItemName,
				rentableItemKindSnapshot: rentableItemKind,
				quantity: 1,
				priceSnapshot: orderItem.priceSnapshot,
			},
		});
	}
}

async function migrateRentalDemandLines(ctx: TenantV2MigrationContext) {
	const orderItems = await ctx.prisma.orderItem.findMany({
		where: {
			order: {
				tenantId: ctx.legacyTenantId,
				deletedAt: null,
			},
		},
		include: {
			order: true,
			productType: true,
			bundle: {
				include: {
					components: {
						include: {
							productType: true,
						},
					},
				},
			},
		},
		orderBy: { createdAt: "asc" },
	});

	const demandLineCount = orderItems.reduce((count, orderItem) => {
		if (orderItem.type === OrderItemType.PRODUCT) return count + 1;
		return count + (orderItem.bundle?.components.length ?? 0);
	}, 0);

	ctx.log(`Migrating rental demand lines: ${demandLineCount}`);

	if (ctx.dryRun) return;

	for (const orderItem of orderItems) {
		if (orderItem.type === OrderItemType.PRODUCT) {
			if (!orderItem.productTypeId || !orderItem.productType) {
				throw new Error(`PRODUCT order item ${orderItem.id} is missing productType`);
			}

			const demandLineId = buildDemandLineId({
				orderItemId: orderItem.id,
				equipmentTypeId: orderItem.productTypeId,
			});

			await ctx.prisma.v2RentalDemandLine.upsert({
				where: { id: demandLineId },
				create: {
					id: demandLineId,
					tenantId: orderItem.order.tenantId,
					rentalId: orderItem.orderId,
					rentalSelectionId: orderItem.id,
					equipmentTypeId: orderItem.productTypeId,
					equipmentTypeNameSnapshot: orderItem.productType.name,
					quantity: 1,
					createdAt: orderItem.createdAt,
				},
				update: {
					equipmentTypeId: orderItem.productTypeId,
					equipmentTypeNameSnapshot: orderItem.productType.name,
					quantity: 1,
				},
			});

			continue;
		}

		if (orderItem.type === OrderItemType.BUNDLE) {
			if (!orderItem.bundle) {
				throw new Error(`BUNDLE order item ${orderItem.id} is missing bundle`);
			}

			for (const component of orderItem.bundle.components) {
				const demandLineId = buildDemandLineId({
					orderItemId: orderItem.id,
					equipmentTypeId: component.productTypeId,
				});

				await ctx.prisma.v2RentalDemandLine.upsert({
					where: { id: demandLineId },
					create: {
						id: demandLineId,
						tenantId: orderItem.order.tenantId,
						rentalId: orderItem.orderId,
						rentalSelectionId: orderItem.id,
						equipmentTypeId: component.productTypeId,
						equipmentTypeNameSnapshot: component.productType.name,
						quantity: component.quantity,
						createdAt: orderItem.createdAt,
					},
					update: {
						equipmentTypeId: component.productTypeId,
						equipmentTypeNameSnapshot: component.productType.name,
						quantity: component.quantity,
					},
				});
			}
		}
	}
}

async function migrateRentalDeliveryDetails(ctx: TenantV2MigrationContext) {
	const deliveryRequests = await ctx.prisma.orderDeliveryRequest.findMany({
		where: {
			order: {
				tenantId: ctx.legacyTenantId,
				deletedAt: null,
			},
		},
		include: {
			order: true,
		},
		orderBy: { createdAt: "asc" },
	});

	ctx.log(`Migrating rental delivery details: ${deliveryRequests.length}`);

	if (ctx.dryRun) return;

	for (const deliveryRequest of deliveryRequests) {
		await ctx.prisma.v2RentalDeliveryDetails.upsert({
			where: { rentalOrderId: deliveryRequest.orderId },
			create: {
				id: deliveryRequest.id,
				tenantId: deliveryRequest.order.tenantId,
				rentalOrderId: deliveryRequest.orderId,

				addressLine1: deliveryRequest.addressLine1,
				addressLine2: deliveryRequest.addressLine2,
				city: deliveryRequest.city,
				state: deliveryRequest.stateRegion,
				postalCode: deliveryRequest.postalCode,
				country: deliveryRequest.country,

				contactName: deliveryRequest.recipientName,
				contactPhone: deliveryRequest.phone,
				notes: deliveryRequest.instructions,

				createdAt: deliveryRequest.createdAt,
				updatedAt: deliveryRequest.updatedAt,
			},
			update: {
				addressLine1: deliveryRequest.addressLine1,
				addressLine2: deliveryRequest.addressLine2,
				city: deliveryRequest.city,
				state: deliveryRequest.stateRegion,
				postalCode: deliveryRequest.postalCode,
				country: deliveryRequest.country,

				contactName: deliveryRequest.recipientName,
				contactPhone: deliveryRequest.phone,
				notes: deliveryRequest.instructions,

				updatedAt: deliveryRequest.updatedAt,
			},
		});
	}
}


function mapOrderStatusToV2(status: OrderStatus): V2RentalStatus {
	switch (status) {
		case OrderStatus.DRAFT:
			return V2RentalStatus.DRAFT;

		case OrderStatus.PENDING_REVIEW:
			return V2RentalStatus.PENDING;

		case OrderStatus.CONFIRMED:
		case OrderStatus.ACTIVE:
			return V2RentalStatus.CONFIRMED;

		case OrderStatus.COMPLETED:
			return V2RentalStatus.COMPLETED;

		case OrderStatus.CANCELLED:
		case OrderStatus.REJECTED:
		case OrderStatus.EXPIRED:
			return V2RentalStatus.CANCELLED;

		default:
			return V2RentalStatus.PENDING;
	}
}

function mapFulfillmentMethod(method: string): V2FulfillmentMethod {
	switch (method) {
		case "DELIVERY":
			return V2FulfillmentMethod.DELIVERY;
		case "PICKUP":
		default:
			return V2FulfillmentMethod.PICKUP;
	}
}

function getConfirmedAt(order: {
	status: OrderStatus;
	reviewedAt: Date | null;
	createdAt: Date;
}): Date | null {
	if (
		order.status === OrderStatus.CONFIRMED ||
		order.status === OrderStatus.ACTIVE ||
		order.status === OrderStatus.COMPLETED
	) {
		return order.reviewedAt ?? order.createdAt;
	}

	return null;
}

function getCancelledAt(order: {
	status: OrderStatus;
	deletedAt: Date | null;
	updatedAt: Date;
}): Date | null {
	if (order.deletedAt) return order.deletedAt;

	if (
		order.status === OrderStatus.CANCELLED ||
		order.status === OrderStatus.REJECTED ||
		order.status === OrderStatus.EXPIRED
	) {
		return order.updatedAt;
	}

	return null;
}

function getOrderItemRentableItemId(orderItem: {
	type: OrderItemType;
	productTypeId: string | null;
	bundleId: string | null;
}): string {
	if (orderItem.type === OrderItemType.PRODUCT) {
		if (!orderItem.productTypeId) {
			throw new Error("PRODUCT order item is missing productTypeId");
		}

		return orderItem.productTypeId;
	}

	if (!orderItem.bundleId) {
		throw new Error("BUNDLE order item is missing bundleId");
	}

	return orderItem.bundleId;
}

function getOrderItemRentableItemName(orderItem: {
	type: OrderItemType;
	productType: { name: string } | null;
	bundle: { name: string } | null;
}): string {
	if (orderItem.type === OrderItemType.PRODUCT) {
		if (!orderItem.productType) {
			throw new Error("PRODUCT order item is missing productType relation");
		}

		return orderItem.productType.name;
	}

	if (!orderItem.bundle) {
		throw new Error("BUNDLE order item is missing bundle relation");
	}

	return orderItem.bundle.name;
}

function mapOrderItemTypeToRentableItemKind(
	type: OrderItemType,
): V2RentableItemKind {
	switch (type) {
		case OrderItemType.PRODUCT:
			return V2RentableItemKind.SINGLE;
		case OrderItemType.BUNDLE:
			return V2RentableItemKind.BUNDLE;
	}
}

function buildDemandLineId(input: {
	orderItemId: string;
	equipmentTypeId: string;
}): string {
	return uuidv5(
		`legacy-demand-line:${input.orderItemId}:${input.equipmentTypeId}`,
		MIGRATION_UUID_NAMESPACE,
	);
}

// ---

async function migrateAssignedEquipmentAssets(ctx: TenantV2MigrationContext) {
	const assignments = await ctx.prisma.assetAssignment.findMany({
		where: {
			type: AssignmentType.ORDER,
			orderItemId: { not: null },
			orderItemAccessoryId: null,
			order: {
				tenantId: ctx.legacyTenantId,
				deletedAt: null,
			},
		},
		include: {
			asset: true,
			order: true,
			orderItem: true,
		},
		orderBy: { createdAt: "asc" },
	});

	ctx.log(`Migrating assigned equipment assets: ${assignments.length}`);

	if (ctx.dryRun) return;

	for (const assignment of assignments) {
		if (!assignment.order || !assignment.orderItem || !assignment.orderItemId) {
			ctx.log("Skipping equipment assignment with missing order/orderItem", {
				assignmentId: assignment.id,
			});
			continue;
		}

		const demandLineId = buildDemandLineId({
			orderItemId: assignment.orderItemId,
			equipmentTypeId: assignment.asset.productTypeId,
		});

		const demandLine = await ctx.prisma.v2RentalDemandLine.findUnique({
			where: { id: demandLineId },
		});

		if (!demandLine) {
			ctx.log("Skipping equipment assignment without matching demand line", {
				assignmentId: assignment.id,
				orderItemId: assignment.orderItemId,
				assetId: assignment.assetId,
				equipmentTypeId: assignment.asset.productTypeId,
				demandLineId,
			});
			continue;
		}

		await ctx.prisma.v2AssignedAsset.upsert({
			where: { id: assignment.id },
			create: {
				id: assignment.id,
				tenantId: assignment.order.tenantId,
				rentalId: assignment.order.id,
				rentalDemandLineId: demandLineId,
				assetId: assignment.assetId,
				createdAt: assignment.createdAt,
			},
			update: {
				tenantId: assignment.order.tenantId,
				rentalId: assignment.order.id,
				rentalDemandLineId: demandLineId,
				assetId: assignment.assetId,
			},
		});
	}
}

async function migrateEquipmentAssetBlocks(ctx: TenantV2MigrationContext) {
	const assignments = await ctx.prisma.assetAssignment.findMany({
		where: {
			type: AssignmentType.ORDER,
			orderItemId: { not: null },
			orderItemAccessoryId: null,
			order: {
				tenantId: ctx.legacyTenantId,
				deletedAt: null,
			},
		},
		include: {
			order: true,
		},
		orderBy: { createdAt: "asc" },
	});

	ctx.log(`Migrating equipment asset blocks: ${assignments.length}`);

	if (ctx.dryRun) return;

	for (const assignment of assignments) {
		if (!assignment.order) continue;

		await upsertAssetBlock(ctx, {
			id: buildAssetBlockId(assignment.id, "EQUIPMENT"),
			tenantId: assignment.order.tenantId,
			rentalId: assignment.order.id,
			assetId: assignment.assetId,
			blockType: V2AssetBlockType.EQUIPMENT,
			periodStart: assignment.order.periodStart,
			periodEnd: assignment.order.periodEnd,
			createdAt: assignment.createdAt,
			releasedAt: getReleasedAtForAssetBlock(assignment.order),
		});
	}
}

async function migrateRentalAccessorySelections(ctx: TenantV2MigrationContext) {
	const accessories = await ctx.prisma.orderItemAccessory.findMany({
		where: {
			order: {
				tenantId: ctx.legacyTenantId,
				deletedAt: null,
			},
		},
		include: {
			order: true,
			orderItem: true,
			accessoryRentalItem: true,
		},
		orderBy: { createdAt: "asc" },
	});

	ctx.log(`Migrating rental accessory selections: ${accessories.length}`);

	if (ctx.dryRun) return;

	for (const accessory of accessories) {
		const sourceDemandLineId =
			accessory.orderItem.type === OrderItemType.PRODUCT &&
			accessory.orderItem.productTypeId
				? buildDemandLineId({
						orderItemId: accessory.orderItemId,
						equipmentTypeId: accessory.orderItem.productTypeId,
					})
				: null;

		await ctx.prisma.v2RentalAccessorySelection.upsert({
			where: { id: accessory.id },
			create: {
				id: accessory.id,
				tenantId: accessory.tenantId,
				rentalOrderId: accessory.orderId,
				sourceRentalDemandLineId: sourceDemandLineId,
				equipmentTypeId: accessory.accessoryRentalItemId,
				equipmentTypeNameSnapshot: accessory.accessoryRentalItem.name,
				quantity: accessory.quantity,
				createdAt: accessory.createdAt,
				updatedAt: accessory.updatedAt,
			},
			update: {
				sourceRentalDemandLineId: sourceDemandLineId,
				equipmentTypeId: accessory.accessoryRentalItemId,
				equipmentTypeNameSnapshot: accessory.accessoryRentalItem.name,
				quantity: accessory.quantity,
				updatedAt: accessory.updatedAt,
			},
		});
	}
}

async function migrateRentalAccessoryAssetAssignments(
	ctx: TenantV2MigrationContext,
) {
	const assignments = await ctx.prisma.assetAssignment.findMany({
		where: {
			type: AssignmentType.ORDER,
			orderItemAccessoryId: { not: null },
			order: {
				tenantId: ctx.legacyTenantId,
				deletedAt: null,
			},
		},
		include: {
			order: true,
			orderItemAccessory: true,
		},
		orderBy: { createdAt: "asc" },
	});

	ctx.log(`Migrating accessory asset assignments: ${assignments.length}`);

	if (ctx.dryRun) return;

	for (const assignment of assignments) {
		if (
			!assignment.order ||
			!assignment.orderItemAccessory ||
			!assignment.orderItemAccessoryId
		) {
			ctx.log("Skipping accessory assignment with missing order/accessory", {
				assignmentId: assignment.id,
			});
			continue;
		}

		await ctx.prisma.v2RentalAccessoryAssetAssignment.upsert({
			where: { id: assignment.id },
			create: {
				id: assignment.id,
				tenantId: assignment.order.tenantId,
				rentalOrderId: assignment.order.id,
				rentalAccessorySelectionId: assignment.orderItemAccessoryId,
				assetId: assignment.assetId,
				createdAt: assignment.createdAt,
			},
			update: {
				tenantId: assignment.order.tenantId,
				rentalOrderId: assignment.order.id,
				rentalAccessorySelectionId: assignment.orderItemAccessoryId,
				assetId: assignment.assetId,
			},
		});
	}
}

async function migrateAccessoryAssetBlocks(ctx: TenantV2MigrationContext) {
	const assignments = await ctx.prisma.assetAssignment.findMany({
		where: {
			type: AssignmentType.ORDER,
			orderItemAccessoryId: { not: null },
			order: {
				tenantId: ctx.legacyTenantId,
				deletedAt: null,
			},
		},
		include: {
			order: true,
		},
		orderBy: { createdAt: "asc" },
	});

	ctx.log(`Migrating accessory asset blocks: ${assignments.length}`);

	if (ctx.dryRun) return;

	for (const assignment of assignments) {
		if (!assignment.order) continue;

		await upsertAssetBlock(ctx, {
			id: buildAssetBlockId(assignment.id, "ACCESSORY"),
			tenantId: assignment.order.tenantId,
			rentalId: assignment.order.id,
			assetId: assignment.assetId,
			blockType: V2AssetBlockType.ACCESSORY,
			periodStart: assignment.order.periodStart,
			periodEnd: assignment.order.periodEnd,
			createdAt: assignment.createdAt,
			releasedAt: getReleasedAtForAssetBlock(assignment.order),
		});
	}
}

async function migrateRentalOwnerSplits(ctx: TenantV2MigrationContext) {
	const splits = await ctx.prisma.orderItemOwnerSplit.findMany({
		where: {
			orderItem: {
				order: {
					tenantId: ctx.legacyTenantId,
					deletedAt: null,
				},
			},
		},
		include: {
			orderItem: {
				include: {
					order: true,
				},
			},
			asset: true,
		},
		orderBy: { createdAt: "asc" },
	});

	ctx.log(`Migrating rental owner splits: ${splits.length}`);

	if (ctx.dryRun) return;

	const currency = await getTenantCurrency(ctx);

	for (const split of splits) {
		const order = split.orderItem.order;

		const demandLineId = buildDemandLineId({
			orderItemId: split.orderItemId,
			equipmentTypeId: split.asset.productTypeId,
		});

		const assignedAsset = await ctx.prisma.v2AssignedAsset.findFirst({
			where: {
				rentalDemandLineId: demandLineId,
				assetId: split.assetId,
			},
		});

		if (!assignedAsset) {
			ctx.log("Skipping owner split without matching assigned asset", {
				splitId: split.id,
				orderItemId: split.orderItemId,
				assetId: split.assetId,
				demandLineId,
			});
			continue;
		}

		await ctx.prisma.v2RentalOwnerSplit.upsert({
			where: { id: split.id },
			create: {
				id: split.id,
				tenantId: order.tenantId,
				rentalId: order.id,
				rentalSelectionId: split.orderItemId,
				rentalDemandLineId: demandLineId,
				assignedAssetId: assignedAsset.id,
				assetId: split.assetId,
				ownerId: split.ownerId,
				contractId: split.contractId,
				basis: mapLegacyContractBasisToV2(split.basis),
				ownerShare: split.ownerShare,
				basisAmount: split.netAmount,
				ownerAmount: split.ownerAmount,
				currency,
				createdAt: split.createdAt,
				updatedAt: split.updatedAt,
			},
			update: {
				rentalId: order.id,
				rentalSelectionId: split.orderItemId,
				rentalDemandLineId: demandLineId,
				assignedAssetId: assignedAsset.id,
				assetId: split.assetId,
				ownerId: split.ownerId,
				contractId: split.contractId,
				basis: mapLegacyContractBasisToV2(split.basis),
				ownerShare: split.ownerShare,
				basisAmount: split.netAmount,
				ownerAmount: split.ownerAmount,
				currency,
				updatedAt: split.updatedAt,
			},
		});
	}
}

async function upsertAssetBlock(
	ctx: TenantV2MigrationContext,
	input: {
		id: string;
		tenantId: string;
		rentalId: string;
		assetId: string;
		blockType: V2AssetBlockType;
		periodStart: Date;
		periodEnd: Date;
		createdAt: Date;
		releasedAt: Date | null;
	},
) {
	await ctx.prisma.$executeRaw`
		INSERT INTO v2_asset_blocks (
			id,
			tenant_id,
			rental_id,
			asset_id,
			period,
			block_type,
			created_at,
			released_at
		)
		VALUES (
			${input.id},
			${input.tenantId},
			${input.rentalId},
			${input.assetId},
			tstzrange(${input.periodStart}, ${input.periodEnd}, '[)'),
			${input.blockType}::"V2AssetBlockType",
			${input.createdAt},
			${input.releasedAt}
		)
		ON CONFLICT (id)
		DO UPDATE SET
			tenant_id = EXCLUDED.tenant_id,
			rental_id = EXCLUDED.rental_id,
			asset_id = EXCLUDED.asset_id,
			period = EXCLUDED.period,
			block_type = EXCLUDED.block_type,
			created_at = EXCLUDED.created_at,
			released_at = EXCLUDED.released_at
	`;
}


function buildAssetBlockId(
	assetAssignmentId: string,
	type: "EQUIPMENT" | "ACCESSORY",
): string {
	return uuidv5(
		`legacy-asset-block:${type}:${assetAssignmentId}`,
		MIGRATION_UUID_NAMESPACE,
	);
}

function getReleasedAtForAssetBlock(order: {
	status: OrderStatus;
	updatedAt: Date;
	cancelledAt?: Date | null;
}): Date | null {
	if (
		order.status === OrderStatus.CONFIRMED ||
		order.status === OrderStatus.ACTIVE
	) {
		return null;
	}

	return order.updatedAt;
}

function mapLegacyContractBasisToV2(
	basis: ContractBasis,
): V2OwnerContractBasis {
	switch (basis) {
		case ContractBasis.NET_COLLECTED:
			return V2OwnerContractBasis.NET;
	}
}

async function getTenantCurrency(
	ctx: TenantV2MigrationContext,
): Promise<string> {
	const tenant = await ctx.prisma.tenant.findUnique({
		where: { id: ctx.legacyTenantId },
		select: { config: true },
	});

	const config = tenant?.config;

	if (
		config &&
		typeof config === "object" &&
		"pricing" in config &&
		config.pricing &&
		typeof config.pricing === "object" &&
		"currency" in config.pricing &&
		typeof config.pricing.currency === "string"
	) {
		return config.pricing.currency;
	}

	return "ARS";
}


// ----

export async function verifyRentalCommitmentStage(ctx: TenantV2MigrationContext) {
	const [
		rentals,
		selections,
		demandLines,
		deliveryDetails,
		assignedAssets,
		assetBlocks,
		activeAssetBlocks,
		accessorySelections,
		accessoryAssetAssignments,
		ownerSplits,
	] = await Promise.all([
		ctx.prisma.v2Rental.count({
			where: { tenantId: ctx.v2TenantId },
		}),
		ctx.prisma.v2RentalSelection.count({
			where: { tenantId: ctx.v2TenantId },
		}),
		ctx.prisma.v2RentalDemandLine.count({
			where: { tenantId: ctx.v2TenantId },
		}),
		ctx.prisma.v2RentalDeliveryDetails.count({
			where: { tenantId: ctx.v2TenantId },
		}),
		ctx.prisma.v2AssignedAsset.count({
			where: { tenantId: ctx.v2TenantId },
		}),
		ctx.prisma.v2AssetBlock.count({
			where: { tenantId: ctx.v2TenantId },
		}),
		ctx.prisma.v2AssetBlock.count({
			where: {
				tenantId: ctx.v2TenantId,
				releasedAt: null,
			},
		}),
		ctx.prisma.v2RentalAccessorySelection.count({
			where: { tenantId: ctx.v2TenantId },
		}),
		ctx.prisma.v2RentalAccessoryAssetAssignment.count({
			where: { tenantId: ctx.v2TenantId },
		}),
		ctx.prisma.v2RentalOwnerSplit.count({
			where: { tenantId: ctx.v2TenantId },
		}),
	]);

	ctx.log("Stage 5 verification", {
		rentals,
		selections,
		demandLines,
		deliveryDetails,
		assignedAssets,
		assetBlocks,
		activeAssetBlocks,
		accessorySelections,
		accessoryAssetAssignments,
		ownerSplits,
	});
}
