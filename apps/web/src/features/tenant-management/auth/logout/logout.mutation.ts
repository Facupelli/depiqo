import type { MutationOptions } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { ProblemDetailsError } from "@/shared/errors";
import { v2AuthKeys } from "../auth.queries";
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
		meta: {
			...options?.meta,
		},
		onSuccess: async () => {
			queryClient.removeQueries({ queryKey: v2AuthKeys.all() });
			await router.invalidate();
			await router.navigate({ to: "/admin/login", replace: true });
		},
	});
}
