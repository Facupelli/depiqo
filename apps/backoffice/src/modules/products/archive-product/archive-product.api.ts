import {
	ArchiveRentableItemParamsSchema,
	type ArchiveRentableItemResponseDto,
	ArchiveRentableItemResponseSchema,
	archiveRentableItemContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export interface ArchiveProductVariables {
	rentableItemId: string;
}

export async function archiveProduct(
	variables: ArchiveProductVariables,
): Promise<ArchiveRentableItemResponseDto> {
	const parsedParams = ArchiveRentableItemParamsSchema.parse(variables);
	const path = archiveRentableItemContract.path.replace(
		":rentableItemId",
		encodeURIComponent(parsedParams.rentableItemId),
	);

	const response = await apiFetch(path, {
		method: archiveRentableItemContract.method,
	});

	return ArchiveRentableItemResponseSchema.parse(response);
}
