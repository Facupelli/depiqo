import {
	type AddAssetsToEquipmentTypeBodyDto,
	AddAssetsToEquipmentTypeBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";
import { emptyToNull } from "@/shared/utils/form.utils";

export const addAssetsToEquipmentTypeAssetFormSchema = z.object({
	branchId: z.string().min(1, "La sucursal es obligatoria"),
	ownerId: z.string(),
	serialNumber: z.string(),
	notes: z.string(),
});

export const addAssetsToEquipmentTypeFormSchema = z.object({
	assets: z
		.array(addAssetsToEquipmentTypeAssetFormSchema)
		.min(1, "Agrega al menos un asset"),
});

export type AddAssetsToEquipmentTypeAssetFormValues = z.infer<
	typeof addAssetsToEquipmentTypeAssetFormSchema
>;
export type AddAssetsToEquipmentTypeFormValues = z.infer<
	typeof addAssetsToEquipmentTypeFormSchema
>;

export function createEmptyEquipmentTypeAsset(): AddAssetsToEquipmentTypeAssetFormValues {
	return {
		branchId: "",
		ownerId: "",
		serialNumber: "",
		notes: "",
	};
}

export function addAssetsToEquipmentTypeFormDefaultValues(): AddAssetsToEquipmentTypeFormValues {
	return {
		assets: [createEmptyEquipmentTypeAsset()],
	};
}

export function toAddAssetsToEquipmentTypeDto(
	values: AddAssetsToEquipmentTypeFormValues,
): AddAssetsToEquipmentTypeBodyDto {
	const dto = {
		assets: values.assets.map((asset) => ({
			branchId: asset.branchId,
			ownerId: emptyToNull(asset.ownerId),
			serialNumber: emptyToNull(asset.serialNumber),
			notes: emptyToNull(asset.notes),
		})),
	};

	return AddAssetsToEquipmentTypeBodySchema.parse(dto);
}
