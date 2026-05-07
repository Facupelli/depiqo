import {
	type CreateProductTypeDto,
	createProductTypeSchema,
	type ProductTypeIncludedItemDto,
	type UpdateProductTypeDto,
	updateProductTypeSchema,
} from "@repo/schemas";
import { RentalItemKind, TrackingMode } from "@repo/types";
import { z } from "zod";
import { emptyToNull, emptyToNullOrUndefined } from "@/shared/utils/form.utils";

export const attributeRowSchema = z.object({
	key: z.string().min(1, "Key is required"),
	value: z.string().min(1, "Value is required"),
});

export const includedItemRowSchema = z.object({
	name: z.string().min(1, "Name is required"),
	quantity: z.number().int().positive("Must be at least 1"),
	notes: z.string().or(z.literal("")),
});

export const productTypeFormSchema = z.object({
	categoryId: z.string().or(z.literal("")),
	billingUnitId: z.string().min(1, "Billing unit is required"),
	name: z.string().min(1, "Name is required"),
	imageUrl: z.string().min(1, "Product image is required"),
	description: z.string().or(z.literal("")),
	kind: z.enum(RentalItemKind),
	trackingMode: z.enum(TrackingMode),
	excludeFromNewArrivals: z.boolean(),
	attributes: z.array(attributeRowSchema),
	includedItems: z.array(includedItemRowSchema),
});

export type AttributeRow = z.infer<typeof attributeRowSchema>;
export type IncludedItemRow = z.infer<typeof includedItemRowSchema>;
export type ProductTypeFormValues = z.infer<typeof productTypeFormSchema>;

export const productTypeFormDefaults: ProductTypeFormValues = {
	categoryId: "",
	billingUnitId: "",
	name: "",
	imageUrl: "",
	description: "",
	kind: RentalItemKind.PRIMARY,
	trackingMode: TrackingMode.IDENTIFIED,
	excludeFromNewArrivals: false,
	attributes: [],
	includedItems: [],
};

export function getProductTypeFormDefaults(
	kind: RentalItemKind,
): ProductTypeFormValues {
	return {
		...productTypeFormDefaults,
		kind,
	};
}

export function productTypeToFormValues(productType: {
	categoryId?: string | null;
	category?: { id: string } | null;
	billingUnitId?: string;
	billingUnit?: { id: string };
	name: string;
	imageUrl: string | null;
	description: string | null;
	kind: RentalItemKind;
	trackingMode: TrackingMode;
	excludeFromNewArrivals: boolean;
	attributes: Record<string, string>;
	includedItems: ProductTypeIncludedItemDto[];
}): ProductTypeFormValues {
	return {
		categoryId: productType.categoryId ?? productType.category?.id ?? "",
		billingUnitId:
			productType.billingUnitId ?? productType.billingUnit?.id ?? "",
		name: productType.name,
		imageUrl: productType.imageUrl ?? "",
		description: productType.description ?? "",
		kind: productType.kind,
		trackingMode: productType.trackingMode,
		excludeFromNewArrivals: productType.excludeFromNewArrivals,
		attributes: Object.entries(productType.attributes).map(([key, value]) => ({
			key,
			value,
		})),
		includedItems: productType.includedItems.map((item) => ({
			name: item.name,
			quantity: item.quantity,
			notes: item.notes ?? "",
		})),
	};
}

function mapAttributeRows(rows: AttributeRow[]): Record<string, string> {
	return Object.fromEntries(
		rows.map(({ key, value }) => [key.trim(), value.trim()]),
	);
}

function mapIncludedItemRows(
	rows: IncludedItemRow[],
): ProductTypeIncludedItemDto[] {
	return rows.map((item) => ({
		name: item.name.trim(),
		quantity: item.quantity,
		notes: emptyToNull(item.notes),
	}));
}

export function toCreateProductTypeDto(
	values: ProductTypeFormValues,
): CreateProductTypeDto {
	const dto = {
		categoryId: emptyToNull(values.categoryId),
		billingUnitId: values.billingUnitId,
		name: values.name.trim(),
		imageUrl: emptyToNull(values.imageUrl),
		description: emptyToNull(values.description),
		kind: values.kind,
		trackingMode: values.trackingMode,
		excludeFromNewArrivals: values.excludeFromNewArrivals,
		attributes: mapAttributeRows(values.attributes),
		includedItems: mapIncludedItemRows(values.includedItems),
	};

	return createProductTypeSchema.parse(dto);
}

export function toUpdateProductTypeDto(
	dirtyValues: Partial<ProductTypeFormValues>,
): UpdateProductTypeDto {
	const dto: UpdateProductTypeDto = {};

	if (dirtyValues.categoryId !== undefined) {
		dto.categoryId = emptyToNull(dirtyValues.categoryId);
	}
	if (dirtyValues.billingUnitId !== undefined) {
		dto.billingUnitId = dirtyValues.billingUnitId;
	}
	if (dirtyValues.name !== undefined) {
		dto.name = dirtyValues.name.trim();
	}
	if (dirtyValues.imageUrl !== undefined) {
		dto.imageUrl = dirtyValues.imageUrl;
	}
	if (dirtyValues.description !== undefined) {
		dto.description = emptyToNullOrUndefined(dirtyValues.description);
	}
	if (dirtyValues.kind !== undefined) {
		dto.kind = dirtyValues.kind;
	}
	if (dirtyValues.trackingMode !== undefined) {
		dto.trackingMode = dirtyValues.trackingMode;
	}
	if (dirtyValues.excludeFromNewArrivals !== undefined) {
		dto.excludeFromNewArrivals = dirtyValues.excludeFromNewArrivals;
	}
	if (dirtyValues.attributes !== undefined) {
		dto.attributes = mapAttributeRows(dirtyValues.attributes);
	}
	if (dirtyValues.includedItems !== undefined) {
		dto.includedItems = mapIncludedItemRows(dirtyValues.includedItems);
	}

	return updateProductTypeSchema.parse(dto);
}
