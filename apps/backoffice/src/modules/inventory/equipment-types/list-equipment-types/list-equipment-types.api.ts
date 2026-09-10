import {
	type ListEquipmentTypesQueryDto,
	ListEquipmentTypesQuerySchema,
	type ListEquipmentTypesResponseDto,
	ListEquipmentTypesResponseSchema,
	listEquipmentTypesContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

const LIST_EQUIPMENT_TYPES_QUERY_PARAM_KEYS = [
	"search",
	"categoryId",
	"branchId",
	"page",
	"pageSize",
] as const satisfies readonly (keyof ListEquipmentTypesQueryDto)[];

export function normalizeListEquipmentTypesQuery(
	query: ListEquipmentTypesQueryDto,
): ListEquipmentTypesQueryDto {
	return ListEquipmentTypesQuerySchema.parse(query);
}

function buildListEquipmentTypesPath(
	query: ListEquipmentTypesQueryDto,
): string {
	const parsedQuery = normalizeListEquipmentTypesQuery(query);
	const searchParams = new URLSearchParams();

	for (const key of LIST_EQUIPMENT_TYPES_QUERY_PARAM_KEYS) {
		const value = parsedQuery[key];
		if (value !== undefined) searchParams.set(key, String(value));
	}

	return searchParams.size
		? `${listEquipmentTypesContract.path}?${searchParams.toString()}`
		: listEquipmentTypesContract.path;
}

export async function listEquipmentTypes(
	query: ListEquipmentTypesQueryDto,
): Promise<ListEquipmentTypesResponseDto> {
	const response = await apiFetch(buildListEquipmentTypesPath(query), {
		method: listEquipmentTypesContract.method,
	});

	return ListEquipmentTypesResponseSchema.parse(response);
}
