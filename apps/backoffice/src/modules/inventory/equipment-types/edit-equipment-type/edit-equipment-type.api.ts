import {
	type UpdateEquipmentTypeBodyDto,
	UpdateEquipmentTypeBodySchema,
	UpdateEquipmentTypeParamsSchema,
	type UpdateEquipmentTypeResponseDto,
	UpdateEquipmentTypeResponseSchema,
	updateEquipmentTypeContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type UpdateEquipmentTypeVariables = {
	equipmentTypeId: string;
	body: UpdateEquipmentTypeBodyDto;
};

export async function updateEquipmentType({
	body,
	equipmentTypeId,
}: UpdateEquipmentTypeVariables): Promise<UpdateEquipmentTypeResponseDto> {
	const parsedParams = UpdateEquipmentTypeParamsSchema.parse({
		equipmentTypeId,
	});
	const parsedBody = UpdateEquipmentTypeBodySchema.parse(body);
	const path = updateEquipmentTypeContract.path.replace(
		":equipmentTypeId",
		encodeURIComponent(parsedParams.equipmentTypeId),
	);

	const response = await apiFetch(path, {
		method: updateEquipmentTypeContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});

	return UpdateEquipmentTypeResponseSchema.parse(response);
}
