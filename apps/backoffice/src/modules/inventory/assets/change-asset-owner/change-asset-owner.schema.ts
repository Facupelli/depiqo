import {
	type ChangeAssetOwnerBodyDto,
	ChangeAssetOwnerBodySchema,
	type GetEquipmentTypeDetailResponseDto,
} from "@repo/api-contracts";
import { z } from "zod";

export const changeAssetOwnerFormSchema = z.object({
	ownerId: z.string(),
});

export type ChangeAssetOwnerFormValues = z.infer<
	typeof changeAssetOwnerFormSchema
>;

export function fromUnitToChangeAssetOwnerFormValues(
	unit: GetEquipmentTypeDetailResponseDto["assets"][number],
): ChangeAssetOwnerFormValues {
	return {
		ownerId: unit.ownerId ?? "",
	};
}

export function toChangeAssetOwnerDto(
	values: ChangeAssetOwnerFormValues,
): ChangeAssetOwnerBodyDto {
	const dto = {
		ownerId: values.ownerId.trim() || null,
	};

	return ChangeAssetOwnerBodySchema.parse(dto);
}
