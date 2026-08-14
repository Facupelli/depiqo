import {
	type CreateRentableEquipmentBodyDto,
	CreateRentableEquipmentBodySchema,
	type CreateRentableEquipmentResponseDto,
	CreateRentableEquipmentResponseSchema,
	createRentableEquipmentContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function createRentableEquipment(
	body: CreateRentableEquipmentBodyDto,
): Promise<CreateRentableEquipmentResponseDto> {
	const parsedBody = CreateRentableEquipmentBodySchema.parse(body);

	const response = await apiFetch(createRentableEquipmentContract.path, {
		method: createRentableEquipmentContract.method,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	return CreateRentableEquipmentResponseSchema.parse(response);
}
