import {
	createFileRoute,
	Link,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { FieldError } from "@/components/ui/field";
import {
	getPortalAuthRedirectTarget,
	portalAuthRedirectSchema,
} from "@/features/tenant-management/auth/portal/portal-auth.redirect";
import { ProblemDetailsError } from "@/shared/errors";
import { finalizeCustomerGoogleLogin } from "@/features/tenant-management/auth/customer-google-finalize/customer-google-finalize.api";

const searchSchema = portalAuthRedirectSchema.extend({
	ticket: z.string().min(1),
});

export const Route = createFileRoute("/_portal/auth/google/finalize")({
	validateSearch: searchSchema,
	component: GoogleFinalizePage,
});

function GoogleFinalizePage() {
	const search = Route.useSearch();
	const navigate = useNavigate();
	const router = useRouter();
	const [error, setError] = useState<unknown>(null);
	const didStartFinalization = useRef(false);

	useEffect(() => {
		if (didStartFinalization.current) return;
		didStartFinalization.current = true;

		let isActive = true;

		async function finalizeGoogleLogin() {
			try {
				await finalizeCustomerGoogleLogin({
					body: {
						ticket: search.ticket,
					},
				});

				if (!isActive) return;

				await router.invalidate({ sync: true });
				await navigate(getPortalAuthRedirectTarget(search));
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
	}, [navigate, router, search]);

	if (error) {
		return <GoogleFinalizeErrorPage error={error} />;
	}

	return <FinalizingGoogleLoginPage />;
}

function FinalizingGoogleLoginPage() {
	return (
		<div className="flex min-h-svh items-center justify-center bg-neutral-100 px-4 py-10">
			<div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-sm">
				<div className="space-y-2">
					<h1 className="text-lg font-semibold">Iniciando sesión</h1>
					<p className="text-sm text-muted-foreground">
						Estamos preparando tu sesión en el portal.
					</p>
				</div>
				<div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
					<div className="size-4 animate-spin rounded-full border-2 border-muted border-t-foreground" />
					<span>Finalizando acceso...</span>
				</div>
			</div>
		</div>
	);
}

function GoogleFinalizeErrorPage({ error }: { error: unknown }) {
	const message = getRouteErrorMessage(error);

	return (
		<div className="flex min-h-svh items-center justify-center bg-neutral-100 px-4 py-10">
			<div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-sm">
				<div className="space-y-2">
					<h1 className="text-lg font-semibold">No pudimos iniciar sesión</h1>
					<p className="text-sm text-muted-foreground">
						Intenta nuevamente desde el portal.
					</p>
				</div>
				<div className="mt-4 space-y-4">
					<FieldError errors={[{ message }]} />
					<Link
						to="/login"
						className="bg-primary text-primary-foreground hover:bg-primary/80 inline-flex h-9 w-full items-center justify-center rounded-md px-2.5 text-sm font-medium transition-all"
					>
						Volver al login
					</Link>
				</div>
			</div>
		</div>
	);
}

function getRouteErrorMessage(error: unknown): string {
	if (error instanceof ProblemDetailsError) {
		if (error.problemDetails.status === 401) {
			return "El acceso con Google expiró o ya fue utilizado. Intenta nuevamente.";
		}

		return error.problemDetails.detail;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return "Ocurrió un error inesperado al completar el acceso con Google.";
}
