import {
	type CreateEquipmentTypeAccessoryDefaultsBodyDto,
	CreateEquipmentTypeAccessoryDefaultsBodySchema,
	CreateEquipmentTypeAccessoryDefaultsParamsSchema,
	type CreateEquipmentTypeAccessoryDefaultsResponseDto,
	CreateEquipmentTypeAccessoryDefaultsResponseSchema,
	createEquipmentTypeAccessoryDefaultsContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type CreateEquipmentTypeAccessoryDefaultsVariables = {
	equipmentTypeId: string;
	body: CreateEquipmentTypeAccessoryDefaultsBodyDto;
};

export async function createEquipmentTypeAccessoryDefaults({
	body,
	equipmentTypeId,
}: CreateEquipmentTypeAccessoryDefaultsVariables): Promise<CreateEquipmentTypeAccessoryDefaultsResponseDto> {
	const parsedParams = CreateEquipmentTypeAccessoryDefaultsParamsSchema.parse({
		equipmentTypeId,
	});
	const parsedBody = CreateEquipmentTypeAccessoryDefaultsBodySchema.parse(body);
	const path = createEquipmentTypeAccessoryDefaultsContract.path.replace(
		":equipmentTypeId",
		encodeURIComponent(parsedParams.equipmentTypeId),
	);

	const response = await apiFetch(path, {
		method: createEquipmentTypeAccessoryDefaultsContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});

	return CreateEquipmentTypeAccessoryDefaultsResponseSchema.parse(response);
}
