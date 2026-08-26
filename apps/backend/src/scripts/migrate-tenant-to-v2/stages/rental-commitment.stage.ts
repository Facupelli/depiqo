import {
	AssignmentSource,
	AssignmentType,
	ContractBasis,
	OrderItemType,
	OrderStatus,
	Prisma,
	PrismaClient,
	V2AssetBlockType,
	V2FulfillmentMethod,
	V2RentalSource,
	V2RentalStatus,
	V2RentableItemKind,
} from "../../../generated/prisma/client";
import { v5 as uuidv5 } from "uuid";
import Decimal from "decimal.js";

import { ConfirmedPriceSnapshot } from "../../../modules/rental-commitment/domain/value-objects/confirmed-price-snapshot.value-object";
import {
	buildLegacyV2PriceSnapshot,
	type DiscountMetadataOmission,
	type LegacyV2PriceSnapshotItem,
} from "../build-legacy-v2-price-snapshot";
import { resolveEffectiveTimezone } from "../../../modules/tenant-management/domain/utils/effective-timezone";
import {
	AssignedAssetOwnershipSnapshot,
	type AssignedAssetOwnershipSnapshotData,
} from "../../../modules/rental-commitment/domain/value-objects/assigned-asset-ownership-snapshot.value-object";

const MIGRATION_UUID_NAMESPACE = "a45fc5e2-ec5e-4d89-8cb8-c35c66d4f830";

const LEGACY_FINANCIAL_SNAPSHOT_CURRENCY_OVERRIDES: Readonly<Record<string, string>> = {
	// This tenant's legacy order snapshots were incorrectly written as USD.
	"e545d3d3-c6bb-43fb-afa6-cdf734cbdf0a": "EUR",
};

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

	const canValidatePricing =
		!ctx.dryRun || (await hasPersistedDryRunPricingMappings(ctx));
	const legacyPricingData = canValidatePricing
		? await prepareLegacyPricingData(ctx)
		: new Map<string, PreparedLegacyOrderItem[]>();

	if (ctx.dryRun && !canValidatePricing) {
		ctx.log(
			"Dry-run cannot validate legacy-to-V2 confirmed pricing conversion because earlier dry-run stages do not materialize the required V2 rental offers and tenant users. No pricing conversion was validated.",
		);
	}

	await migrateRentals(ctx, legacyPricingData, canValidatePricing);
	await migrateRentalNumberCounter(ctx);
	await migrateRentalSelections(ctx, legacyPricingData);
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

type PreparedLegacyOrderItem = {
	orderId: string;
	createdAt: Date;
	priceSnapshot: Prisma.JsonValue;
	conversion: LegacyV2PriceSnapshotItem;
	type: OrderItemType;
	productType: { name: string } | null;
	bundle: { name: string } | null;
};

async function hasPersistedDryRunPricingMappings(
	ctx: TenantV2MigrationContext,
): Promise<boolean> {
	const [legacyOrderItems, rentalOffers, tenantUsers] =
		await Promise.all([
			ctx.prisma.orderItem.findMany({
				where: { order: { tenantId: ctx.legacyTenantId, deletedAt: null } },
				select: { manualPricingOverride: true },
			}),
			ctx.prisma.v2RentalOffer.count({ where: { tenantId: ctx.v2TenantId } }),
			ctx.prisma.v2TenantUser.count({ where: { tenantId: ctx.v2TenantId } }),
		]);

	if (legacyOrderItems.length === 0) return true;
	const requiresTenantUserMapping = legacyOrderItems.some(
		(item) => item.manualPricingOverride !== null,
	);
	return rentalOffers > 0 && (!requiresTenantUserMapping || tenantUsers > 0);
}

