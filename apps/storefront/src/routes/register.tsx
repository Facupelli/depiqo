import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { resolveCustomerReturnTo } from "@/modules/tenant-management/auth/customer-return-to";

export const Route = createFileRoute("/register")({
	validateSearch: z.object({ returnTo: z.unknown().optional() }),
	beforeLoad: ({ context }) => {
		if (!context.tenantContext || context.tenantContext.face !== "storefront")
			throw notFound();
	},
	component: CustomerRegisterUnavailablePage,
});

function CustomerRegisterUnavailablePage() {
	const { returnTo: rawReturnTo } = Route.useSearch();
	const returnTo = resolveCustomerReturnTo(rawReturnTo);

	return (
		<main className="grid min-h-svh place-items-center bg-neutral-100 px-4 py-12">
			<section className="w-full max-w-md space-y-5 rounded-xl border bg-white p-6 text-center shadow-sm">
				<h1 className="text-2xl font-bold">Registro no disponible</h1>
				<p className="text-sm leading-6 text-muted-foreground">
					El registro con correo y contraseña todavía no está habilitado.
					Contacta al equipo de alquiler para solicitar acceso.
				</p>
				<Link
					to="/login"
					search={{ returnTo }}
					className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90"
				>
					Volver a iniciar sesión
				</Link>
			</section>
		</main>
	);
}
