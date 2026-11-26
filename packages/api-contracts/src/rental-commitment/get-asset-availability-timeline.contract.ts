import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { AssetStatusSchema } from "../asset-inventory/asset.schemas";
import { BranchCalendarWindowSchema } from "./branch-calendar-window.schema";

const idListQuerySchema = z
	.string()
	.max(12_900)
	.transform((value) => value.split(",").map((id) => id.trim()))
	.pipe(z.array(z.string().min(1).max(128)).max(100))
	.transform((ids) => [...new Set(ids)])
	.optional();

export const GetAssetAvailabilityTimelineQuerySchema =
	BranchCalendarWindowSchema.safeExtend({
		to: BranchCalendarWindowSchema.shape.to.refine(
			(value) => value < "9999-12-31",
			{ message: "The exclusive window end must fit in a four-digit year." },
		),
		equipmentTypeIds: idListQuerySchema,
		assetIds: idListQuerySchema,
		page: z.coerce.number().int().min(1).max(1_000_000).default(1),
		pageSize: z.coerce.number().int().min(1).max(100).default(50),
	});

const instantRange = {
	startsAt: z.iso.datetime(),
	endsAt: z.iso.datetime(),
};

const rentalReferenceSchema = z.object({
	id: z.string(),
	rentalNumber: z.number().int().positive(),
});

const span = {
	blockId: z.string(),
	...instantRange,
};

const assetOccupancySpanSchema = z.discriminatedUnion("kind", [
	z.object({
		...span,
		kind: z.literal("TEMPORARY_UNAVAILABILITY"),
		reason: z.string(),
	}),
	z.object({
		...span,
		kind: z.enum(["RESERVATION", "OPERATIONAL_BUFFER", "RENTAL_OCCUPANCY"]),
		rental: rentalReferenceSchema.nullable(),
	}),
]);

export const GetAssetAvailabilityTimelineResponseSchema = z.object({
	branchId: z.string(),
	timezone: z.string(),
	window: z.object(instantRange),
	data: z.array(
		z.object({
			assetId: z.string(),
			serialNumber: z.string().nullable(),
			status: AssetStatusSchema,
			equipmentType: z.object({ id: z.string(), name: z.string() }),
			spans: z.array(assetOccupancySpanSchema),
		}),
	),
	total: z.number().int().nonnegative(),
	page: z.number().int().positive(),
	pageSize: z.number().int().positive(),
});

export type AssetOccupancySpanDto = z.infer<typeof assetOccupancySpanSchema>;
export type GetAssetAvailabilityTimelineResponseDto = z.infer<
	typeof GetAssetAvailabilityTimelineResponseSchema
>;

export const getAssetAvailabilityTimelineContract = {
	method: "GET",
	path: "/asset-inventory/availability-timeline",
	query: GetAssetAvailabilityTimelineQuerySchema,
	response: GetAssetAvailabilityTimelineResponseSchema,
} satisfies ApiContract<
	undefined,
	typeof GetAssetAvailabilityTimelineQuerySchema,
	undefined,
	undefined,
	typeof GetAssetAvailabilityTimelineResponseSchema
>;
