import {
	type ReplaceEquipmentTypeAccessoryDefaultsBodyDto,
	ReplaceEquipmentTypeAccessoryDefaultsBodySchema,
	ReplaceEquipmentTypeAccessoryDefaultsParamsSchema,
	type ReplaceEquipmentTypeAccessoryDefaultsResponseDto,
	ReplaceEquipmentTypeAccessoryDefaultsResponseSchema,
	replaceEquipmentTypeAccessoryDefaultsContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type ReplaceEquipmentAccessoriesVariables = {
	equipmentTypeId: string;
	body: ReplaceEquipmentTypeAccessoryDefaultsBodyDto;
};

export async function replaceEquipmentAccessories({
	body,
	equipmentTypeId,
}: ReplaceEquipmentAccessoriesVariables): Promise<ReplaceEquipmentTypeAccessoryDefaultsResponseDto> {
	const parsedParams = ReplaceEquipmentTypeAccessoryDefaultsParamsSchema.parse({
		equipmentTypeId,
	});
	const parsedBody =
		ReplaceEquipmentTypeAccessoryDefaultsBodySchema.parse(body);
	const path = replaceEquipmentTypeAccessoryDefaultsContract.path.replace(
		":equipmentTypeId",
		encodeURIComponent(parsedParams.equipmentTypeId),
	);

	const response = await apiFetch(path, {
		method: replaceEquipmentTypeAccessoryDefaultsContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});

	return ReplaceEquipmentTypeAccessoryDefaultsResponseSchema.parse(response);
}
