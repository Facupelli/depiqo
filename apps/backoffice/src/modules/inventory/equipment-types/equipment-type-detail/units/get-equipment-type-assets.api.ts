import {
	type GetEquipmentTypeAssetsQueryDto,
	GetEquipmentTypeAssetsQuerySchema,
	GetEquipmentTypeAssetsParamsSchema,
	type GetEquipmentTypeAssetsResponseDto,
	GetEquipmentTypeAssetsResponseSchema,
	getEquipmentTypeAssetsContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

const QUERY_KEYS = [
	"search",
	"status",
	"branchId",
	"ownerId",
	"page",
	"pageSize",
] as const satisfies readonly (keyof GetEquipmentTypeAssetsQueryDto)[];

export function normalizeEquipmentTypeAssetsQuery(
	query: GetEquipmentTypeAssetsQueryDto,
): GetEquipmentTypeAssetsQueryDto {
	return GetEquipmentTypeAssetsQuerySchema.parse(query);
}

export async function getEquipmentTypeAssets(
	equipmentTypeId: string,
	query: GetEquipmentTypeAssetsQueryDto,
): Promise<GetEquipmentTypeAssetsResponseDto> {
	const params = GetEquipmentTypeAssetsParamsSchema.parse({ equipmentTypeId });
	const normalizedQuery = normalizeEquipmentTypeAssetsQuery(query);
	const searchParams = new URLSearchParams();

	for (const key of QUERY_KEYS) {
		const value = normalizedQuery[key];
		if (value !== undefined) searchParams.set(key, String(value));
	}

	const contractPath = getEquipmentTypeAssetsContract.path.replace(
		":equipmentTypeId",
		encodeURIComponent(params.equipmentTypeId),
	);
	const path = searchParams.size
		? `${contractPath}?${searchParams.toString()}`
		: contractPath;
	const response = await apiFetch(path, {
		method: getEquipmentTypeAssetsContract.method,
	});

	return GetEquipmentTypeAssetsResponseSchema.parse(response);
}
