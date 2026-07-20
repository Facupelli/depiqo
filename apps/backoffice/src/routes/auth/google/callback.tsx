import {
	createFileRoute,
	Link,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { FieldError } from "@repo/ui/components/field";
import { createCustomerGoogleHandoff } from "@/features/tenant-management/auth/customer-google-handoff/customer-google-handoff.api";
import { ProblemDetailsError } from "@/shared/errors";

const searchSchema = z.object({
	code: z.string().min(1).optional(),
	error: z.string().min(1).optional(),
	error_description: z.string().min(1).optional(),
	state: z.string().min(1).optional(),
});

export const Route = createFileRoute("/auth/google/callback")({
	validateSearch: searchSchema,
	component: GoogleCallbackPage,
});

function GoogleCallbackPage() {
	const search = Route.useSearch();
	const navigate = useNavigate();
	const router = useRouter();
	const [error, setError] = useState<unknown>(null);
	const didStartHandoff = useRef(false);

	useEffect(() => {
		if (didStartHandoff.current) return;
		didStartHandoff.current = true;

		let isActive = true;

		async function finalizeGoogleLogin() {
			try {
				if (search.error) {
					throw new Error(
						search.error_description ?? "Google rechazo la autenticacion.",
					);
				}

				if (!search.code) {
					throw new Error("Google no devolvio un codigo de autorizacion.");
				}

				if (!search.state) {
					throw new Error(
						"Google no devolvio un estado de autenticacion valido.",
					);
				}

				const handoff = await createCustomerGoogleHandoff({
					body: {
						code: search.code,
						state: search.state,
					},
				});

				if (!isActive) return;

				const finalizeUrl = new URL(
					"/auth/google/finalize",
					handoff.portalOrigin,
				);
				finalizeUrl.searchParams.set("ticket", handoff.ticket);
				finalizeUrl.searchParams.set("redirectTo", handoff.redirectPath);

				await router.invalidate({ sync: true });
				await navigate({ href: finalizeUrl.toString() });
			} catch (caughtError) {
				if (isActive) {
					setError(caughtError);
				}
			}
		}

		finalizeGoogleLogin();

		return () => {
			isActive = false;
		};
	}, [
		navigate,
		router,
		search.code,
		search.error,
		search.error_description,
		search.state,
	]);

	if (error) {
		return <GoogleAuthErrorPage error={error} />;
	}

	return <RedirectingToPortalPage />;
}

function RedirectingToPortalPage() {
	return (
		<div className="flex min-h-svh items-center justify-center bg-neutral-100 px-4 py-10">
			<div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-sm">
				<div className="space-y-2">
					<h1 className="text-lg font-semibold">Completando acceso</h1>
					<p className="text-sm text-muted-foreground">
						Estamos validando tu cuenta y regresando al portal.
					</p>
				</div>
				<div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
					<div className="size-4 animate-spin rounded-full border-2 border-muted border-t-foreground" />
					<span>Redirigiendo...</span>
				</div>
			</div>
		</div>
	);
}

function GoogleAuthErrorPage({ error }: { error: unknown }) {
	const message = getRouteErrorMessage(error);

	return (
		<div className="flex min-h-svh items-center justify-center bg-neutral-100 px-4 py-10">
			<div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-sm">
				<div className="space-y-2">
					<h1 className="text-lg font-semibold">
						No pudimos completar el acceso
					</h1>
					<p className="text-sm text-muted-foreground">
						Revisa el error e intenta nuevamente.
					</p>
				</div>
				<div className="mt-4 space-y-4">
					<FieldError errors={[{ message }]} />
					<Link
						to="/"
						className="bg-primary text-primary-foreground hover:bg-primary/80 inline-flex h-9 w-full items-center justify-center rounded-md px-2.5 text-sm font-medium transition-all"
					>
						Volver
					</Link>
				</div>
			</div>
		</div>
	);
}

function getRouteErrorMessage(error: unknown): string {
	if (error instanceof ProblemDetailsError) {
		if (error.problemDetails.status === 401) {
			return "No pudimos iniciar sesion con Google.";
		}

		return error.problemDetails.detail;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return "Ocurrio un error inesperado al autenticar con Google.";
}
