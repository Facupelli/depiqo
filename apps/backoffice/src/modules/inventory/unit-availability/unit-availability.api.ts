import { getAssetAvailabilityTimelineContract } from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";
import type { TimelineWeek } from "./unit-availability.utils";

export type UnitAvailabilityInput = TimelineWeek & {
	branchId: string;
	page: number;
	equipmentTypeIds: string[];
	assetIds: string[];
};

export function unitAvailabilityRequest(input: UnitAvailabilityInput) {
	const contract = getAssetAvailabilityTimelineContract;
	const query = contract.query.parse({
		...input,
		equipmentTypeIds: input.equipmentTypeIds.length
			? input.equipmentTypeIds.join(",")
			: undefined,
		assetIds: input.assetIds.length ? input.assetIds.join(",") : undefined,
	});
	const params = new URLSearchParams({
		branchId: query.branchId,
		from: query.from,
		to: query.to,
		page: String(query.page),
		pageSize: String(query.pageSize),
	});
	if (query.equipmentTypeIds?.length)
		params.set("equipmentTypeIds", query.equipmentTypeIds.join(","));
	if (query.assetIds?.length) params.set("assetIds", query.assetIds.join(","));
	return `${contract.path}?${params}`;
}

export async function getUnitAvailability(
	input: UnitAvailabilityInput,
	signal: AbortSignal,
) {
	const contract = getAssetAvailabilityTimelineContract;
	const response = await apiFetch(unitAvailabilityRequest(input), {
		method: contract.method,
		signal,
	});
	return contract.response.parse(response);
}