async function prepareLegacyPricingData(
	ctx: TenantV2MigrationContext,
): Promise<Map<string, PreparedLegacyOrderItem[]>> {
	const [orderItems, rentalOffers, offerPricings, tenantUsers] = await Promise.all([
		ctx.prisma.orderItem.findMany({
			where: { order: { tenantId: ctx.legacyTenantId, deletedAt: null } },
			include: {
				order: true,
				productType: { include: { billingUnit: true } },
				bundle: { include: { billingUnit: true } },
			},
			orderBy: { createdAt: "asc" },
		}),
		ctx.prisma.v2RentalOffer.findMany({ where: { tenantId: ctx.v2TenantId } }),
		ctx.prisma.v2RentalOfferPricing.findMany({
			where: { tenantId: ctx.v2TenantId, isActive: true, deletedAt: null },
			include: { ratePlan: { include: { tiers: true } } },
		}),
		ctx.prisma.v2TenantUser.findMany({
			where: { tenantId: ctx.v2TenantId },
			select: { id: true, role: true },
			orderBy: { id: "asc" },
		}),
	]);

	const offerByKey = new Map(
		rentalOffers.map((offer) => [
			`${offer.branchId}:${offer.rentableItemId}`,
			offer,
		]),
	);
	const pricingByOfferId = new Map(
		offerPricings.map((pricing) => [pricing.catalogRentalOfferId, pricing]),
	);
	const tenantUserIds = new Set(tenantUsers.map((user) => user.id));
	const fallbackAdminId = tenantUsers.find((user) => user.role === "ADMIN")?.id;
	const result = new Map<string, PreparedLegacyOrderItem[]>();

	for (const item of orderItems) {
		const rentableItemId = getOrderItemRentableItemId(item);
		const rentableItemName = getOrderItemRentableItemName(item);
		const source = item.productType ?? item.bundle;
		if (!source) throw new Error(`Order item ${item.id} has no rentable item source`);
		const rentalOffer = offerByKey.get(`${item.order.locationId}:${rentableItemId}`);
		if (!rentalOffer) throw new Error(`Missing V2RentalOffer for orderItem=${item.id}`);
		const pricing = pricingByOfferId.get(rentalOffer.id);
		const historical = readHistoricalTierFacts(item.id, item.priceSnapshot);
		const matchingTiers = (pricing?.ratePlan.tiers ?? []).filter(
			(tier) =>
				tier.fromUnit <= historical.totalUnits &&
				(tier.toUnit === null || historical.totalUnits <= tier.toUnit) &&
				new Decimal(tier.pricePerUnit.toString()).equals(historical.pricePerBillingUnit),
		);
		const matchedPricingIdentity =
			pricing && matchingTiers.length === 1
				? { ratePlanId: pricing.ratePlanId, appliedTierId: matchingTiers[0]!.id }
				: undefined;
		if (!matchedPricingIdentity) {
			ctx.log("Historical pricing identity could not be resolved safely; omitting rate plan and tier metadata", {
				orderId: item.orderId,
				orderItemId: item.id,
				totalUnits: historical.totalUnits,
				pricePerBillingUnit: historical.pricePerBillingUnit.toString(),
				matchingTierCount: matchingTiers.length,
			});
		}

		const overrideActor = readManualOverrideActor(item.manualPricingOverride);
		let manualOverrideActorId: string | undefined;
		if (item.manualPricingOverride !== null) {
			manualOverrideActorId =
				overrideActor && tenantUserIds.has(overrideActor)
					? overrideActor
					: overrideActor
						? undefined
						: fallbackAdminId;
			if (overrideActor && !manualOverrideActorId) {
				throw new Error(
					`Cannot map manual-pricing actor ${overrideActor} for order=${item.orderId}, orderItem=${item.id}`,
				);
			}
			if (!manualOverrideActorId) {
				throw new Error(`No V2 tenant ADMIN is available for manual override on order=${item.orderId}, orderItem=${item.id}`);
			}
		}

		const prepared: PreparedLegacyOrderItem = {
			orderId: item.orderId,
			createdAt: item.createdAt,
			priceSnapshot: item.priceSnapshot,
			type: item.type,
			productType: item.productType ? { name: item.productType.name } : null,
			bundle: item.bundle ? { name: item.bundle.name } : null,
			conversion: {
				orderItemId: item.id,
				priceSnapshot: item.priceSnapshot,
				manualPricingOverride: item.manualPricingOverride,
				rentalOfferId: rentalOffer.id,
				rentableItemId,
				rentableItemName,
				billingUnit: mapLegacyBillingUnit(source.billingUnit),
				...matchedPricingIdentity,
				manualOverrideActorId,
			},
		};
		result.set(item.orderId, [...(result.get(item.orderId) ?? []), prepared]);
	}

	return result;
}

