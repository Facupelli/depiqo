import type { RegisterDto, RegisterResponse } from "@repo/schemas";
import { type UseMutationOptions, useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import type { SessionUser } from "@/lib/session";
import type { ProblemDetailsError } from "@/shared/errors";
import { userKeys } from "../user/user.queries";
import {
	loginUserFn,
	logoutFn,
	registerTenantUserFn,
} from "./auth-actions.api";
import type { LoginDto } from "./schemas/login-form.schema";

// -----------------------------------------------------
// Types
// -----------------------------------------------------

type OwnerMutationOptions = Omit<
	UseMutationOptions<RegisterResponse, ProblemDetailsError, RegisterDto>,
	"mutationFn"
>;

// -----------------------------------------------------
// Hooks
// -----------------------------------------------------

export function useLogin() {
	const router = useRouter();
	const login = useServerFn(loginUserFn);

	return useMutation<SessionUser, ProblemDetailsError, LoginDto>({
		mutationFn: (data) => login({ data }),
		meta: {
			invalidates: userKeys.all(),
		},
		onSuccess: async () => {
			await router.invalidate();
		},
	});
}

export function useLogout() {
	const router = useRouter();

	return useMutation<void, ProblemDetailsError>({
		mutationFn: () => logoutFn(),
		meta: {
			invalidates: userKeys.all(),
		},
		onSuccess: async () => {
			await router.invalidate();
			await router.navigate({ to: "/admin/login" });
		},
	});
}

export function useCreateTenantUser(options?: OwnerMutationOptions) {
	return useMutation<RegisterResponse, ProblemDetailsError, RegisterDto>({
		...options,
		mutationFn: (data) => registerTenantUserFn({ data }),
	});
}
