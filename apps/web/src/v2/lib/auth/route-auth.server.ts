import type { AuthCustomerDto, AuthUserDto } from "@repo/api-contracts";
import { AuthRequiredError, WrongActorError } from "@/shared/errors";
import { getCurrentUser } from "@/v2/features/tenant-management/auth/get-current-user/get-current-user.api";

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

export async function requireV2TenantCustomer(): Promise<AuthCustomerDto> {
	try {
		const actor = await getCurrentUser();

		if (actor.actorType !== "TENANT_CUSTOMER") {
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
