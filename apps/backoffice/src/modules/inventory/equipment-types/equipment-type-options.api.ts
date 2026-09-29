import {
	type GetEquipmentTypesQueryDto,
	GetEquipmentTypesQuerySchema,
	type GetEquipmentTypesResponseDto,
	GetEquipmentTypesResponseSchema,
	getEquipmentTypesContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getEquipmentTypes(
	query?: GetEquipmentTypesQueryDto,
): Promise<GetEquipmentTypesResponseDto> {
	const parsedQuery = GetEquipmentTypesQuerySchema.parse({
		...query,
		...(query?.excludeIds?.length
			? { excludeIds: query.excludeIds.join(",") }
			: {}),
	});
	const searchParams = new URLSearchParams();

	if (parsedQuery.search !== undefined) {
		searchParams.set("search", parsedQuery.search);
	}

	if (parsedQuery.limit !== undefined) {
		searchParams.set("limit", String(parsedQuery.limit));
	}

	if (parsedQuery.excludeIds !== undefined) {
		searchParams.set("excludeIds", parsedQuery.excludeIds.join(","));
	}

	const serializedSearchParams = searchParams.toString();
	const path = serializedSearchParams
		? `${getEquipmentTypesContract.path}?${serializedSearchParams}`
		: getEquipmentTypesContract.path;

	const response = await apiFetch(path, {
		method: getEquipmentTypesContract.method,
	});

	return GetEquipmentTypesResponseSchema.parse(response);
}
