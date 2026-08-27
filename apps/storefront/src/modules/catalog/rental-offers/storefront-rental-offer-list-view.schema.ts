import {
	GetStorefrontRentalOffersPackageCompositionItemSchema,
	GetStorefrontRentalOffersPricingItemSchema,
} from "@repo/api-contracts";
import { z } from "zod";

export const StorefrontRentalOfferListViewItemSchema = z.object({
	id: z.string(),
	name: z.string(),
	image: z.string().nullable(),
	description: z.string().nullable(),
	packageComposition: z
		.array(GetStorefrontRentalOffersPackageCompositionItemSchema)
		.optional(),
	pricing: GetStorefrontRentalOffersPricingItemSchema.nullable(),
	availableCount: z.number().int().nonnegative().nullable(),
});

export const StorefrontRentalOfferListViewPageSchema = z.object({
	data: z.array(StorefrontRentalOfferListViewItemSchema),
	total: z.number().int(),
	page: z.number().int(),
	pageSize: z.number().int(),
});

export type StorefrontRentalOfferListViewItemDto = z.infer<
	typeof StorefrontRentalOfferListViewItemSchema
>;

export type StorefrontRentalOfferListViewPageDto = z.infer<
	typeof StorefrontRentalOfferListViewPageSchema
>;
