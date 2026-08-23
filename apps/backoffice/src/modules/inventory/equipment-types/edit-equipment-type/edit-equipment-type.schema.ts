import {
	type GetEquipmentTypeDetailResponseDto,
	type UpdateEquipmentTypeBodyDto,
	UpdateEquipmentTypeBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";
import { emptyToNull } from "@/shared/utils/form.utils";

export const editEquipmentTypeFormSchema = z.object({
	categoryId: z.string(),
	name: z.string().min(1, "El nombre es obligatorio"),
	description: z.string(),
	imageUrl: z.string(),
});

export type EditEquipmentTypeFormValues = z.infer<
	typeof editEquipmentTypeFormSchema
>;

export function fromEquipmentTypeDetailToEditFormValues(
	equipmentType: GetEquipmentTypeDetailResponseDto,
): EditEquipmentTypeFormValues {
	return {
		categoryId: equipmentType.categoryId ?? "",
		name: equipmentType.name,
		description: equipmentType.description ?? "",
		imageUrl: equipmentType.imageUrl ?? "",
	};
}

export function toUpdateEquipmentTypeDto(
	values: EditEquipmentTypeFormValues,
): UpdateEquipmentTypeBodyDto {
	const dto = {
		name: values.name.trim(),
		description: emptyToNull(values.description),
		imageUrl: emptyToNull(values.imageUrl),
		categoryId: emptyToNull(values.categoryId),
	};

	return UpdateEquipmentTypeBodySchema.parse(dto);
}
