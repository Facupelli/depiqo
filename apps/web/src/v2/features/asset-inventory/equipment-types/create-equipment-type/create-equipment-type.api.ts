import {
	type CreateEquipmentTypeBodyDto,
	CreateEquipmentTypeBodySchema,
	type CreateEquipmentTypeResponseDto,
	CreateEquipmentTypeResponseSchema,
	createEquipmentTypeContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export type CreateEquipmentTypeVariables = CreateEquipmentTypeBodyDto;

export async function createEquipmentType(
	body: CreateEquipmentTypeVariables,
): Promise<CreateEquipmentTypeResponseDto> {
	const parsedBody = CreateEquipmentTypeBodySchema.parse(body);

	const response = await apiFetch(createEquipmentTypeContract.path, {
		method: createEquipmentTypeContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});

	return CreateEquipmentTypeResponseSchema.parse(response);
}
