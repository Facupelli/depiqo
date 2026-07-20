import {
	type GetPublicSigningSessionResponseDto,
	GetPublicSigningSessionResponseSchema,
	getPublicSigningSessionContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type GetPublicSigningSessionVariables = {
	token: string;
};

export async function getPublicSigningSession({
	token,
}: GetPublicSigningSessionVariables): Promise<GetPublicSigningSessionResponseDto> {
	const response = await apiFetch(getPublicSigningSessionContract.path, {
		method: getPublicSigningSessionContract.method,
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	return GetPublicSigningSessionResponseSchema.parse(response);
}
