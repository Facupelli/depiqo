import {
	GetEquipmentTypeSummaryParamsSchema,
	type GetEquipmentTypeSummaryResponseDto,
	GetEquipmentTypeSummaryResponseSchema,
	getEquipmentTypeSummaryContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getEquipmentTypeSummary(
	equipmentTypeId: string,
): Promise<GetEquipmentTypeSummaryResponseDto> {
	const parsedParams = GetEquipmentTypeSummaryParamsSchema.parse({
		equipmentTypeId,
	});
	const path = getEquipmentTypeSummaryContract.path.replace(
		":equipmentTypeId",
		encodeURIComponent(parsedParams.equipmentTypeId),
	);

	const response = await apiFetch(path, {
		method: getEquipmentTypeSummaryContract.method,
	});

	return GetEquipmentTypeSummaryResponseSchema.parse(response);
}
