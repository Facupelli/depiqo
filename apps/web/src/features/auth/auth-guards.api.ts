import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SessionPrincipal, SessionUser } from "@/lib/session";
import {
	AuthRequiredError,
	SessionExpiredError,
	WrongActorError,
} from "@/shared/errors";
import {
	getOptionalCustomerSession,
	getOptionalPrincipal,
	requireAdminSessionUser,
	requireCustomerSessionUser,
} from "./auth-guards.server";
import {
	authRedirectSearchSchema,
	toAuthRedirectSearch,
} from "./auth-redirect";

const guardInputSchema = z
	.object({
		loginPath: z.string(),
		redirectTo: authRedirectSearchSchema.shape.redirectTo,
	})
	.transform((data) => ({
		loginPath: data.loginPath,
		redirectTo: data.redirectTo,
	}));

function redirectForAuthFailure(data: z.infer<typeof guardInputSchema>): never {
	throw redirect({
		to: data.loginPath,
		search: data.redirectTo
			? toAuthRedirectSearch(data.redirectTo, data.loginPath)
			: undefined,
	});
}

export const requireAdminSessionFn = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => guardInputSchema.parse(data))
	.handler(async ({ data }) => {
		try {
			return {
				user: await requireAdminSessionUser(),
			};
		} catch (error) {
			if (
				error instanceof AuthRequiredError ||
				error instanceof SessionExpiredError ||
				error instanceof WrongActorError
			) {
				redirectForAuthFailure(data);
			}

			throw error;
		}
	});

export const requireCustomerSessionFn = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => guardInputSchema.parse(data))
	.handler(async ({ data }) => {
		try {
			return {
				user: await requireCustomerSessionUser(),
			};
		} catch (error) {
			if (
				error instanceof AuthRequiredError ||
				error instanceof SessionExpiredError ||
				error instanceof WrongActorError
			) {
				redirectForAuthFailure(data);
			}

			throw error;
		}
	});

export const getOptionalPrincipalFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<SessionPrincipal> => getOptionalPrincipal(),
);

export const getOptionalCustomerSessionFn = createServerFn({
	method: "GET",
}).handler(
	async (): Promise<SessionUser | null> => getOptionalCustomerSession(),
);
