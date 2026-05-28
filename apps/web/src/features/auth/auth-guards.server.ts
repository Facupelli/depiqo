import { ActorType } from "@repo/types";
import {
	hasActiveSession,
	type SessionData,
	type SessionPrincipal,
	type SessionUser,
	toSessionPrincipal,
	toSessionUser,
} from "@/lib/session";
import { getAppSession } from "@/lib/session.server";
import {
	AuthRequiredError,
	SessionExpiredError,
	WrongActorError,
} from "@/shared/errors";
import { refreshSession } from "./auth-refresh.server";

const REFRESH_BUFFER_MS = 30 * 1000;

type RequireSessionOptions = {
	actorType?: ActorType;
};

function isAccessTokenExpiring(expiresAt: number): boolean {
	return expiresAt - Date.now() < REFRESH_BUFFER_MS;
}

async function clearSession(): Promise<void> {
	const session = await getAppSession();
	await session.clear();
}

async function readActiveSession(): Promise<SessionData | null> {
	const session = await getAppSession();

	if (!hasActiveSession(session.data)) {
		return null;
	}

	return session.data;
}

async function ensureFreshOptionalSession(): Promise<SessionData | null> {
	let session = await readActiveSession();

	if (!session) {
		return null;
	}

	if (!isAccessTokenExpiring(session.accessTokenExpiresAt)) {
		return session;
	}

	try {
		const refreshed = await refreshSession();

		if (!refreshed) {
			session = await readActiveSession();

			if (!session || session.accessTokenExpiresAt <= Date.now()) {
				await clearSession();
				return null;
			}

			return session;
		}
	} catch (error) {
		if (
			error instanceof AuthRequiredError ||
			error instanceof SessionExpiredError
		) {
			await clearSession();
			return null;
		}

		throw error;
	}

	return readActiveSession();
}

async function readRequiredSession(
	options: RequireSessionOptions,
): Promise<SessionData> {
	const session = await ensureFreshOptionalSession();

	if (!session) {
		throw new AuthRequiredError();
	}

	if (options.actorType && session.actorType !== options.actorType) {
		throw new WrongActorError();
	}

	return session;
}

export async function getOptionalPrincipal(): Promise<SessionPrincipal> {
	const session = await ensureFreshOptionalSession();

	return toSessionPrincipal(session ?? undefined);
}

export async function getOptionalSessionUser(): Promise<SessionUser | null> {
	const principal = await getOptionalPrincipal();

	return principal.kind === "anonymous" ? null : principal;
}

export async function getOptionalCustomerSession(): Promise<SessionUser | null> {
	const principal = await getOptionalPrincipal();

	return principal.kind === "customerAccount" ? principal : null;
}

export async function requireSession(
	options: RequireSessionOptions,
): Promise<SessionData> {
	const session = await readRequiredSession(options);

	if (session.accessTokenExpiresAt <= Date.now()) {
		await clearSession();
		throw new SessionExpiredError();
	}

	return session;
}

export async function requireAdminSessionUser(): Promise<
	Extract<SessionUser, { kind: "adminUser" }>
> {
	return toSessionUser(
		await requireSession({
			actorType: ActorType.USER,
		}),
	) as Extract<SessionUser, { kind: "adminUser" }>;
}

export async function requireCustomerSessionUser(): Promise<
	Extract<SessionUser, { kind: "customerAccount" }>
> {
	return toSessionUser(
		await requireSession({
			actorType: ActorType.CUSTOMER,
		}),
	) as Extract<SessionUser, { kind: "customerAccount" }>;
}
