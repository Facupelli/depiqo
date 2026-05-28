import {
	type CreateRentableEquipmentBodyDto,
	CreateRentableEquipmentBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";
import { emptyToNull } from "@/shared/utils/form.utils";

export const createRentableEquipmentAssetFormSchema = z.object({
	branchId: z.string().min(1, "La sucursal es obligatoria"),
	serialNumber: z.string(),
	notes: z.string(),
	ownerId: z.string(),
});

export const createRentableEquipmentFormSchema = z.object({
	categoryId: z.string(),
	name: z.string().min(1, "El nombre es obligatorio"),
	imageUrl: z.string(),
	description: z.string(),
	quantityPerItem: z.number().int().positive("Debe ser mayor o igual a 1"),
	assets: z.array(createRentableEquipmentAssetFormSchema),
});

export type CreateRentableEquipmentAssetFormValues = z.infer<
	typeof createRentableEquipmentAssetFormSchema
>;
export type CreateRentableEquipmentFormValues = z.infer<
	typeof createRentableEquipmentFormSchema
>;

export function createEmptyRentableEquipmentAsset(): CreateRentableEquipmentAssetFormValues {
	return {
		branchId: "",
		serialNumber: "",
		notes: "",
		ownerId: "",
	};
}

export function createRentableEquipmentFormDefaultValues(): CreateRentableEquipmentFormValues {
	return {
		categoryId: "",
		name: "",
		imageUrl: "",
		description: "",
		quantityPerItem: 1,
		assets: [],
	};
}

export function toCreateRentableEquipmentDto(
	values: CreateRentableEquipmentFormValues,
): CreateRentableEquipmentBodyDto {
	const dto = {
		name: values.name.trim(),
		description: emptyToNull(values.description),
		imageUrl: emptyToNull(values.imageUrl),
		categoryId: emptyToNull(values.categoryId),
		kind: "SINGLE" as const,
		quantityPerItem: 1,
		assets: values.assets.map((asset) => ({
			branchId: asset.branchId,
			serialNumber: emptyToNull(asset.serialNumber),
			notes: emptyToNull(asset.notes),
			ownerId: emptyToNull(asset.ownerId),
		})),
	};

	return CreateRentableEquipmentBodySchema.parse(dto);
}
