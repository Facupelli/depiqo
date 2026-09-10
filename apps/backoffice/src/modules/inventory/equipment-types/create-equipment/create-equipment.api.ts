import {
	type CreateEquipmentBodyDto,
	CreateEquipmentBodySchema,
	type CreateEquipmentResponseDto,
	CreateEquipmentResponseSchema,
	createEquipmentContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function createEquipment(
	body: CreateEquipmentBodyDto,
): Promise<CreateEquipmentResponseDto> {
	const parsedBody = CreateEquipmentBodySchema.parse(body);
	const response = await apiFetch(createEquipmentContract.path, {
		method: createEquipmentContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});

	return CreateEquipmentResponseSchema.parse(response);
}
