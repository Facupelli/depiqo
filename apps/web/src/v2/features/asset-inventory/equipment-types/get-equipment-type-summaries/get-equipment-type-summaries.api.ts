import {
	type GetEquipmentTypeSummariesQueryDto,
	GetEquipmentTypeSummariesQuerySchema,
	type GetEquipmentTypeSummariesResponseDto,
	GetEquipmentTypeSummariesResponseSchema,
	getEquipmentTypeSummariesContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

const GET_EQUIPMENT_TYPE_SUMMARIES_QUERY_PARAM_KEYS = [
	"search",
	"isActive",
	"branchId",
	"page",
	"pageSize",
] as const satisfies readonly (keyof GetEquipmentTypeSummariesQueryDto)[];

function buildGetEquipmentTypeSummariesPath(
	query?: GetEquipmentTypeSummariesQueryDto,
) {
	const parsedQuery = GetEquipmentTypeSummariesQuerySchema.parse(query ?? {});
	const searchParams = new URLSearchParams();

	for (const key of GET_EQUIPMENT_TYPE_SUMMARIES_QUERY_PARAM_KEYS) {
		if (query?.[key] === undefined) {
			continue;
		}

		const value = parsedQuery[key];

		if (value !== undefined) {
			searchParams.set(key, String(value));
		}
	}

	return searchParams.size
		? `${getEquipmentTypeSummariesContract.path}?${searchParams.toString()}`
		: getEquipmentTypeSummariesContract.path;
}

export async function getEquipmentTypeSummaries(
	query?: GetEquipmentTypeSummariesQueryDto,
): Promise<GetEquipmentTypeSummariesResponseDto> {
	const response = await apiFetch(buildGetEquipmentTypeSummariesPath(query), {
		method: getEquipmentTypeSummariesContract.method,
	});

	return GetEquipmentTypeSummariesResponseSchema.parse(response);
}
