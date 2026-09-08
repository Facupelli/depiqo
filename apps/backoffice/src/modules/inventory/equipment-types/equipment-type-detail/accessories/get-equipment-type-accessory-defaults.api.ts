import {
	GetEquipmentTypeAccessoryDefaultsParamsSchema,
	type GetEquipmentTypeAccessoryDefaultsResponseDto,
	GetEquipmentTypeAccessoryDefaultsResponseSchema,
	getEquipmentTypeAccessoryDefaultsContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getEquipmentTypeAccessoryDefaults(
	equipmentTypeId: string,
): Promise<GetEquipmentTypeAccessoryDefaultsResponseDto> {
	const parsedParams = GetEquipmentTypeAccessoryDefaultsParamsSchema.parse({
		equipmentTypeId,
	});
	const path = getEquipmentTypeAccessoryDefaultsContract.path.replace(
		":equipmentTypeId",
		encodeURIComponent(parsedParams.equipmentTypeId),
	);

	const response = await apiFetch(path, {
		method: getEquipmentTypeAccessoryDefaultsContract.method,
	});

	return GetEquipmentTypeAccessoryDefaultsResponseSchema.parse(response);
}
