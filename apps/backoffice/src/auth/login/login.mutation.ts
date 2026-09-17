import type { LoginResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { ProblemDetailsError } from "@/shared/errors";
import { type LoginVariables, login } from "./login.api";

type LoginOptions = Omit<
	MutationOptions<LoginResponseDto, ProblemDetailsError, LoginVariables>,
	"mutationFn" | "mutationKey"
>;

export function useLogin(options?: LoginOptions) {
	const queryClient = useQueryClient();
	const router = useRouter();

	return useMutation<LoginResponseDto, ProblemDetailsError, LoginVariables>({
		...options,
		mutationFn: login,
		onSuccess: async (data, variables, result, context) => {
			queryClient.clear();
			await router.invalidate({ sync: true });
			await options?.onSuccess?.(data, variables, result, context);
		},
	});
}
