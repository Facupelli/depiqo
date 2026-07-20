import { GetRentalOffersPricingItemSchema } from "@repo/api-contracts";
import { z } from "zod";

export const SearchDraftRentalOffersInputSchema = z.object({
	branchId: z.string().trim().min(1),
	search: z.string().trim().min(1).optional(),
	periodStart: z.iso.datetime().optional(),
	periodEnd: z.iso.datetime().optional(),
	page: z.coerce.number().int().positive().default(1),
	pageSize: z.coerce.number().int().positive().max(10).default(10),
});

export type SearchDraftRentalOffersInputDto = z.infer<
	typeof SearchDraftRentalOffersInputSchema
>;

export const DraftRentalOfferSearchRequirementSchema = z.object({
	equipmentTypeId: z.string(),
	quantityPerItem: z.number().int().positive(),
});

export const DraftRentalOfferSearchItemSchema = z.object({
	id: z.string(),
	name: z.string(),
	kind: z.enum(["SINGLE", "PACKAGE", "KIT"]),
	image: z.string().nullable(),
	description: z.string().nullable(),
	requirements: z.array(DraftRentalOfferSearchRequirementSchema),
	pricing: GetRentalOffersPricingItemSchema.nullable(),
	availableCount: z.number().int().nonnegative().nullable(),
});

export const SearchDraftRentalOffersResponseSchema = z.object({
	data: z.array(DraftRentalOfferSearchItemSchema),
	total: z.number().int(),
	page: z.number().int(),
	pageSize: z.number().int(),
});

export type DraftRentalOfferSearchRequirementDto = z.infer<
	typeof DraftRentalOfferSearchRequirementSchema
>;

export type DraftRentalOfferSearchItemDto = z.infer<
	typeof DraftRentalOfferSearchItemSchema
>;

export type SearchDraftRentalOffersResponseDto = z.infer<
	typeof SearchDraftRentalOffersResponseSchema
>;
