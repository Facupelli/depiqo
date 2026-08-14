import {
	GetOwnerDetailParamsSchema,
	type GetOwnerDetailResponseDto,
	GetOwnerDetailResponseSchema,
	getOwnerDetailContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getOwnerDetail(
	ownerId: string,
): Promise<GetOwnerDetailResponseDto> {
	const parsedParams = GetOwnerDetailParamsSchema.parse({ ownerId });
	const path = getOwnerDetailContract.path.replace(
		":ownerId",
		encodeURIComponent(parsedParams.ownerId),
	);

	const response = await apiFetch(path, {
		method: getOwnerDetailContract.method,
	});

	return GetOwnerDetailResponseSchema.parse(response);
}
