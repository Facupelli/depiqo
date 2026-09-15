import {
	type RestoreConfirmedPackageDemandLineBodyDto,
	RestoreConfirmedPackageDemandLineBodySchema,
	type RestoreConfirmedPackageDemandLineParamsDto,
	RestoreConfirmedPackageDemandLineParamsSchema,
	type RestoreConfirmedPackageDemandLineResponseDto,
	RestoreConfirmedPackageDemandLineResponseSchema,
	restoreConfirmedPackageDemandLineContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type RestorePackageDemandLineVariables =
	RestoreConfirmedPackageDemandLineParamsDto &
		RestoreConfirmedPackageDemandLineBodyDto;

export async function restorePackageDemandLine({
	rentalId,
	demandLineId,
	...body
}: RestorePackageDemandLineVariables): Promise<RestoreConfirmedPackageDemandLineResponseDto> {
	const params = RestoreConfirmedPackageDemandLineParamsSchema.parse({
		rentalId,
		demandLineId,
	});
	const parsedBody = RestoreConfirmedPackageDemandLineBodySchema.parse(body);
	const path = restoreConfirmedPackageDemandLineContract.path
		.replace(":rentalId", encodeURIComponent(params.rentalId))
		.replace(":demandLineId", encodeURIComponent(params.demandLineId));
	const response = await apiFetch(path, {
		method: restoreConfirmedPackageDemandLineContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});

	return RestoreConfirmedPackageDemandLineResponseSchema.parse(response);
}
