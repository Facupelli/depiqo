import {
	BranchDeliveryConfigurationParamsSchema,
	GetBranchDeliveryConfigurationResponseSchema,
	getBranchDeliveryConfigurationContract,
	type PutBranchDeliveryConfigurationBodyDto,
	PutBranchDeliveryConfigurationBodySchema,
	PutBranchDeliveryConfigurationResponseSchema,
	putBranchDeliveryConfigurationContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getDeliveryConfiguration(branchId: string) {
	const params = BranchDeliveryConfigurationParamsSchema.parse({ branchId });
	const path = getBranchDeliveryConfigurationContract.path.replace(
		":branchId",
		encodeURIComponent(params.branchId),
	);
	const response = await apiFetch(path, {
		method: getBranchDeliveryConfigurationContract.method,
	});
	return GetBranchDeliveryConfigurationResponseSchema.parse(response);
}

export type PutDeliveryConfigurationVariables = {
	branchId: string;
	body: PutBranchDeliveryConfigurationBodyDto;
};

export async function putDeliveryConfiguration({
	branchId,
	body,
}: PutDeliveryConfigurationVariables) {
	const params = BranchDeliveryConfigurationParamsSchema.parse({ branchId });
	const parsedBody = PutBranchDeliveryConfigurationBodySchema.parse(body);
	const path = putBranchDeliveryConfigurationContract.path.replace(
		":branchId",
		encodeURIComponent(params.branchId),
	);
	const response = await apiFetch(path, {
		method: putBranchDeliveryConfigurationContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});
	return PutBranchDeliveryConfigurationResponseSchema.parse(response);
}
