import {
	type CreatePackageBodyDto,
	CreatePackageBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";
import { comboRequirementsFormSchema } from "@/modules/products/combo-form/combo-requirement.schema";
import { emptyToNull } from "@/shared/utils/form.utils";

export const createComboFormSchema = z.object({
	categoryId: z.string(),
	name: z.string().trim().min(1, "El nombre es obligatorio"),
	imageUrl: z.string(),
	description: z.string(),
	branchIds: z
		.array(z.string().min(1))
		.min(1, "Selecciona al menos una sucursal"),
	requirements: comboRequirementsFormSchema,
});

export type CreateComboFormValues = z.infer<typeof createComboFormSchema>;

export function createComboFormDefaultValues(): CreateComboFormValues {
	return {
		categoryId: "",
		name: "",
		imageUrl: "",
		description: "",
		branchIds: [],
		requirements: [],
	};
}

export function toCreateComboDto(
	values: CreateComboFormValues,
): CreatePackageBodyDto {
	const dto = {
		name: values.name.trim(),
		description: emptyToNull(values.description),
		imageUrl: emptyToNull(values.imageUrl),
		categoryId: emptyToNull(values.categoryId),
		branchIds: values.branchIds,
		requirements: values.requirements.map((requirement) => ({
			equipmentTypeId: requirement.equipmentTypeId,
			quantityPerItem: requirement.quantityPerItem,
		})),
	};

	return CreatePackageBodySchema.parse(dto);
}
