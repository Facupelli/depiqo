import type { LoginResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { v2AuthKeys } from "../auth.queries";
import { type LoginVariables, login } from "./login.api";

type LoginOptions = Omit<
	MutationOptions<LoginResponseDto, ProblemDetailsError, LoginVariables>,
	"mutationFn" | "mutationKey"
>;

export function useLogin(options?: LoginOptions) {
	return useMutation<LoginResponseDto, ProblemDetailsError, LoginVariables>({
		...options,
		mutationFn: login,
		meta: {
			invalidates: v2AuthKeys.all(),
			...options?.meta,
		},
	});
}
