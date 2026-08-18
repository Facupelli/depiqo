import type { AuthUserDto } from "@repo/api-contracts";
import { getCurrentUser } from "@/auth/get-current-user/get-current-user.api";
import { AuthRequiredError, WrongActorError } from "@/shared/errors";

export async function requireV2TenantUser(): Promise<AuthUserDto> {
	try {
		const actor = await getCurrentUser();

		if (actor.actorType !== "TENANT_USER") {
			throw new WrongActorError();
		}

		return actor;
	} catch (error) {
		if (error instanceof WrongActorError) {
			throw error;
		}

		throw new AuthRequiredError();
	}
}
