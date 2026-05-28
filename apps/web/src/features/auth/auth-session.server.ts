import type { ActorType } from "@repo/types";
import {
	getTokenExpirationTimestamp,
	type SessionData,
	type SessionUser,
	toSessionUser,
} from "@/lib/session";
import type { AppSession } from "@/lib/session.server";

type AccessTokenClaims = {
	sub: string;
	email: string;
	tenantId: string;
	actorType: ActorType;
};

type TokenPair = {
	accessToken: string;
	refreshToken: string;
};

function decodeAccessTokenClaims(accessToken: string): AccessTokenClaims {
	return JSON.parse(
		Buffer.from(accessToken.split(".")[1], "base64url").toString("utf-8"),
	) as AccessTokenClaims;
}

export async function writeSessionFromTokens(
	session: AppSession,
	tokens: TokenPair,
): Promise<SessionUser> {
	const claims = decodeAccessTokenClaims(tokens.accessToken);

	await session.update((_data: Partial<SessionData>) => ({
		userId: claims.sub,
		email: claims.email,
		tenantId: claims.tenantId,
		actorType: claims.actorType,
		accessToken: tokens.accessToken,
		refreshToken: tokens.refreshToken,
		accessTokenExpiresAt: getTokenExpirationTimestamp(tokens.accessToken),
	}));

	return toSessionUser(session.data);
}
