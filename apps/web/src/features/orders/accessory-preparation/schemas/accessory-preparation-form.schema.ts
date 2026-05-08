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
		assignedAssets: z.array(accessoryPreparationAssetFormSchema),
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
					assignedAssets: selectedLine?.assignedAssets ?? [],
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
        })),
    })),
  };

	return saveOrderAccessoryPreparationSchema.parse(dto);
}

export function getAssetLabel(asset: AccessoryPreparationAsset): string {
	return asset.serialNumber ?? "Asset sin serie";
}
