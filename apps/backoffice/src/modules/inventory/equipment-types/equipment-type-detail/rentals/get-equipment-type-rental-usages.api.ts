import {
	type GetEquipmentTypeRentalUsagesResponseDto,
	GetEquipmentTypeRentalUsagesResponseSchema,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getEquipmentTypeRentalUsages(
	equipmentTypeId: string,
): Promise<GetEquipmentTypeRentalUsagesResponseDto> {
	const response = await apiFetch<unknown>(
		`/backoffice/equipment-types/${encodeURIComponent(equipmentTypeId)}/rental-usages`,
	);
	return GetEquipmentTypeRentalUsagesResponseSchema.parse(response);
}
