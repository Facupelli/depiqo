import type {
	GetRentableItemDetailResponseDto,
	UpdateRentableItemDefinitionBodyDto,
} from "@repo/api-contracts";
import { UpdateRentableItemDefinitionBodySchema } from "@repo/api-contracts";
import { z } from "zod";
import { emptyToNull } from "@/shared/utils/form.utils";
import { comboRequirementsFormSchema } from "../combo-form/combo-requirement.schema";
export const editComboFormSchema = z.object({
	categoryId: z.string(),
	name: z.string().trim().min(1, "El nombre es obligatorio"),
	imageUrl: z.string(),
	description: z.string(),
	requirements: comboRequirementsFormSchema,
});
export type EditComboFormValues = z.infer<typeof editComboFormSchema>;
export function fromComboDetailToFormValues(
	combo: GetRentableItemDetailResponseDto,
): EditComboFormValues {
	return {
		categoryId: combo.categoryId ?? "",
		name: combo.name,
		imageUrl: combo.imageUrl ?? "",
		description: combo.description ?? "",
		requirements: combo.requiredEquipment.map((item) => ({
			equipmentTypeId: item.equipmentTypeId,
			equipmentTypeName:
				item.equipmentTypeName?.trim() || "Equipo no disponible",
			quantityPerItem: item.quantityPerItem,
		})),
	};
}
export function toUpdateComboDto(
	values: EditComboFormValues,
): UpdateRentableItemDefinitionBodyDto {
	return UpdateRentableItemDefinitionBodySchema.parse({
		name: values.name.trim(),
		categoryId: emptyToNull(values.categoryId),
		imageUrl: emptyToNull(values.imageUrl),
		description: emptyToNull(values.description),
		requirements: values.requirements.map(
			({ equipmentTypeId, quantityPerItem }) => ({
				equipmentTypeId,
				quantityPerItem,
			}),
		),
	});
}
