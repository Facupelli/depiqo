import { RentalItemKind, TrackingMode } from "@repo/types";
import { z } from "zod";
import { localDateSchema } from "../../shared/rental-temporal.schema";
import {
	productTypeAttributesSchema,
	productTypeIncludedItemSchema,
} from "./product-type.schema";

export const productTypeCategoryResponseSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	description: z.string().nullable(),
});

export const productTypeBillingUnitResponseSchema = z.object({
	id: z.uuid(),
	label: z.string(),
	durationMinutes: z.number().int(),
});

export const productTypePricingTierResponseSchema = z.object({
	id: z.uuid(),
	fromUnit: z.number().int(),
	toUnit: z.number().int().nullable(),
	pricePerUnit: z.number(),
	locationId: z.uuid().nullable(),
	location: z
		.object({
			id: z.uuid(),
			name: z.string(),
		})
		.nullable(),
});

export const productTypeAccessoryLinkResponseSchema = z.object({
	id: z.uuid(),
	primaryRentalItemId: z.uuid(),
	accessoryRentalItemId: z.uuid(),
	isDefaultIncluded: z.boolean(),
	defaultQuantity: z.number().int().positive(),
	notes: z.string().nullable(),
	accessoryRentalItem: z.object({
		id: z.uuid(),
		name: z.string(),
		imageUrl: z.string(),
		trackingMode: z.enum(TrackingMode),
		retiredAt: z.coerce.date().nullable(),
	}),
});

export const productTypeResponseSchema = z.object({
	id: z.uuid(),
	tenantId: z.uuid(),
	name: z.string(),
	imageUrl: z.string(),
	description: z.string().nullable(),
	kind: z.enum(RentalItemKind),
	trackingMode: z.enum(TrackingMode),
	excludeFromNewArrivals: z.boolean(),
	attributes: productTypeAttributesSchema,
	includedItems: z.array(productTypeIncludedItemSchema),
	// Total number of active, non-deleted assets for this product type.
	// Used as the upper bound when composing bundle components.
	assetCount: z.number().int().nonnegative(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
	publishedAt: z.coerce.date().nullable(),
	retiredAt: z.coerce.date().nullable(),
	category: productTypeCategoryResponseSchema.nullable(),
	billingUnit: productTypeBillingUnitResponseSchema,
	pricingTiers: z.array(productTypePricingTierResponseSchema),
	accessoryLinks: z.array(productTypeAccessoryLinkResponseSchema).optional(),
});

export const getProductTypesQuerySchema = z.object({
	categoryId: z.uuid().optional(),
	isActive: z.coerce.boolean().optional(),
	kind: z.enum(RentalItemKind).optional(),
	search: z.string().optional(),
	page: z.coerce.number().optional(),
	limit: z.coerce.number().optional(),
});

export type ProductTypeCategoryResponse = z.infer<
	typeof productTypeCategoryResponseSchema
>;
export type ProductTypeBillingUnitResponse = z.infer<
	typeof productTypeBillingUnitResponseSchema
>;
export type ProductTypePricingTierResponse = z.infer<
	typeof productTypePricingTierResponseSchema
>;
export type ProductTypeAccessoryLinkResponse = z.infer<
	typeof productTypeAccessoryLinkResponseSchema
>;
export type ProductTypeResponse = z.infer<typeof productTypeResponseSchema>;
export type GetProductTypesQuery = z.infer<typeof getProductTypesQuerySchema>;

// RENTAL

export const rentalProductBillingUnitResponseSchema = z.object({
	id: z.uuid(),
	label: z.string(),
});

export const rentalProductPricingTierResponseSchema = z.object({
	id: z.uuid(),
	fromUnit: z.number().int(),
	toUnit: z.number().int().nullable(),
	pricePerUnit: z.number(),
});

const rentalProductCategorySchema = z.object({
	id: z.uuid(),
	name: z.string(),
});

const rentalProductItemSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	imageUrl: z.string(),
	description: z.string().nullable(),
	attributes: productTypeAttributesSchema,
	includedItems: z.array(productTypeIncludedItemSchema),
	availableCount: z.number().int().nonnegative().nullable(),
	category: rentalProductCategorySchema.nullable(),
	billingUnit: rentalProductBillingUnitResponseSchema,
	pricingTiers: z.array(rentalProductPricingTierResponseSchema),
});

export const rentalProductSortSchema = z.enum([
	"price-desc",
	"price-asc",
	"alphabetical",
]);

export const getRentalProductQuerySchema = z.object({
	locationId: z.uuid(),
	pickupDate: localDateSchema.optional(),
	returnDate: localDateSchema.optional(),
	categoryId: z.uuid().optional(),
	search: z.string().optional(),
	sort: rentalProductSortSchema.optional(),
	page: z.coerce.number().optional(),
	limit: z.coerce.number().optional(),
});

export const rentalProductDataSchema = z.array(rentalProductItemSchema);

export type RentalProductSort = z.infer<typeof rentalProductSortSchema>;
export type RentalProductResponse = z.infer<typeof rentalProductItemSchema>;
export type RentalProductListResponse = z.infer<typeof rentalProductDataSchema>;
export type GetRentalProductTypesQuery = z.infer<
	typeof getRentalProductQuerySchema
>;
