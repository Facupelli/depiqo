import { Spinner } from "@repo/ui/components/spinner";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PublicSigningTokenSchema } from "@/modules/document-signing/public-signing-token";

const signingSearchSchema = z.object({
	token: PublicSigningTokenSchema.optional().catch(undefined),
});

export const Route = createFileRoute("/signing")({
	validateSearch: signingSearchSchema,
	head: () => ({
		meta: [{ title: "Firma de contrato | Depiqo" }],
	}),
	component: SigningPage,
});

function SigningPage() {
	const { token } = Route.useSearch();

	if (!token) {
		return (
			<main className="grid min-h-svh place-items-center bg-neutral-100 px-4 py-10">
				<section className="max-w-md rounded-xl border border-neutral-200 bg-white p-6 text-center shadow-xs">
					<h1 className="text-lg font-semibold">Enlace de firma no válido</h1>
					<p className="mt-2 text-sm text-neutral-600">
						Abre nuevamente el enlace completo que recibiste por email.
					</p>
				</section>
			</main>
		);
	}

	return (
		<main className="grid min-h-svh place-items-center bg-neutral-100 px-4 py-10">
			<div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-5 py-4 text-sm text-neutral-600 shadow-xs">
				<Spinner className="size-4" />
				<span>Preparando contrato para firma...</span>
			</div>
		</main>
	);
}
