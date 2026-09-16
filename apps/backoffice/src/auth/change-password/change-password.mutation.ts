import type { ChangePasswordResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { ProblemDetailsError } from "@/shared/errors";
import { v2AuthKeys } from "../auth.queries";
import {
	type ChangePasswordVariables,
	changePassword,
} from "./change-password.api";

type ChangePasswordOptions = Omit<
	MutationOptions<
		ChangePasswordResponseDto,
		ProblemDetailsError,
		ChangePasswordVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useChangePassword(options?: ChangePasswordOptions) {
	const queryClient = useQueryClient();
	const router = useRouter();

	return useMutation<
		ChangePasswordResponseDto,
		ProblemDetailsError,
		ChangePasswordVariables
	>({
		...options,
		mutationFn: changePassword,
		onSuccess: async (data, variables, result, context) => {
			queryClient.removeQueries({ queryKey: v2AuthKeys.current() });
			await router.invalidate({ sync: true });
			await options?.onSuccess?.(data, variables, result, context);
		},
	});
}
