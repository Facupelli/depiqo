import {
	type RemoveConfirmedPackageDemandLineBodyDto,
	RemoveConfirmedPackageDemandLineBodySchema,
	type RemoveConfirmedPackageDemandLineParamsDto,
	RemoveConfirmedPackageDemandLineParamsSchema,
	type RemoveConfirmedPackageDemandLineResponseDto,
	RemoveConfirmedPackageDemandLineResponseSchema,
	removeConfirmedPackageDemandLineContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type RemovePackageDemandLineVariables =
	RemoveConfirmedPackageDemandLineParamsDto &
		RemoveConfirmedPackageDemandLineBodyDto;

export async function removePackageDemandLine({
	rentalId,
	demandLineId,
	...body
}: RemovePackageDemandLineVariables): Promise<RemoveConfirmedPackageDemandLineResponseDto> {
	const params = RemoveConfirmedPackageDemandLineParamsSchema.parse({
		rentalId,
		demandLineId,
	});
	const parsedBody = RemoveConfirmedPackageDemandLineBodySchema.parse(body);
	const path = removeConfirmedPackageDemandLineContract.path
		.replace(":rentalId", encodeURIComponent(params.rentalId))
		.replace(":demandLineId", encodeURIComponent(params.demandLineId));
	const response = await apiFetch(path, {
		method: removeConfirmedPackageDemandLineContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});

	return RemoveConfirmedPackageDemandLineResponseSchema.parse(response);
}
