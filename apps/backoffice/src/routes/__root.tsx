import type { AuthActorDto } from "@repo/api-contracts";
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
import { Toaster } from "@repo/ui/components/sonner";
import { getCurrentUser } from "@/features/tenant-management/auth/get-current-user/get-current-user.api";
import { getPublicTenantContext } from "@/features/tenant-management/tenant-context/get-public-tenant-context.api";
import type { PublicTenantContext } from "@/features/tenant-management/tenant-context/types";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";

export interface RouterContext {
	queryClient: QueryClient;
	tenantContext: PublicTenantContext;
	user: AuthActorDto | null;
}

const isDevEnv = import.meta.env.DEV;

export const Route = createRootRouteWithContext<RouterContext>()({
	beforeLoad: async () => {
		try {
			const tenantContext = await getPublicTenantContext();
			let user: AuthActorDto | null = null;

			try {
				user = await getCurrentUser();
			} catch (error) {
				if (!isUnauthorizedProblemDetailsError(error)) {
					throw error;
				}
			}

			return { tenantContext, user };
		} catch (error) {
			// NestJS returned 404 — unknown hostname
			if (
				error !== null &&
				typeof error === "object" &&
				"isNotFound" in error
			) {
				throw notFound();
			}
			// Any other error (5xx, network failure) — let it bubble as 500
			throw error;
		}
	},
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Depiqo | Equipment Rental",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	shellComponent: RootDocument,
	notFoundComponent: () => <NotFoundPage />,
	errorComponent: () => <ServiceUnavailablePage />,
});

function isUnauthorizedProblemDetailsError(error: unknown): boolean {
	return (
		error !== null &&
		typeof error === "object" &&
		"problemDetails" in error &&
		error.problemDetails !== null &&
		typeof error.problemDetails === "object" &&
		"status" in error.problemDetails &&
		error.problemDetails.status === 401
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				{isDevEnv && (
					<TanStackDevtools
						config={{
							position: "bottom-left",
						}}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
							TanStackQueryDevtools,
						]}
					/>
				)}
				<Toaster />
				<Scripts />
			</body>
		</html>
	);
}
