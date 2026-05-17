import type { PaginatedDto } from "@repo/schemas";
import type { ActorType } from "@repo/types";
import { createServerOnlyFn } from "@tanstack/react-start";
import { requireSession } from "@/features/auth/auth-guards.server";
import { refreshSession } from "@/features/auth/auth-refresh.server";
import { ProblemDetailsError } from "@/shared/errors";
import { type ApiFetchOptions, apiFetch, apiFetchPaginated } from "./api";

type AuthenticatedApiFetchOptions = ApiFetchOptions & {
	actorType?: ActorType;
};

async function resolveAccessToken(actorType?: ActorType): Promise<string> {
	const session = await requireSession({ actorType });

	return session.accessToken;
}

async function withSessionRetry<T>(
	request: (accessToken: string) => Promise<T>,
	actorType?: ActorType,
): Promise<T> {
	let accessToken = await resolveAccessToken(actorType);
	let hasRetried = false;

	while (true) {
		try {
			return await request(accessToken);
		} catch (error) {
			if (
				error instanceof ProblemDetailsError &&
				error.problemDetails.status === 401 &&
				!hasRetried
			) {
				const refreshed = await refreshSession();

				if (refreshed) {
					accessToken = await resolveAccessToken(actorType);
					hasRetried = true;
					continue;
				}
			}

			throw error;
		}
	}
}

export const authenticatedApiFetch = createServerOnlyFn(
	async <T>(
		path: string,
		options: AuthenticatedApiFetchOptions = {},
	): Promise<T> => {
		const { actorType, ...requestOptions } = options;

		return withSessionRetry(
			(accessToken) => apiFetch<T>(path, { ...requestOptions, accessToken }),
			actorType,
		);
	},
);

export const authenticatedApiFetchPaginated = createServerOnlyFn(
	async <T>(
		path: string,
		options: AuthenticatedApiFetchOptions = {},
	): Promise<PaginatedDto<T>> => {
		const { actorType, ...requestOptions } = options;

		return withSessionRetry(
			(accessToken) =>
				apiFetchPaginated<T>(path, { ...requestOptions, accessToken }),
			actorType,
		);
	},
);
