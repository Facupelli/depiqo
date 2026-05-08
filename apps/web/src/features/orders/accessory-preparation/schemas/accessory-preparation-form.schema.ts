import {
	type AccessoryPreparationAsset,
	type OrderAccessoryPreparationResponseDto,
	type SaveOrderAccessoryPreparationDto,
	saveOrderAccessoryPreparationSchema,
} from "@repo/schemas";
import { z } from "zod";
import { emptyToNull } from "@/shared/utils/form.utils";

const accessoryPreparationAssetFormSchema = z.object({
	id: z.uuid(),
	serialNumber: z.string().nullable(),
	ownerId: z.uuid().nullable(),
	ownerName: z.string().nullable(),
});

export const accessoryPreparationAccessoryFormSchema = z
	.object({
		accessoryRentalItemId: z.uuid(),
		name: z.string(),
		isDefaultIncluded: z.boolean(),
		availableCount: z.number().int(),
		suggestedQuantity: z.number().int().nullable(),
		selected: z.boolean(),
		saved: z.boolean(),
		quantity: z.number().int().nonnegative(),
		notes: z.string(),
		selectedAssetIds: z.array(z.uuid()),
		assignedAssets: z.array(accessoryPreparationAssetFormSchema),
		autoAssignQuantity: z.number().int().nonnegative(),
	})
	.superRefine((row, context) => {
		if (!row.selected) {
			return;
		}

		if (row.quantity < 1) {
			context.addIssue({
				code: "custom",
				message: "La cantidad debe ser al menos 1",
				path: ["quantity"],
			});
		}

		if (row.selectedAssetIds.length > row.quantity) {
			context.addIssue({
				code: "custom",
				message: "No puedes asignar mas assets que la cantidad",
				path: ["selectedAssetIds"],
			});
		}

		if (row.autoAssignQuantity > row.quantity - row.selectedAssetIds.length) {
			context.addIssue({
				code: "custom",
				message: "La auto-asignacion no puede superar la cantidad restante",
				path: ["autoAssignQuantity"],
			});
		}
	});

export const accessoryPreparationItemFormSchema = z.object({
	orderItemId: z.uuid(),
	productTypeName: z.string(),
	assignedPrimaryAssets: z.array(accessoryPreparationAssetFormSchema),
	accessories: z.array(accessoryPreparationAccessoryFormSchema),
});

export const accessoryPreparationFormSchema = z.object({
	items: z.array(accessoryPreparationItemFormSchema),
});

export type AccessoryPreparationAccessoryFormValues = z.infer<
	typeof accessoryPreparationAccessoryFormSchema
>;
export type AccessoryPreparationItemFormValues = z.infer<
	typeof accessoryPreparationItemFormSchema
>;
export type AccessoryPreparationFormValues = z.infer<
	typeof accessoryPreparationFormSchema
>;

export function accessoryPreparationToFormValues(
	preparation: OrderAccessoryPreparationResponseDto,
): AccessoryPreparationFormValues {
	return {
		items: preparation.items.map((item) => ({
			orderItemId: item.orderItemId,
			productTypeName: item.productTypeName,
			assignedPrimaryAssets: item.assignedPrimaryAssets,
			accessories: item.compatibleAccessories.map((accessory) => {
				const selectedLine = accessory.selectedLine;
				const suggestedQuantity = accessory.suggestedQuantity ?? 0;
				const shouldApplySuggestedDefault =
					!preparation.hasSavedAccessory && accessory.suggestedQuantity !== null;
				const selected =
					selectedLine !== null || shouldApplySuggestedDefault;

				return {
					accessoryRentalItemId: accessory.accessoryRentalItemId,
					name: accessory.name,
					isDefaultIncluded: accessory.isDefaultIncluded,
					availableCount: accessory.availableCount,
					suggestedQuantity: accessory.suggestedQuantity,
					selected,
					saved: selectedLine !== null,
					quantity: selectedLine?.quantity ?? accessory.suggestedQuantity ?? 1,
					notes: selectedLine?.notes ?? accessory.suggestedNotes ?? "",
					selectedAssetIds:
						selectedLine?.assignedAssets.map((asset) => asset.id) ?? [],
					assignedAssets: selectedLine?.assignedAssets ?? [],
					autoAssignQuantity:
						selectedLine === null && shouldApplySuggestedDefault
							? suggestedQuantity
							: 0,
				};
			}),
		})),
	};
}

export function toSaveOrderAccessoryPreparationDto(
	values: AccessoryPreparationFormValues,
): SaveOrderAccessoryPreparationDto {
	const dto: SaveOrderAccessoryPreparationDto = {
		items: values.items.map((item) => ({
			orderItemId: item.orderItemId,
			accessories: item.accessories
				.filter((accessory) => accessory.selected)
				.map((accessory) => ({
					accessoryRentalItemId: accessory.accessoryRentalItemId,
					quantity: accessory.quantity,
					notes: emptyToNull(accessory.notes),
					...(accessory.selectedAssetIds.length > 0
						? { assetIds: accessory.selectedAssetIds }
						: {}),
					...(accessory.autoAssignQuantity > 0
						? { autoAssignQuantity: accessory.autoAssignQuantity }
						: {}),
				})),
		})),
	};

	return saveOrderAccessoryPreparationSchema.parse(dto);
}

export function getAssetLabel(asset: AccessoryPreparationAsset): string {
	return asset.serialNumber ?? "Asset sin serie";
}
