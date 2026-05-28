import {
	type AcceptPublicSigningSessionBodyDto,
	AcceptPublicSigningSessionBodySchema,
	type AcceptPublicSigningSessionResponseDto,
	AcceptPublicSigningSessionResponseSchema,
	acceptPublicSigningSessionContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export type AcceptPublicSigningSessionVariables = {
	token: string;
	body: AcceptPublicSigningSessionBodyDto;
};

export async function acceptPublicSigningSession({
	token,
	body,
}: AcceptPublicSigningSessionVariables): Promise<AcceptPublicSigningSessionResponseDto> {
	const parsedBody = AcceptPublicSigningSessionBodySchema.parse(body);

	const response = await apiFetch(acceptPublicSigningSessionContract.path, {
		method: acceptPublicSigningSessionContract.method,
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(parsedBody),
	});

	return AcceptPublicSigningSessionResponseSchema.parse(response);
}
