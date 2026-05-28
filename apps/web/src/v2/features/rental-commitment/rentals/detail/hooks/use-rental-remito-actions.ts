import { useState } from "react";
import { toast } from "sonner";
import { ProblemDetailsError } from "@/shared/errors";
import { generateRentalRemito } from "@/v2/features/contracts/rental-remito/generate-rental-remito/generate-rental-remito.api";

export function useRentalRemitoActions(rentalId: string) {
	const [isOpening, setIsOpening] = useState(false);

	async function openRemito() {
		const previewWindow = openPreviewWindow();

		setIsOpening(true);

		try {
			const { blob } = await generateRentalRemito(rentalId);
			const objectUrl = URL.createObjectURL(blob);

			if (previewWindow) {
				previewWindow.location.href = objectUrl;
			} else {
				window.open(objectUrl, "_blank", "noopener,noreferrer");
			}

			window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
		} catch (error) {
			previewWindow?.close();
			toast.error(getRentalRemitoErrorMessage(error));
		} finally {
			setIsOpening(false);
		}
	}

	return {
		isOpening,
		openRemito,
	};
}

function openPreviewWindow() {
	const previewWindow = window.open("", "_blank");

	if (previewWindow) {
		previewWindow.opener = null;
	}

	return previewWindow;
}

function getRentalRemitoErrorMessage(error: unknown) {
	if (error instanceof ProblemDetailsError) {
		return (
			error.problemDetails.detail ||
			error.problemDetails.title ||
			"No pudimos abrir el remito. Intentá nuevamente."
		);
	}

	return "No pudimos abrir el remito. Intentá nuevamente.";
}
