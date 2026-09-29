import { useState } from "react";
import { toast } from "sonner";
import type { GetRentalDetailViewResponseDto } from "@/modules/rentals/rental-detail/get-rental-detail-view/get-rental-detail-view.schema";
import { getProblemDetailsCode } from "@/shared/errors";
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

const signingInvitationErrorMessages: Record<string, string> = {
	"document_signing.order_not_found":
		"No encontramos el alquiler. Actualizá la página e intentá nuevamente.",
	"document_signing.order_not_ready":
		"Confirmá el alquiler antes de enviar el remito a firmar.",
	"document_signing.customer_profile_missing":
		"Completá el nombre y el documento de identidad del cliente antes de enviar el remito a firmar.",
	"document_signing.recipient_email_required":
		"Ingresá un email para enviar la invitación de firma.",
	"document_signing.tenant_signer_missing":
		"Configurá un firmante activo para tu empresa antes de enviar el remito a firmar.",
	"document_signing.branch_context_missing":
		"La sucursal del alquiler no está disponible. Revisá la sucursal antes de enviar el remito a firmar.",
	"document_signing.price_snapshot_invalid":
		"El alquiler no tiene un precio confirmado completo. Revisá el precio antes de enviar el remito a firmar.",
	"document_signing.contract_already_signed":
		"El remito ya está firmado y no se puede generar nuevamente para la firma.",
	"document_signing.invitation_delivery_failed":
		"No pudimos entregar la invitación por email. Intentá nuevamente.",
	"document_signing.signing_request_conflict":
		"La solicitud de firma cambió de estado. Actualizá la página e intentá nuevamente.",
};

function getSigningInvitationErrorMessage(error: unknown) {
	const code = getProblemDetailsCode(error);
	return (
		(code && signingInvitationErrorMessages[code]) ||
		"No pudimos enviar la invitación de firma. Intentá nuevamente."
	);
}
