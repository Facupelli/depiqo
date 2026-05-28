import {
	type CreateEquipmentTypeBodyDto,
	CreateEquipmentTypeBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";
import { emptyToNull } from "@/shared/utils/form.utils";

export const createEquipmentTypeAssetFormSchema = z.object({
	branchId: z.string().min(1, "La sucursal es obligatoria"),
	ownerId: z.string(),
	serialNumber: z.string(),
	notes: z.string(),
});

export const createEquipmentTypeFormSchema = z.object({
	name: z.string().min(1, "El nombre es obligatorio"),
	description: z.string(),
	assets: z.array(createEquipmentTypeAssetFormSchema),
});

export type CreateEquipmentTypeAssetFormValues = z.infer<
	typeof createEquipmentTypeAssetFormSchema
>;
export type CreateEquipmentTypeFormValues = z.infer<
	typeof createEquipmentTypeFormSchema
>;

export function createEmptyEquipmentTypeAsset(): CreateEquipmentTypeAssetFormValues {
	return {
		branchId: "",
		ownerId: "",
		serialNumber: "",
		notes: "",
	};
}

export function createEquipmentTypeFormDefaultValues(): CreateEquipmentTypeFormValues {
	return {
		name: "",
		description: "",
		assets: [],
	};
}

export function toCreateEquipmentTypeDto(
	values: CreateEquipmentTypeFormValues,
): CreateEquipmentTypeBodyDto {
	const dto = {
		name: values.name.trim(),
		description: emptyToNull(values.description),
		assets: values.assets.map((asset) => ({
			branchId: asset.branchId,
			ownerId: emptyToNull(asset.ownerId),
			serialNumber: emptyToNull(asset.serialNumber),
			notes: emptyToNull(asset.notes),
		})),
	};

	return CreateEquipmentTypeBodySchema.parse(dto);
}
