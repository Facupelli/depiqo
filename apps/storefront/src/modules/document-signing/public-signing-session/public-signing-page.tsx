import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@repo/ui/components/sheet";
import {
	Download,
	FileCheck2,
	FileSearch,
	Link2Off,
	MoreVertical,
	PenLine,
	ShieldAlert,
} from "lucide-react";
import { useState } from "react";
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
import { PublicSigningSignedReceiptDownload } from "./public-signing-signed-receipt-download";
import { PublicSigningTerminalState } from "./public-signing-terminal-state";
import { useUnsignedSigningDocument } from "./use-unsigned-signing-document";

type PublicSigningPageProps = {
	token: PublicSigningToken;
};

type SigningUiState = "REVIEW" | "SIGNING" | "COMPLETED";

export function PublicSigningPage({ token }: PublicSigningPageProps) {
	const [uiState, setUiState] = useState<SigningUiState>("REVIEW");
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

	function handleUnsignedDocumentDownload() {
		if (!unsignedDocument.objectUrl || !sessionQuery.data) return;

		const anchor = document.createElement("a");
		anchor.href = unsignedDocument.objectUrl;
		anchor.download = sessionQuery.data.document.displayFileName;
		anchor.click();
	}

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
			setUiState("COMPLETED");
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

	if (uiState === "COMPLETED" && acceptanceResult) {
		return (
			<PublicSigningTerminalState
				icon={FileCheck2}
				title="Documento firmado"
				description="Tu firma se registró correctamente."
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
		return (
			<PublicSigningLoadingState
				documentNumber={sessionQuery.data.document.documentNumber}
			/>
		);
	}

	if (unsignedDocument.isError) {
		return renderDocumentUnavailableState(unsignedDocument.error);
	}

	if (!unsignedDocument.data || !unsignedDocument.objectUrl) {
		return <PublicSigningLoadingState />;
	}

	const documentTitle =
		`Remito ${sessionQuery.data.document.documentNumber ?? ""}`.trim();

	return (
		<main className="min-h-svh bg-neutral-200 text-neutral-950">
			<header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
				<div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6">
					<div className="min-w-0 flex-1">
						<p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
							Documento para revisar
						</p>
						<h1 className="truncate text-base font-semibold sm:text-lg">
							{documentTitle}
						</h1>
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									variant="ghost"
									size="icon"
									aria-label="Acciones del documento"
								/>
							}
						>
							<MoreVertical aria-hidden="true" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-52">
							<DropdownMenuItem onClick={handleUnsignedDocumentDownload}>
								<Download aria-hidden="true" />
								Descargar documento
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</header>

			<div className="mx-auto max-w-5xl pb-32 sm:pb-36">
				<PublicSigningPdfViewer
					file={unsignedDocument.data}
					documentNumber={sessionQuery.data.document.documentNumber}
				/>
			</div>

			<div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur sm:px-6">
				<div className="mx-auto max-w-xl">
					<Button
						className="h-12 w-full text-base font-semibold"
						onClick={() => setUiState("SIGNING")}
					>
						<PenLine aria-hidden="true" />
						Firmar documento
					</Button>
				</div>
			</div>

			<Sheet
				open={uiState === "SIGNING"}
				onOpenChange={(open) => setUiState(open ? "SIGNING" : "REVIEW")}
			>
				<SheetContent
					side="bottom"
					className="max-h-[92dvh] min-h-[min(42rem,92dvh)] gap-0 overflow-hidden rounded-t-2xl sm:mx-auto sm:max-w-2xl sm:border-x"
				>
					<SheetHeader className="border-b border-neutral-200 px-4 py-4 sm:px-6">
						<SheetTitle className="text-xl font-semibold">Firma</SheetTitle>
						<SheetDescription>
							Dibuja tu firma y confirma la aceptación para completar.
						</SheetDescription>
					</SheetHeader>
					<PublicSigningForm
						acceptanceText={sessionQuery.data.acceptance.textSnapshot}
						submitError={submitError}
						isPending={acceptMutation.isPending}
						onSubmit={handleSubmit}
					/>
				</SheetContent>
			</Sheet>
		</main>
	);
}

function PublicSigningLoadingState({
	documentNumber,
}: {
	documentNumber?: string | null;
}) {
	return (
		<main className="min-h-svh bg-neutral-200">
			<header className="h-16 border-b border-neutral-200 bg-white px-4">
				<div className="mx-auto flex h-full max-w-5xl items-center">
					<div>
						<p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
							Documento para revisar
						</p>
						<p className="font-semibold">
							{documentNumber
								? `Remito ${documentNumber}`
								: "Cargando remito..."}
						</p>
					</div>
				</div>
			</header>
			<div className="mx-auto max-w-5xl px-3 py-5 sm:px-6 sm:py-8">
				<div className="mx-auto aspect-[210/297] w-full max-w-[880px] animate-pulse bg-white shadow-sm" />
				<p className="mt-4 text-center text-sm text-neutral-600">
					Preparando documento...
				</p>
			</div>
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
