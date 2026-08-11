import { createFileRoute } from "@tanstack/react-router";
import { Link2Off } from "lucide-react";
import { z } from "zod";
import { PublicSigningPage } from "@/modules/document-signing/public-signing-session/public-signing-page";
import { PublicSigningTerminalState } from "@/modules/document-signing/public-signing-session/public-signing-terminal-state";
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
			<PublicSigningTerminalState
				icon={Link2Off}
				title="Enlace de firma no válido"
				description="Abre nuevamente el enlace completo que recibiste por email."
			/>
		);
	}

	return <PublicSigningPage token={token} />;
}