async function migrateRentals(
	ctx: TenantV2MigrationContext,
	legacyPricingData: Map<string, PreparedLegacyOrderItem[]>,
	canValidatePricing: boolean,
) {
	const [orders, v2Branches] = await Promise.all([
		ctx.prisma.order.findMany({
			where: {
				tenantId: ctx.legacyTenantId,
				deletedAt: null,
			},
			include: {
				location: { include: { tenant: { select: { config: true } } } },
			},
			orderBy: { createdAt: "asc" },
		}),
		ctx.prisma.v2Branch.findMany({
			where: { tenantId: ctx.v2TenantId },
			select: { id: true, timezone: true },
		}),
	]);
	const v2BranchTimezoneById = new Map(
		v2Branches.map((branch) => [branch.id, branch.timezone]),
	);

	ctx.log(`Migrating rentals from orders: ${orders.length}`);

	const invalidOrder = orders.find((order) => order.orderNumber <= 0);
	if (invalidOrder) {
		throw new Error(
			`Cannot migrate order ${invalidOrder.id}: orderNumber must be a positive integer.`,
		);
	}

	for (const order of orders) {
		const status = mapOrderStatusToV2(order.status);
		const legacyFinancialSnapshot = migrateLegacyFinancialSnapshot({
			tenantId: order.tenantId,
			financialSnapshot: order.financialSnapshot,
		});
		const shouldConvertConfirmedPricing =
			isHistoricallyCommitted(order.status) && canValidatePricing;
		const priceSnapshot = shouldConvertConfirmedPricing
			? buildAndValidateConfirmedPriceSnapshot({
					order,
					financialSnapshot: legacyFinancialSnapshot,
					effectiveTimezone: resolveMigrationPricingTimezone(
						ctx,
						order,
						v2BranchTimezoneById.get(order.locationId),
					),
					items: legacyPricingData.get(order.id) ?? [],
					onDiscountMetadataOmitted: (entry) => {
						ctx.log(
							"Historical discount metadata could not be represented safely; preserving monetary discount and omitting promotion metadata",
							entry,
						);
					},
				})
			: legacyFinancialSnapshot;

		if (ctx.dryRun) {
			ctx.log("Dry-run: would migrate rental", {
				orderId: order.id,
				status,
				confirmedPricingValidated: shouldConvertConfirmedPricing,
			});
			continue;
		}

		await ctx.prisma.v2Rental.upsert({
			where: { id: order.id },
			create: {
				id: order.id,
				tenantId: order.tenantId,
				rentalNumber: order.orderNumber,
				branchId: order.locationId,
				customerId: order.customerId,

				status,
				fulfillmentMethod: mapFulfillmentMethod(order.fulfillmentMethod),
				notes: order.notes,
				insuranceSelected: order.insuranceSelected,
				bookingSnapshot: order.bookingSnapshot,
				priceSnapshot,
				source: V2RentalSource.FORMAL,

				periodStart: order.periodStart,
				periodEnd: order.periodEnd,

				createdAt: order.createdAt,
				updatedAt: order.updatedAt,
				confirmedAt: getConfirmedAt(order),
				cancelledAt: getCancelledAt(order),
			},
			update: {
				rentalNumber: order.orderNumber,
				branchId: order.locationId,
				customerId: order.customerId,

				status,
				fulfillmentMethod: mapFulfillmentMethod(order.fulfillmentMethod),
				notes: order.notes,
				insuranceSelected: order.insuranceSelected,
				bookingSnapshot: order.bookingSnapshot,
				priceSnapshot,
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

function migrateLegacyFinancialSnapshot(input: {
	tenantId: string;
	financialSnapshot: Prisma.JsonValue;
}): Prisma.JsonValue {
	const currencyOverride =
		LEGACY_FINANCIAL_SNAPSHOT_CURRENCY_OVERRIDES[input.tenantId];

	if (!currencyOverride) {
		return input.financialSnapshot;
	}

	if (
		!isPrismaJsonObject(input.financialSnapshot) ||
		typeof input.financialSnapshot.currency !== "string"
	) {
		throw new Error(
			`Cannot apply the financial snapshot currency override for tenant ${input.tenantId}: snapshot currency is missing or invalid.`,
		);
	}

	return { ...input.financialSnapshot, currency: currencyOverride };
}

function isPrismaJsonObject(value: Prisma.JsonValue): value is Prisma.JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHistoricallyCommitted(status: OrderStatus): boolean {
	return (
		status === OrderStatus.CONFIRMED ||
		status === OrderStatus.ACTIVE ||
		status === OrderStatus.COMPLETED
	);
}

function resolveMigrationPricingTimezone(
	ctx: TenantV2MigrationContext,
	order: {
		id: string;
		locationId: string;
		bookingSnapshot: Prisma.JsonValue;
		location: { timezone: string | null; tenant: { config: Prisma.JsonValue } };
	},
	v2BranchTimezone: string | null | undefined,
): string {
	if (
		isPrismaJsonObject(order.bookingSnapshot) &&
		typeof order.bookingSnapshot.timezone === "string" &&
		order.bookingSnapshot.timezone.length > 0
	) {
		return order.bookingSnapshot.timezone;
	}

	const branchTimezone =
		order.location.timezone?.trim() || v2BranchTimezone?.trim();
	const fallbackTimezone = resolveEffectiveTimezone(
		branchTimezone,
		readTenantTimezone(order.location.tenant.config),
	);
	ctx.log("Substituting migration compatibility timezone for legacy booking snapshot", {
		orderId: order.id,
		locationId: order.locationId,
		fallbackTimezone,
		reason: "legacy booking snapshot has no timezone",
	});
	return fallbackTimezone;
}

function readTenantTimezone(config: Prisma.JsonValue): string | undefined {
	return isPrismaJsonObject(config) && typeof config.timezone === "string"
		? config.timezone
		: undefined;
}

function buildAndValidateConfirmedPriceSnapshot(input: {
	order: {
		id: string;
		reviewedAt: Date | null;
		createdAt: Date;
	};
	financialSnapshot: Prisma.JsonValue;
	effectiveTimezone: string;
	items: PreparedLegacyOrderItem[];
	onDiscountMetadataOmitted?: (entry: DiscountMetadataOmission) => void;
}): Prisma.JsonValue {
	const snapshot = buildLegacyV2PriceSnapshot({
		orderId: input.order.id,
		financialSnapshot: input.financialSnapshot,
		effectiveTimezone: input.effectiveTimezone,
		calculatedAt: input.order.reviewedAt ?? input.order.createdAt,
		items: input.items.map((item) => item.conversion),
		onDiscountMetadataOmitted: input.onDiscountMetadataOmitted,
	});
	const domainValidation = ConfirmedPriceSnapshot.create(snapshot);
	if (domainValidation.isErr()) {
		throw new Error(
			`Converted pricing for order ${input.order.id} failed ConfirmedPriceSnapshot validation: ${domainValidation.error.message}`,
		);
	}
	return domainValidation.value.toJSON() as Prisma.JsonValue;
}

function readHistoricalTierFacts(orderItemId: string, value: Prisma.JsonValue): {
	totalUnits: number;
	pricePerBillingUnit: Decimal;
} {
	if (!isPrismaJsonObject(value)) throw new Error(`Invalid priceSnapshot for orderItem=${orderItemId}`);
	const totalUnits = value.totalUnits;
	const pricePerBillingUnit = value.pricePerBillingUnit;
	if (
		typeof totalUnits !== "number" ||
		!Number.isInteger(totalUnits) ||
		totalUnits <= 0 ||
		(typeof pricePerBillingUnit !== "string" && typeof pricePerBillingUnit !== "number")
	) {
		throw new Error(`Invalid historical tier facts for orderItem=${orderItemId}`);
	}
	return { totalUnits, pricePerBillingUnit: new Decimal(pricePerBillingUnit) };
}

function readManualOverrideActor(value: Prisma.JsonValue | null): string | null {
	if (!isPrismaJsonObject(value) || typeof value.setByUserId !== "string") return null;
	return value.setByUserId;
}

function mapLegacyBillingUnit(input: {
	label: string;
	durationMinutes: number;
}): "HOUR" | "DAY" | "WEEK" {
	const label = input.label.trim().toLowerCase();
	if (label.includes("hora") || label.includes("hour") || input.durationMinutes === 60) return "HOUR";
	if (label.includes("día") || label.includes("dia") || label.includes("day") || input.durationMinutes === 1440) return "DAY";
	if (label.includes("semana") || label.includes("week") || input.durationMinutes === 10080) return "WEEK";
	throw new Error(`Unsupported legacy billing unit: ${input.label} (${input.durationMinutes} minutes)`);
}

async function migrateRentalNumberCounter(ctx: TenantV2MigrationContext) {
	const { _max: { orderNumber: lastOrderNumber } } =
		await ctx.prisma.order.aggregate({
			where: { tenantId: ctx.legacyTenantId },
			_max: { orderNumber: true },
		});

	const lastIssuedNumber = lastOrderNumber ?? 0;
	ctx.log("Synchronizing rental number counter", { lastIssuedNumber });

	if (ctx.dryRun) return;

	await ctx.prisma.$executeRaw`
		INSERT INTO v2_rental_number_counters (tenant_id, last_issued_number)
		VALUES (${ctx.v2TenantId}, ${lastIssuedNumber})
		ON CONFLICT (tenant_id) DO UPDATE
		SET last_issued_number = GREATEST(
			v2_rental_number_counters.last_issued_number,
			EXCLUDED.last_issued_number
		),
		updated_at = CURRENT_TIMESTAMP
	`;
}

async function migrateRentalSelections(
	ctx: TenantV2MigrationContext,
	legacyPricingData: Map<string, PreparedLegacyOrderItem[]>,
) {
	const orderItems = [...legacyPricingData.values()].flat();
	ctx.log(`Migrating rental selections from order items: ${orderItems.length}`);
	if (ctx.dryRun) return;

	for (const orderItem of orderItems) {
		await ctx.prisma.v2RentalSelection.upsert({
			where: { id: orderItem.conversion.orderItemId },
			create: {
				id: orderItem.conversion.orderItemId,
				tenantId: ctx.v2TenantId,
				rentalId: orderItem.orderId,
				rentalOfferId: orderItem.conversion.rentalOfferId,
				rentableItemId: orderItem.conversion.rentableItemId,
				rentableItemNameSnapshot: orderItem.conversion.rentableItemName,
				rentableItemKindSnapshot: mapOrderItemTypeToRentableItemKind(orderItem.type),
				quantity: 1,
				priceSnapshot: orderItem.priceSnapshot,
				createdAt: orderItem.createdAt,
			},
			update: {
				rentalOfferId: orderItem.conversion.rentalOfferId,
				rentableItemId: orderItem.conversion.rentableItemId,
				rentableItemNameSnapshot: orderItem.conversion.rentableItemName,
				rentableItemKindSnapshot: mapOrderItemTypeToRentableItemKind(orderItem.type),
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
	const [assignments, historicalOwnerSplits] = await Promise.all([
		ctx.prisma.assetAssignment.findMany({
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
		}),
		ctx.prisma.orderItemOwnerSplit.findMany({
			where: {
				orderItem: {
					order: {
						tenantId: ctx.legacyTenantId,
						deletedAt: null,
					},
				},
			},
			select: {
				orderItemId: true,
				assetId: true,
				ownerId: true,
				contractId: true,
				basis: true,
				ownerShare: true,
			},
		}),
	]);
	const ownerSplitByAssignmentKey = new Map(
		historicalOwnerSplits.map((split) => [
			buildLegacyAssignmentOwnershipKey(split.orderItemId, split.assetId),
			split,
		]),
	);

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

		const ownershipSnapshotData = buildLegacyAssignmentOwnershipSnapshot({
			assignmentId: assignment.id,
			orderId: assignment.order.id,
			orderItemId: assignment.orderItemId,
			assetId: assignment.assetId,
			source: assignment.source,
			ownerSplit: ownerSplitByAssignmentKey.get(
				buildLegacyAssignmentOwnershipKey(
					assignment.orderItemId,
					assignment.assetId,
				),
			),
		});
		const ownershipSnapshot = AssignedAssetOwnershipSnapshot.create(
			ownershipSnapshotData,
		);
		if (ownershipSnapshot.isErr()) {
			throw new Error(
				`Invalid ownership snapshot for assignment=${assignment.id}, order=${assignment.order.id}, orderItem=${assignment.orderItemId}, asset=${assignment.assetId}: ${ownershipSnapshot.error.message}`,
			);
		}
		const persistedOwnershipSnapshot = ownershipSnapshot.value.toJSON();

		await ctx.prisma.v2AssignedAsset.upsert({
			where: { id: assignment.id },
			create: {
				id: assignment.id,
				tenantId: assignment.order.tenantId,
				rentalId: assignment.order.id,
				rentalDemandLineId: demandLineId,
				assetId: assignment.assetId,
				ownershipSnapshot: persistedOwnershipSnapshot,
				effectiveFrom: assignment.order.periodStart,
				createdAt: assignment.createdAt,
			},
			update: {
				tenantId: assignment.order.tenantId,
				rentalId: assignment.order.id,
				rentalDemandLineId: demandLineId,
				assetId: assignment.assetId,
				ownershipSnapshot: persistedOwnershipSnapshot,
				effectiveFrom: assignment.order.periodStart,
				effectiveUntil: null,
			},
		});
	}
}

function buildLegacyAssignmentOwnershipKey(
	orderItemId: string,
	assetId: string,
): string {
	return `${orderItemId}:${assetId}`;
}

function buildLegacyAssignmentOwnershipSnapshot(input: {
	assignmentId: string;
	orderId: string;
	orderItemId: string;
	assetId: string;
	source: AssignmentSource | null;
	ownerSplit?: {
		ownerId: string;
		contractId: string;
		basis: ContractBasis;
		ownerShare: { toString(): string };
	};
}): AssignedAssetOwnershipSnapshotData {
	if (input.source === AssignmentSource.OWNED) {
		return { kind: "TENANT_OWNED" };
	}

	if (input.source === AssignmentSource.EXTERNAL) {
		if (!input.ownerSplit) {
			throw new Error(
				`Missing historical owner split for external assignment: order=${input.orderId}, orderItem=${input.orderItemId}, asset=${input.assetId}, assignment=${input.assignmentId}`,
			);
		}

		return {
			kind: "THIRD_PARTY",
			ownerId: input.ownerSplit.ownerId,
			contractId: input.ownerSplit.contractId,
			basis: mapLegacyContractBasisToV2(input.ownerSplit.basis),
			ownerShare: new Decimal(input.ownerSplit.ownerShare.toString()).toString(),
		};
	}

	throw new Error(
		`Unsupported legacy assignment source ${String(input.source)}: order=${input.orderId}, orderItem=${input.orderItemId}, asset=${input.assetId}, assignment=${input.assignmentId}`,
	);
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

	for (const split of splits) {
		const order = split.orderItem.order;
		const currency = getHistoricalFinancialCurrency({
			tenantId: order.tenantId,
			orderId: order.id,
			financialSnapshot: order.financialSnapshot,
		});

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
): "NET" {
	switch (basis) {
		case ContractBasis.NET_COLLECTED:
			return "NET";
	}
}

function getHistoricalFinancialCurrency(input: {
	tenantId: string;
	orderId: string;
	financialSnapshot: Prisma.JsonValue;
}): string {
	const snapshot = migrateLegacyFinancialSnapshot(input);
	if (!isPrismaJsonObject(snapshot) || typeof snapshot.currency !== "string") {
		throw new Error(`Cannot determine historical owner-split currency for order ${input.orderId}`);
	}
	return snapshot.currency;
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
		rentalNumberCounter,
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
		ctx.prisma.v2RentalNumberCounter.findUnique({
			where: { tenantId: ctx.v2TenantId },
			select: { lastIssuedNumber: true },
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
		lastIssuedRentalNumber: rentalNumberCounter?.lastIssuedNumber ?? null,
	});
}
