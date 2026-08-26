import type { AuthActorDto } from "@repo/api-contracts";
import { Toaster } from "@repo/ui/components/sonner";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { getCurrentUser } from "@/auth/get-current-user/get-current-user.api";
import { NotFoundPage } from "@/components/not-found-page";
import { ServiceUnavailablePage } from "@/components/service-unavailable-page";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";

export interface RouterContext {
	queryClient: QueryClient;
	user: AuthActorDto | null;
}

const isDevEnv = import.meta.env.DEV;

export const Route = createRootRouteWithContext<RouterContext>()({
	beforeLoad: async () => {
		try {
			return { user: await getCurrentUser() };
		} catch (error) {
			if (isUnauthorizedProblemDetailsError(error)) {
				return { user: null };
			}

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
