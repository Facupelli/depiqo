import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { buildGoogleAuthorizationUrl } from "@/features/tenant-management/auth/portal/google-auth.redirect";

const searchSchema = z.object({
	state: z.string().min(1),
});

export const Route = createFileRoute("/auth/google/start")({
	validateSearch: searchSchema,
	beforeLoad: ({ search }) => {
		throw redirect({ href: buildGoogleAuthorizationUrl(search.state) });
	},
	component: RedirectingToGooglePage,
});

function RedirectingToGooglePage() {
	return (
		<div className="flex min-h-svh items-center justify-center bg-neutral-100 px-4 py-10">
			<div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-sm">
				<div className="space-y-2">
					<h1 className="text-lg font-semibold">Redirigiendo a Google</h1>
					<p className="text-sm text-muted-foreground">
						Estamos preparando el acceso con Google.
					</p>
				</div>
				<div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
					<div className="size-4 animate-spin rounded-full border-2 border-muted border-t-foreground" />
					<span>Abriendo Google...</span>
				</div>
			</div>
		</div>
	);
}
