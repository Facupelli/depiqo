import {
	type GetEquipmentTypeDetailResponseDto,
	type UpdateAssetBodyDto,
	UpdateAssetBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";
import { emptyToNull } from "@/shared/utils/form.utils";

export const editAssetFormSchema = z.object({
	serialNumber: z.string(),
	notes: z.string(),
});

export type EditAssetFormValues = z.infer<typeof editAssetFormSchema>;

export function fromUnitToEditFormValues(
	unit: GetEquipmentTypeDetailResponseDto["assets"][number],
): EditAssetFormValues {
	return {
		serialNumber: unit.serialNumber ?? "",
		notes: unit.notes ?? "",
	};
}

export function toUpdateDto(values: EditAssetFormValues): UpdateAssetBodyDto {
	const dto = {
		serialNumber: emptyToNull(values.serialNumber),
		notes: emptyToNull(values.notes),
	};

	return UpdateAssetBodySchema.parse(dto);
}
