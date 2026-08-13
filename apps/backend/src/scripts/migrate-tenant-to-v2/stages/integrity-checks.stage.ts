import { PrismaClient, V2RentalStatus } from "../../../generated/prisma/client";

export type TenantV2MigrationContext = {
	prisma: PrismaClient;
	legacyTenantId: string;
	v2TenantId: string;
	dryRun: boolean;
	now: Date;
	log: (message: string, data?: unknown) => void;
};

export async function verifyV2MigrationIntegrity(ctx: TenantV2MigrationContext) {
	ctx.log("Starting Stage 6: V2 migration integrity checks");

	await verifySelectionsHaveDemandLines(ctx);
	await verifyAssignedAssetsHaveDemandLines(ctx);
	await verifyActiveOffersHavePricing(ctx);
	await verifyActiveBlocksBelongToActiveRentals(ctx);
	await verifyNoDuplicateActiveRentalOffers(ctx);

	ctx.log("Finished Stage 6: V2 migration integrity checks");
}

async function verifySelectionsHaveDemandLines(ctx: TenantV2MigrationContext) {
	const selections = await ctx.prisma.v2RentalSelection.findMany({
		where: { tenantId: ctx.v2TenantId },
		select: {
			id: true,
			rentalId: true,
			rentableItemId: true,
			rentableItemNameSnapshot: true,
		},
	});

	const demandLines = await ctx.prisma.v2RentalDemandLine.findMany({
		where: { tenantId: ctx.v2TenantId },
		select: {
			rentalSelectionId: true,
		},
	});

	const selectionIdsWithDemandLines = new Set(
		demandLines.map((line) => line.rentalSelectionId),
	);

	const missingDemandLines = selections.filter(
		(selection) => !selectionIdsWithDemandLines.has(selection.id),
	);

	ctx.log("Integrity check: selections have demand lines", {
		selections: selections.length,
		missingDemandLines: missingDemandLines.length,
		examples: missingDemandLines.slice(0, 10).map((selection) => ({
			selectionId: selection.id,
			rentalId: selection.rentalId,
			rentableItemId: selection.rentableItemId,
			name: selection.rentableItemNameSnapshot,
		})),
	});
}

async function verifyAssignedAssetsHaveDemandLines(ctx: TenantV2MigrationContext) {
	const assignedAssets = await ctx.prisma.v2AssignedAsset.findMany({
		where: { tenantId: ctx.v2TenantId },
		select: {
			id: true,
			rentalId: true,
			assetId: true,
			rentalDemandLineId: true,
		},
	});

	const demandLines = await ctx.prisma.v2RentalDemandLine.findMany({
		where: { tenantId: ctx.v2TenantId },
		select: { id: true },
	});

	const demandLineIds = new Set(demandLines.map((line) => line.id));

	const missingDemandLine = assignedAssets.filter(
		(assignedAsset) =>
			!demandLineIds.has(assignedAsset.rentalDemandLineId),
	);

	ctx.log("Integrity check: assigned assets have demand lines", {
		assignedAssets: assignedAssets.length,
		missingDemandLine: missingDemandLine.length,
		examples: missingDemandLine.slice(0, 10),
	});
}

async function verifyActiveOffersHavePricing(ctx: TenantV2MigrationContext) {
	const activeOffers = await ctx.prisma.v2RentalOffer.findMany({
		where: {
			tenantId: ctx.v2TenantId,
			isVisible: true,
			isRentable: true,
		},
		select: {
			id: true,
			branchId: true,
			rentableItemId: true,
		},
	});

	const pricings = await ctx.prisma.v2RentalOfferPricing.findMany({
		where: {
			tenantId: ctx.v2TenantId,
			isActive: true,
		},
		select: {
			catalogRentalOfferId: true,
		},
	});

	const offerIdsWithPricing = new Set(
		pricings.map((pricing) => pricing.catalogRentalOfferId),
	);

	const missingPricing = activeOffers.filter(
		(offer) => !offerIdsWithPricing.has(offer.id),
	);

	ctx.log("Integrity check: active offers have pricing", {
		activeOffers: activeOffers.length,
		missingPricing: missingPricing.length,
		examples: missingPricing.slice(0, 10).map((offer) => ({
			rentalOfferId: offer.id,
			branchId: offer.branchId,
			rentableItemId: offer.rentableItemId,
		})),
	});
}

async function verifyActiveBlocksBelongToActiveRentals(
	ctx: TenantV2MigrationContext,
) {
	const activeBlocks = await ctx.prisma.v2AssetBlock.findMany({
		where: {
			tenantId: ctx.v2TenantId,
			releasedAt: null,
		},
		select: {
			id: true,
			rentalId: true,
			assetId: true,
			blockType: true,
		},
	});

	const rentals = await ctx.prisma.v2Rental.findMany({
		where: {
			tenantId: ctx.v2TenantId,
		},
		select: {
			id: true,
			status: true,
		},
	});

	const rentalsById = new Map(
		rentals.map((rental) => [rental.id, rental]),
	);

	const invalidBlocks = activeBlocks.filter((block) => {
		const rental = rentalsById.get(block.rentalId);

		if (!rental) return true;

		return rental.status !== V2RentalStatus.CONFIRMED;
	});

	ctx.log("Integrity check: active blocks belong to active rentals", {
		activeBlocks: activeBlocks.length,
		invalidBlocks: invalidBlocks.length,
		examples: invalidBlocks.slice(0, 10).map((block) => ({
			blockId: block.id,
			rentalId: block.rentalId,
			assetId: block.assetId,
			blockType: block.blockType,
			rentalStatus: rentalsById.get(block.rentalId)?.status ?? null,
		})),
	});
}

async function verifyNoDuplicateActiveRentalOffers(ctx: TenantV2MigrationContext) {
	const activeOffers = await ctx.prisma.v2RentalOffer.findMany({
		where: {
			tenantId: ctx.v2TenantId,
		},
		select: {
			id: true,
			branchId: true,
			rentableItemId: true,
		},
	});

	const grouped = new Map<
		string,
		Array<{ id: string; branchId: string; rentableItemId: string }>
	>();

	for (const offer of activeOffers) {
		const key = `${offer.branchId}:${offer.rentableItemId}`;
		const current = grouped.get(key) ?? [];
		current.push(offer);
		grouped.set(key, current);
	}

	const duplicates = [...grouped.entries()]
		.filter(([, offers]) => offers.length > 1)
		.map(([key, offers]) => ({
			key,
			count: offers.length,
			offers,
		}));

	ctx.log("Integrity check: no duplicate active rental offers", {
		activeOffers: activeOffers.length,
		duplicateGroups: duplicates.length,
		examples: duplicates.slice(0, 10),
	});
}
