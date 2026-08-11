import type { GenerateRentalBudgetBodyDto } from "@repo/api-contracts";
import { useState } from "react";
import { toast } from "sonner";
import { generateRentalBudget } from "@/features/contracts/rental-budget/generate-rental-budget/generate-rental-budget.api";
import { ProblemDetailsError } from "@/shared/errors";

export function useRentalBudgetActions(
	rentalId: string,
	hasLinkedCustomer: boolean,
) {
	const [isOpening, setIsOpening] = useState(false);
	const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);

	async function openBudget() {
		if (!hasLinkedCustomer) {
			setIsCustomerDialogOpen(true);
			return;
		}

		await generateAndOpenBudget();
	}

	async function submitCustomerDetails(customer: GenerateRentalBudgetBodyDto) {
		const didOpenBudget = await generateAndOpenBudget(customer);

		if (didOpenBudget) {
			setIsCustomerDialogOpen(false);
		}
	}

	async function generateAndOpenBudget(
		customer?: GenerateRentalBudgetBodyDto,
	): Promise<boolean> {
		const previewWindow = openPreviewWindow();

		setIsOpening(true);

		try {
			const { blob } = await generateRentalBudget(rentalId, customer);
			const objectUrl = URL.createObjectURL(blob);

			if (previewWindow) {
				previewWindow.location.href = objectUrl;
			} else {
				window.open(objectUrl, "_blank", "noopener,noreferrer");
			}

			window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
			return true;
		} catch (error) {
			previewWindow?.close();
			toast.error(getRentalBudgetErrorMessage(error));
			return false;
		} finally {
			setIsOpening(false);
		}
	}

	return {
		isOpening,
		isCustomerDialogOpen,
		setIsCustomerDialogOpen,
		openBudget,
		submitCustomerDetails,
	};
}

function openPreviewWindow() {
	const previewWindow = window.open("", "_blank");

	if (previewWindow) {
		previewWindow.opener = null;
	}

	return previewWindow;
}

function getRentalBudgetErrorMessage(error: unknown) {
	if (error instanceof ProblemDetailsError) {
		return (
			error.problemDetails.detail ||
			error.problemDetails.title ||
			"No pudimos abrir el presupuesto. Intentá nuevamente."
		);
	}

	return "No pudimos abrir el presupuesto. Intentá nuevamente.";
}
