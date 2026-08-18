import { useState } from "react";
import { toast } from "sonner";
import type { GetRentalDetailViewResponseDto } from "@/modules/rentals/rental-detail/get-rental-detail-view/get-rental-detail-view.schema";
import { ProblemDetailsError } from "@/shared/errors";
import {
	type RentalSigningInvitationFormValues,
	toRentalSigningInvitationDto,
} from "./rental-signing-invitation.schema";
import { useSendSigningInvitation } from "./send-rental-signing-invitation.mutation";

export function useRentalSigningInvitationActions(
	rental: GetRentalDetailViewResponseDto,
) {
	const [isInvitationDialogOpen, setIsInvitationDialogOpen] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const sendInvitationMutation = useSendSigningInvitation();

	function openSendDialog() {
		setSubmitError(null);
		setIsInvitationDialogOpen(true);
	}

	function handleInvitationDialogOpenChange(open: boolean) {
		setIsInvitationDialogOpen(open);

		if (!open) {
			setSubmitError(null);
		}
	}

	async function submitInvitation(values: RentalSigningInvitationFormValues) {
		setSubmitError(null);

		try {
			const result = await sendInvitationMutation.mutateAsync({
				orderId: rental.id,
				body: toRentalSigningInvitationDto(values),
			});

			toast.success(
				result.reusedExistingRequest
					? "La invitación ya estaba activa y fue reenviada."
					: "Invitación de firma enviada.",
			);

			setIsInvitationDialogOpen(false);
		} catch (error) {
			setSubmitError(getSigningInvitationErrorMessage(error));
		}
	}

	return {
		isInvitationDialogOpen,
		setIsInvitationDialogOpen: handleInvitationDialogOpenChange,
		submitError,
		isPending: sendInvitationMutation.isPending,
		openSendDialog,
		submitInvitation,
	};
}

function getSigningInvitationErrorMessage(error: unknown) {
	if (error instanceof ProblemDetailsError) {
		return (
			error.problemDetails.detail ||
			error.problemDetails.title ||
			"No pudimos enviar la invitación de firma."
		);
	}

	return "No pudimos enviar la invitación de firma.";
}
