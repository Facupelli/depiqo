import {
	type GetRentableItemDetailResponseDto,
	type UpdateRentableItemDefinitionBodyDto,
	UpdateRentableItemDefinitionBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";
import { emptyToNull } from "@/shared/utils/form.utils";

export interface ProductRequirementFormValues {
	equipmentTypeId: string;
	equipmentTypeName: string;
	quantityPerItem: number;
}

export const editProductRequirementFormSchema = z.object({
	equipmentTypeId: z.string().min(1, "El equipo es obligatorio"),
	equipmentTypeName: z.string().min(1),
	quantityPerItem: z
		.number()
		.int("Debe ser un número entero")
		.positive("Debe ser mayor o igual a 1"),
});

export const editProductFormSchema = z.object({
	categoryId: z.string(),
	name: z.string().min(1, "El nombre es obligatorio"),
	imageUrl: z.string(),
	description: z.string(),
	requirements: z
		.array(editProductRequirementFormSchema)
		.min(1, "Agrega al menos un equipo requerido")
		.refine(
			(requirements) =>
				new Set(requirements.map((requirement) => requirement.equipmentTypeId))
					.size === requirements.length,
			"Cada equipo puede agregarse una sola vez",
		),
});

export type EditProductFormValues = z.infer<typeof editProductFormSchema>;

export function fromProductDetailToEditProductFormValues(
	product: GetRentableItemDetailResponseDto,
): EditProductFormValues {
	return {
		categoryId: product.categoryId ?? "",
		name: product.name,
		imageUrl: product.imageUrl ?? "",
		description: product.description ?? "",
		requirements: product.requiredEquipment.map((requirement) => ({
			equipmentTypeId: requirement.equipmentTypeId,
			equipmentTypeName:
				requirement.equipmentTypeName ?? requirement.equipmentTypeId,
			quantityPerItem: requirement.quantityPerItem,
		})),
	};
}

export function toUpdateProductDto(
	values: EditProductFormValues,
): UpdateRentableItemDefinitionBodyDto {
	const dto = {
		name: values.name.trim(),
		description: emptyToNull(values.description),
		imageUrl: emptyToNull(values.imageUrl),
		categoryId: emptyToNull(values.categoryId),
		requirements: values.requirements.map((requirement) => ({
			equipmentTypeId: requirement.equipmentTypeId,
			quantityPerItem: requirement.quantityPerItem,
		})),
	};

	return UpdateRentableItemDefinitionBodySchema.parse(dto);
}
