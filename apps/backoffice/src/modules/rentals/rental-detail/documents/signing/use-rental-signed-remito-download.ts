import { useState } from "react";
import { toast } from "sonner";
import { ProblemDetailsError } from "@/shared/errors";
import { downloadRentalSignedRemito } from "./download-rental-signed-remito.api";

export function useRentalSignedRemitoDownload(
	rentalId: string,
	fallbackFileName: string,
) {
	const [isDownloading, setIsDownloading] = useState(false);

	async function download() {
		setIsDownloading(true);

		try {
			const { blob, contentDisposition } =
				await downloadRentalSignedRemito(rentalId);
			const objectUrl = URL.createObjectURL(blob);
			const anchor = document.createElement("a");

			anchor.href = objectUrl;
			anchor.download =
				getContentDispositionFileName(contentDisposition) ?? fallbackFileName;
			anchor.style.display = "none";
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
			window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
		} catch (error) {
			toast.error(getDownloadErrorMessage(error));
		} finally {
			setIsDownloading(false);
		}
	}

	return { download, isDownloading };
}

function getContentDispositionFileName(value: string | null): string | null {
	if (!value) return null;

	const encodedMatch = value.match(/filename\*=UTF-8''([^;]+)/i);
	if (encodedMatch?.[1]) {
		try {
			return decodeURIComponent(encodedMatch[1]);
		} catch {
			return encodedMatch[1];
		}
	}

	return value.match(/filename="([^"]+)"/i)?.[1] ?? null;
}

function getDownloadErrorMessage(error: unknown): string {
	if (error instanceof ProblemDetailsError) {
		return (
			error.problemDetails.detail ||
			error.problemDetails.title ||
			"No pudimos descargar el remito firmado. Intentá nuevamente."
		);
	}

	return "No pudimos descargar el remito firmado. Intentá nuevamente.";
}
