import { Button } from "@repo/ui/components/button";
import { FieldError } from "@repo/ui/components/field";
import {
	createFileRoute,
	Link,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { finalizeCustomerGoogleLogin } from "@/modules/tenant-management/auth/customer-google/customer-google-finalize.api";

const searchSchema = z.object({ ticket: z.string().min(1) });

export const Route = createFileRoute("/auth/google/finalize")({
	validateSearch: searchSchema,
	component: CustomerGoogleFinalizePage,
});

function CustomerGoogleFinalizePage() {
	const { ticket } = Route.useSearch();
	const navigate = useNavigate();
	const router = useRouter();
	const didFinalize = useRef(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (didFinalize.current) return;
		didFinalize.current = true;

		let active = true;
		void finalizeCustomerGoogleLogin(ticket)
			.then(async ({ redirectPath }) => {
				if (!active) return;
				await router.invalidate({ sync: true });
				if (active) await navigate({ href: redirectPath, replace: true });
			})
			.catch(() => {
				if (active)
					setError("El acceso con Google expir├│ o no pudo completarse.");
			});

		return () => {
			active = false;
		};
	}, [navigate, router, ticket]);

	if (error) {
		return (
			<main className="grid min-h-svh place-items-center bg-neutral-100 px-4 py-12">
				<section className="w-full max-w-md space-y-5 rounded-xl border bg-white p-6 text-center shadow-sm">
					<h1 className="text-2xl font-bold">No pudimos iniciar sesi├│n</h1>
					<FieldError errors={[{ message: error }]} />
					<Button className="w-full" render={<Link to="/login" />}>
						Volver a iniciar sesi├│n
					</Button>
				</section>
			</main>
		);
	}

	return (
		<main className="grid min-h-svh place-items-center bg-neutral-100 px-4 py-12">
			<section className="w-full max-w-md space-y-3 rounded-xl border bg-white p-6 text-center shadow-sm">
				<h1 className="text-2xl font-bold">Iniciando sesi├│n</h1>
				<p className="text-sm text-muted-foreground">
					Redirigiendo...
				</p>
			</section>
		</main>
	);
}

