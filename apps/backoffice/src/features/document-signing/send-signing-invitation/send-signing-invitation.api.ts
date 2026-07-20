import {
	type SendSigningInvitationBodyDto,
	SendSigningInvitationBodySchema,
	type SendSigningInvitationParamsDto,
	SendSigningInvitationParamsSchema,
	type SendSigningInvitationResponseDto,
	SendSigningInvitationResponseSchema,
	sendSigningInvitationContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type SendSigningInvitationVariables = {
	orderId: SendSigningInvitationParamsDto["orderId"];
	body?: SendSigningInvitationBodyDto;
};

export async function sendSigningInvitation({
	orderId,
	body = {},
}: SendSigningInvitationVariables): Promise<SendSigningInvitationResponseDto> {
	const parsedParams = SendSigningInvitationParamsSchema.parse({ orderId });
	const parsedBody = SendSigningInvitationBodySchema.parse(body);
	const path = sendSigningInvitationContract.path.replace(
		":orderId",
		encodeURIComponent(parsedParams.orderId),
	);

	const response = await apiFetch(path, {
		method: sendSigningInvitationContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});

	return SendSigningInvitationResponseSchema.parse(response);
}
