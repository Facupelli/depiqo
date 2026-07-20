import { createFileRoute, notFound } from "@tanstack/react-router";
import { getTenantBranding } from "@/features/tenant-management/tenant-context/tenant-branding";
import type { PublicStorefrontTenantContext } from "@/features/tenant-management/tenant-context/types";

export const Route = createFileRoute("/_portal")({
	beforeLoad: ({ context }) => {
		if (context.tenantContext.face !== "storefront") {
			throw notFound();
		}

		return {
			tenantContext: context.tenantContext as {
				face: "storefront";
				tenant: PublicStorefrontTenantContext;
			},
		};
	},
	loader: ({ context: { tenantContext } }) => ({
		branding: getTenantBranding(tenantContext.tenant),
	}),
	head: ({ loaderData }) =>
		loaderData?.branding.faviconHref
			? {
					links: [
						{
							rel: "icon",
							type: "image/png",
							href: loaderData.branding.faviconHref,
						},
					],
				}
			: {},
});
