import {
	GetStorefrontRentalOffersPackageCompositionItemSchema,
	GetStorefrontRentalOffersPricingItemSchema,
} from "@repo/api-contracts";
import { z } from "zod";

export const GetStorefrontRentalOfferListViewInputSchema = z.object({
	branchId: z.string().trim().min(1),
	periodStart: z.iso.date().optional(),
	periodEnd: z.iso.date().optional(),
	categoryId: z.string().trim().min(1).optional(),
	search: z.string().trim().min(1).optional(),
	page: z.coerce.number().int().positive().default(1),
	pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type GetStorefrontRentalOfferListViewInputDto = z.infer<
	typeof GetStorefrontRentalOfferListViewInputSchema
>;

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

export const GetStorefrontRentalOfferListViewResponseSchema = z.object({
	packages: StorefrontRentalOfferListViewPageSchema,
	singles: StorefrontRentalOfferListViewPageSchema,
});

export type StorefrontRentalOfferListViewItemDto = z.infer<
	typeof StorefrontRentalOfferListViewItemSchema
>;

export type StorefrontRentalOfferListViewPageDto = z.infer<
	typeof StorefrontRentalOfferListViewPageSchema
>;

export type GetStorefrontRentalOfferListViewResponseDto = z.infer<
	typeof GetStorefrontRentalOfferListViewResponseSchema
>;
