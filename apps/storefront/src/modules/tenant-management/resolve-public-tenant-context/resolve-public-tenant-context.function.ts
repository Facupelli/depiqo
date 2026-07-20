import {
	type PublicTenantContext,
	PublicTenantContextSchema,
	type TrustedTenantContext,
} from "@repo/api-contracts";
import { createServerFn } from "@tanstack/react-start";
import { storefrontFunctionRequestContextMiddleware } from "./function-request-context.middleware";
import {
	resolveTrustedTenantContext,
	TenantResolverFailure,
} from "./resolve-trusted-tenant-context.server";

export type PublicTenantResolution =
	| { status: "resolved"; context: PublicTenantContext }
	| { status: "invalid-host" | "unknown-host" };

export const resolvePublicTenantContext = createServerFn({
	method: "GET",
})
	.middleware([storefrontFunctionRequestContextMiddleware])
	.handler(async ({ context }): Promise<PublicTenantResolution> => {
		try {
			const trustedContext = await resolveTrustedTenantContext(
				context.storefrontRequest,
			);

			return {
				status: "resolved",
				context: toPublicTenantContext(trustedContext),
			};
		} catch (error) {
			if (error instanceof TenantResolverFailure) {
				return { status: error.kind };
			}

			throw error;
		}
	});

function toPublicTenantContext(
	context: TrustedTenantContext,
): PublicTenantContext {
	if (context.face !== "storefront") {
		return PublicTenantContextSchema.parse({ face: context.face });
	}

	return PublicTenantContextSchema.parse({
		face: "storefront",
		tenant: context.publicTenant,
	});
}
