import {
	type GetEquipmentTypeProductUsagesResponseDto,
	GetEquipmentTypeProductUsagesResponseSchema,
	getEquipmentTypeProductUsagesContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getEquipmentTypeProductUsages(
	equipmentTypeIds: string[],
): Promise<GetEquipmentTypeProductUsagesResponseDto> {
	const parsedQuery = getEquipmentTypeProductUsagesContract.query.parse({
		equipmentTypeIds: equipmentTypeIds.join(","),
	});
	const searchParams = new URLSearchParams({
		equipmentTypeIds: parsedQuery.equipmentTypeIds.join(","),
	});
	const response = await apiFetch(
		`${getEquipmentTypeProductUsagesContract.path}?${searchParams.toString()}`,
		{ method: getEquipmentTypeProductUsagesContract.method },
	);

	return GetEquipmentTypeProductUsagesResponseSchema.parse(response);
}
