import {
	type AddAssetsToEquipmentTypeBodyDto,
	AddAssetsToEquipmentTypeBodySchema,
	AddAssetsToEquipmentTypeParamsSchema,
	type AddAssetsToEquipmentTypeResponseDto,
	AddAssetsToEquipmentTypeResponseSchema,
	addAssetsToEquipmentTypeContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type AddAssetsToEquipmentTypeVariables = {
	equipmentTypeId: string;
	body: AddAssetsToEquipmentTypeBodyDto;
};

export async function addAssetsToEquipmentType({
	body,
	equipmentTypeId,
}: AddAssetsToEquipmentTypeVariables): Promise<AddAssetsToEquipmentTypeResponseDto> {
	const parsedParams = AddAssetsToEquipmentTypeParamsSchema.parse({
		equipmentTypeId,
	});
	const parsedBody = AddAssetsToEquipmentTypeBodySchema.parse(body);
	const path = addAssetsToEquipmentTypeContract.path.replace(
		":equipmentTypeId",
		encodeURIComponent(parsedParams.equipmentTypeId),
	);

	const response = await apiFetch(path, {
		method: addAssetsToEquipmentTypeContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});

	return AddAssetsToEquipmentTypeResponseSchema.parse(response);
}
