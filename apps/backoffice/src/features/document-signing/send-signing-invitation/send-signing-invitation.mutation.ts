import type { SendSigningInvitationResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { documentSigningKeys } from "../document-signing.queries";
import {
	type SendSigningInvitationVariables,
	sendSigningInvitation,
} from "./send-signing-invitation.api";

type SendSigningInvitationOptions = Omit<
	MutationOptions<
		SendSigningInvitationResponseDto,
		ProblemDetailsError,
		SendSigningInvitationVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useSendSigningInvitation(
	options?: SendSigningInvitationOptions,
) {
	return useMutation<
		SendSigningInvitationResponseDto,
		ProblemDetailsError,
		SendSigningInvitationVariables
	>({
		...options,
		mutationFn: sendSigningInvitation,
		meta: {
			invalidates: (variables: SendSigningInvitationVariables) =>
				documentSigningKeys.sessions(variables.orderId),
			...options?.meta,
		},
	});
}
