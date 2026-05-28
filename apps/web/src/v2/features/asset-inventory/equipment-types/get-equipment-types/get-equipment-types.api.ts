import {
	type GetEquipmentTypesQueryDto,
	GetEquipmentTypesQuerySchema,
	type GetEquipmentTypesResponseDto,
	GetEquipmentTypesResponseSchema,
	getEquipmentTypesContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export async function getEquipmentTypes(
	query?: GetEquipmentTypesQueryDto,
): Promise<GetEquipmentTypesResponseDto> {
	const parsedQuery = GetEquipmentTypesQuerySchema.parse(query ?? {});
	const searchParams = new URLSearchParams();

	if (parsedQuery.isActive !== undefined) {
		searchParams.set("isActive", String(parsedQuery.isActive));
	}

	if (parsedQuery.search !== undefined) {
		searchParams.set("search", parsedQuery.search);
	}

	if (parsedQuery.limit !== undefined) {
		searchParams.set("limit", String(parsedQuery.limit));
	}

	const path = searchParams.size
		? `${getEquipmentTypesContract.path}?${searchParams.toString()}`
		: getEquipmentTypesContract.path;

	const response = await apiFetch(path, {
		method: getEquipmentTypesContract.method,
	});

	return GetEquipmentTypesResponseSchema.parse(response);
}
