import {
	GetEquipmentTypeDetailParamsSchema,
	type GetEquipmentTypeDetailResponseDto,
	GetEquipmentTypeDetailResponseSchema,
	getEquipmentTypeDetailContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getEquipmentTypeDetail(
	equipmentTypeId: string,
): Promise<GetEquipmentTypeDetailResponseDto> {
	const parsedParams = GetEquipmentTypeDetailParamsSchema.parse({
		equipmentTypeId,
	});
	const path = getEquipmentTypeDetailContract.path.replace(
		":equipmentTypeId",
		encodeURIComponent(parsedParams.equipmentTypeId),
	);

	const response = await apiFetch(path, {
		method: getEquipmentTypeDetailContract.method,
	});

	return GetEquipmentTypeDetailResponseSchema.parse(response);
}
