import type { AcceptPublicSigningSessionResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { documentSigningKeys } from "../document-signing.queries";
import {
	type AcceptPublicSigningSessionVariables,
	acceptPublicSigningSession,
} from "./accept-public-signing-session.api";

type AcceptPublicSigningSessionOptions = Omit<
	MutationOptions<
		AcceptPublicSigningSessionResponseDto,
		ProblemDetailsError,
		AcceptPublicSigningSessionVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useAcceptPublicSigningSession(
	options?: AcceptPublicSigningSessionOptions,
) {
	return useMutation<
		AcceptPublicSigningSessionResponseDto,
		ProblemDetailsError,
		AcceptPublicSigningSessionVariables
	>({
		...options,
		mutationFn: acceptPublicSigningSession,
		meta: {
			invalidates: documentSigningKeys.publicSession(),
			...options?.meta,
		},
	});
}
