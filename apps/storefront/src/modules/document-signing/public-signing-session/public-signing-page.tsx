import { FileCheck2, FileSearch, Link2Off, ShieldAlert } from "lucide-react";
import { useId, useState } from "react";
import { getProblemDetailsStatus, ProblemDetailsError } from "@/shared/errors";
import type { PublicSigningAcceptanceResult } from "../public-signing.api";
import {
	useAcceptPublicSigningSession,
	usePublicSigningSession,
} from "../public-signing.queries";
import type { PublicSigningToken } from "../public-signing-token";
import { PublicSigningForm } from "./public-signing-form";
import {
	type PublicSigningFormValues,
	toAcceptPublicSigningSessionDto,
} from "./public-signing-form.schema";
import { PublicSigningPdfViewer } from "./public-signing-pdf-viewer";
import { PublicSigningSessionDetails } from "./public-signing-session-details";
import { PublicSigningSignedReceiptDownload } from "./public-signing-signed-receipt-download";
import { PublicSigningTerminalState } from "./public-signing-terminal-state";
import { useUnsignedSigningDocument } from "./use-unsigned-signing-document";

type PublicSigningPageProps = {
	token: PublicSigningToken;
};

export function PublicSigningPage({ token }: PublicSigningPageProps) {
	const signatureHeadingId = useId();
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [terminalStatus, setTerminalStatus] = useState<number | null>(null);
	const [unexpectedError, setUnexpectedError] = useState<string | null>(null);
	const [acceptanceResult, setAcceptanceResult] =
		useState<PublicSigningAcceptanceResult | null>(null);
	const sessionQuery = usePublicSigningSession(token, { retry: false });
	const unsignedDocument = useUnsignedSigningDocument(
		token,
		sessionQuery.data?.requestId,
	);
	const acceptMutation = useAcceptPublicSigningSession();

	async function handleSubmit(values: PublicSigningFormValues) {
		setSubmitError(null);
		setUnexpectedError(null);

		if (!sessionQuery.data) {
			setUnexpectedError("No pudimos verificar el contrato para firma.");
			return;
		}

		try {
			const result = await acceptMutation.mutateAsync({
				token,
				body: toAcceptPublicSigningSessionDto(
					values,
					sessionQuery.data.acceptance.textVersion,
				),
			});
			setAcceptanceResult(result);
		} catch (error) {
			const status = getProblemDetailsStatus(error) ?? null;
			const message = getProblemDetailsMessage(error);

			if (status === 422) {
				setSubmitError(message ?? "No pudimos registrar tu aceptación.");
				return;
			}
			if ([400, 401, 404, 409, 410].includes(status ?? -1)) {
				setTerminalStatus(status);
				return;
			}
			setUnexpectedError(message);
		}
	}

	if (acceptanceResult) {
		return (
			<PublicSigningTerminalState
				icon={FileCheck2}
				title="Contrato firmado correctamente"
				description="Tu firma quedó registrada correctamente."
				detail={`Firmado el ${formatDateTime(acceptanceResult.signedAt)}.`}
				action={
					<PublicSigningSignedReceiptDownload
						receiptToken={acceptanceResult.receiptToken}
						receiptTokenExpiresAt={acceptanceResult.receiptTokenExpiresAt}
					/>
				}
			/>
		);
	}

	if (terminalStatus !== null || unexpectedError) {
		return renderTerminalState(terminalStatus, unexpectedError);
	}

	if (sessionQuery.isPending) {
		return <PublicSigningLoadingState />;
	}

	if (sessionQuery.isError) {
		return renderTerminalState(
			getProblemDetailsStatus(sessionQuery.error) ?? null,
			getProblemDetailsMessage(sessionQuery.error),
		);
	}

	if (unsignedDocument.isPending) {
		return <PublicSigningLoadingState />;
	}

	if (unsignedDocument.isError) {
		return renderDocumentUnavailableState(unsignedDocument.error);
	}

	if (!unsignedDocument.objectUrl) {
		return <PublicSigningLoadingState />;
	}

	return (
		<main className="min-h-svh bg-neutral-100 px-4 py-8 sm:px-6 sm:py-12">
			<div className="mx-auto grid w-full max-w-3xl gap-8">
				<PublicSigningSessionDetails session={sessionQuery.data} />
				<PublicSigningPdfViewer
					objectUrl={unsignedDocument.objectUrl}
					documentName={sessionQuery.data.document.displayFileName}
					documentNumber={sessionQuery.data.document.documentNumber}
				/>
				<section
					aria-labelledby={signatureHeadingId}
					className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7"
				>
					<div className="mb-6 space-y-1">
						<h2 id={signatureHeadingId} className="text-xl font-semibold">
							Firma y aceptación
						</h2>
						<p className="text-sm text-neutral-600">
							Revisa la información del contrato antes de confirmar tu firma.
						</p>
					</div>
					<PublicSigningForm
						acceptanceText={sessionQuery.data.acceptance.textSnapshot}
						submitError={submitError}
						isPending={acceptMutation.isPending}
						onSubmit={handleSubmit}
					/>
				</section>
			</div>
		</main>
	);
}

function PublicSigningLoadingState() {
	return (
		<main className="grid min-h-svh place-items-center bg-neutral-100 px-4 py-10">
			<p className="rounded-lg border border-neutral-200 bg-white px-5 py-4 text-sm text-neutral-600 shadow-sm">
				Cargando contrato para firma...
			</p>
		</main>
	);
}

function renderTerminalState(status: number | null, detail: string | null) {
	switch (status) {
		case 400:
		case 401:
			return (
				<PublicSigningTerminalState
					icon={ShieldAlert}
					title="Enlace de firma no válido"
					description="Abre nuevamente el enlace completo que recibiste por email."
					detail={detail ?? undefined}
				/>
			);
		case 404:
			return (
				<PublicSigningTerminalState
					icon={Link2Off}
					title="Enlace de firma no disponible"
					description="No encontramos una sesión activa para este enlace."
					detail={detail ?? undefined}
				/>
			);
		case 409:
			return (
				<PublicSigningTerminalState
					icon={FileCheck2}
					title="Esta firma no está disponible"
					description="Este enlace ya no está disponible para firmar. Contacta al negocio si necesitas ayuda."
					detail={detail ?? undefined}
				/>
			);
		case 410:
			return (
				<PublicSigningTerminalState
					icon={FileSearch}
					title="El enlace de firma venció"
					description="Solicita al negocio una nueva invitación para continuar."
					detail={detail ?? undefined}
				/>
			);
		default:
			return (
				<PublicSigningTerminalState
					icon={ShieldAlert}
					title="No pudimos completar la firma"
					description="Ocurrió un problema inesperado. Intenta nuevamente en unos minutos."
					detail={detail ?? undefined}
				/>
			);
	}
}

function renderDocumentUnavailableState(error: unknown) {
	const status = getProblemDetailsStatus(error) ?? null;
	if ([404, 409, 410].includes(status ?? -1)) {
		return renderTerminalState(status, getProblemDetailsMessage(error));
	}

	return (
		<PublicSigningTerminalState
			icon={FileSearch}
			title="Documento para firma no disponible"
			description="No pudimos recuperar el contrato que debes revisar. No es posible completar la firma sin el documento."
			detail={getProblemDetailsMessage(error) ?? undefined}
		/>
	);
}

function getProblemDetailsMessage(error: unknown): string | null {
	if (error instanceof ProblemDetailsError) {
		return error.problemDetails.detail || error.problemDetails.title;
	}
	return error instanceof Error ? error.message : null;
}

function formatDateTime(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;

	return new Intl.DateTimeFormat("es-AR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}
