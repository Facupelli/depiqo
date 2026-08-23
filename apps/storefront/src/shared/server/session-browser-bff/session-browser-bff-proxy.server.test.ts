import { afterEach, describe, expect, it, vi } from "vitest";
import { proxySessionBrowserBffRequest } from "./session-browser-bff-proxy.server";

const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("@/config/server-env", () => ({
	getServerEnvironment: () => ({ BACKEND_URL: "http://backend.test" }),
}));

vi.mock(
	"@/modules/tenant-management/resolve-public-tenant-context/resolve-trusted-tenant-context.server",
	() => ({
		TenantResolverFailure: class TenantResolverFailure extends Error {},
		resolveTrustedTenantContext: async () =>
			({
				face: "storefront",
				host: "tenant.localhost",
				canonicalHost: "tenant.localhost",
				tenantId: "tenant-1",
				slug: "tenant",
				scope: "public-storefront",
				publicTenant: {
					slug: "tenant",
					name: "Tenant",
					customDomain: null,
					logoUrl: null,
					faviconUrl: null,
					primaryColor: null,
				},
			}) as never,
	}),
);

vi.mock(
	"@/shared/server/storefront-transport/sign-storefront-tenant-token.server",
	() => ({
		signStorefrontTenantToken: async () => "signed-tenant-token",
	}),
);

describe("proxySessionBrowserBffRequest", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("forwards the idempotency key header to the backend", async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ data: {} }), { status: 201 }),
		);
		vi.stubGlobal("fetch", fetchMock);

		const request = new Request(
			"http://tenant.localhost/session/rental-commitments/confirmed-rentals",
			{
				method: "POST",
				headers: {
					host: "tenant.localhost",
					origin: "http://tenant.localhost",
					"content-type": "application/json",
					"idempotency-key": "0d7f5698-1b1e-4a5c-9f3e-2b6c8d90e1a2",
				},
				body: JSON.stringify({}),
			},
		);

		await proxySessionBrowserBffRequest(
			request,
			"rental-commitments/confirmed-rentals",
		);

		const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
		const headers = new Headers(init.headers);
		expect(headers.get("idempotency-key")).toBe(
			"0d7f5698-1b1e-4a5c-9f3e-2b6c8d90e1a2",
		);
	});
});
