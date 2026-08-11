import type { PublicTenantContext } from "@repo/api-contracts";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	notFound,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { NotFoundPage } from "@/components/not-found-page";
import { ServiceUnavailablePage } from "@/components/service-unavailable-page";
import { clientEnv } from "@/config/client-env";
import TanStackQueryDevtools from "@/integrations/tanstack-query/devtools";
import { resolvePublicTenantContext } from "@/modules/tenant-management/resolve-public-tenant-context/resolve-public-tenant-context.function";
import appCss from "../styles.css?url";

export interface StorefrontRouterContext {
	queryClient: QueryClient;
	tenantContext: PublicTenantContext | null;
}

const isDevelopment = import.meta.env.DEV;

export const Route = createRootRouteWithContext<StorefrontRouterContext>()({
	beforeLoad: async ({ location }) => {
		if (location.pathname === "/health") {
			return { tenantContext: null };
		}

		const resolution = await resolvePublicTenantContext();

		if (
			resolution.status !== "resolved" ||
			resolution.context.face === "admin"
		) {
			throw notFound();
		}

		if (resolution.context.face === "platform") {
			const sharedAuthHostname = new URL(clientEnv.VITE_SHARED_AUTH_ORIGIN)
				.hostname;
			const isSharedAuthRoute = [
				"/auth/google/start",
				"/auth/google/callback",
			].includes(location.pathname);
			if (resolution.hostname === sharedAuthHostname && !isSharedAuthRoute) {
				throw notFound();
			}
		}

		return { tenantContext: resolution.context };
	},
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{ title: "Depiqo | Equipment Rental" },
		],
		links: [{ rel: "stylesheet", href: appCss }],
	}),
	shellComponent: RootDocument,
	notFoundComponent: () => <NotFoundPage />,
	errorComponent: () => <ServiceUnavailablePage />,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="es">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				{isDevelopment && (
					<TanStackDevtools
						config={{ position: "bottom-left" }}
						plugins={[
							{
								name: "TanStack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
							TanStackQueryDevtools,
						]}
					/>
				)}
				<Scripts />
			</body>
		</html>
	);
}
