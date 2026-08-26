import { Button } from "@repo/ui/components/button";
import { useState } from "react";
import { getProblemDetailsStatus } from "@/shared/errors";
import { fetchSignedReceiptDocument } from "../public-signing-document.api";
import type { PublicSigningReceiptToken } from "../public-signing-receipt-token";

type PublicSigningSignedReceiptDownloadProps = {
	receiptToken: PublicSigningReceiptToken;
	receiptTokenExpiresAt: string;
};

export function PublicSigningSignedReceiptDownload({
	receiptToken,
	receiptTokenExpiresAt,
}: PublicSigningSignedReceiptDownloadProps) {
	const [isPending, setIsPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleDownload() {
		setIsPending(true);
		setError(null);
		try {
			const blob = await fetchSignedReceiptDocument(receiptToken);
			const objectUrl = URL.createObjectURL(blob);
			const anchor = document.createElement("a");
			anchor.href = objectUrl;
			anchor.download = "contrato-firmado.pdf";
			anchor.click();
			setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
		} catch (downloadError) {
			setError(getDownloadErrorMessage(downloadError));
		} finally {
			setIsPending(false);
		}
	}

	return (
		<div className="space-y-3">
			<Button className="w-full" disabled={isPending} onClick={handleDownload}>
				{isPending ? "Preparando descarga..." : "Descargar contrato firmado"}
			</Button>
			<p className="text-center text-xs leading-5 text-neutral-500">
				Disponible hasta {formatDateTime(receiptTokenExpiresAt)}.
			</p>
			{error ? (
				<p className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm leading-6 text-neutral-700">
					{error}
				</p>
			) : null}
		</div>
	);
}

function getDownloadErrorMessage(error: unknown): string {
	switch (getProblemDetailsStatus(error)) {
		case 404:
		case 409:
			return "El contrato firmado ya no está disponible para descargar.";
		case 410:
			return "El enlace de descarga del contrato firmado venció.";
		default:
			return "No pudimos descargar el contrato firmado. Intenta nuevamente.";
	}
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
