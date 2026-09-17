import type { MutationOptions } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { ProblemDetailsError } from "@/shared/errors";
import { logout } from "./logout.api";

type LogoutOptions = Omit<
	MutationOptions<void, ProblemDetailsError, void>,
	"mutationFn" | "mutationKey"
>;

export function useLogout(options?: LogoutOptions) {
	const router = useRouter();
	const queryClient = useQueryClient();

	return useMutation<void, ProblemDetailsError, void>({
		...options,
		mutationFn: logout,
		onSuccess: async (data, variables, result, context) => {
			queryClient.clear();
			await router.invalidate({ sync: true });
			await router.navigate({ to: "/login", replace: true });
			await options?.onSuccess?.(data, variables, result, context);
		},
	});
}
