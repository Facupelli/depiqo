import {
	type CreateIndividualRentalBodyDto,
	CreateIndividualRentalBodySchema,
	type GetEquipmentTypeSummaryResponseDto,
} from "@repo/api-contracts";
import { z } from "zod";
import { emptyToNull } from "@/shared/utils/form.utils";

export const createIndividualRentalFormSchema = z.object({
	name: z.string().trim().min(1, "El nombre es obligatorio"),
	description: z.string(),
	imageUrl: z.string(),
	categoryId: z.string(),
	branchIds: z
		.array(z.string().min(1))
		.min(1, "Selecciona al menos una sucursal"),
});

export type CreateIndividualRentalFormValues = z.infer<
	typeof createIndividualRentalFormSchema
>;

export function createIndividualRentalFormDefaultValues(
	equipmentType?: GetEquipmentTypeSummaryResponseDto,
	selectableCategories: readonly { id: string }[] = [],
): CreateIndividualRentalFormValues {
	const categoryId = equipmentType?.categoryId ?? "";

	return {
		name: equipmentType?.name ?? "",
		description: equipmentType?.description ?? "",
		imageUrl: equipmentType?.imageUrl ?? "",
		categoryId: selectableCategories.some(
			(category) => category.id === categoryId,
		)
			? categoryId
			: "",
		branchIds: [],
	};
}

export function toCreateIndividualRentalDto(
	equipmentTypeId: string,
	values: CreateIndividualRentalFormValues,
): CreateIndividualRentalBodyDto {
	return CreateIndividualRentalBodySchema.parse({
		equipmentTypeId,
		name: values.name.trim(),
		description: emptyToNull(values.description),
		imageUrl: emptyToNull(values.imageUrl),
		categoryId: emptyToNull(values.categoryId),
		branchIds: values.branchIds,
	});
}
