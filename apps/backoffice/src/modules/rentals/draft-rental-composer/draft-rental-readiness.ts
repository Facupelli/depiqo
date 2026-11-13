import type {
	PreviewDraftRentalCostBodyDto,
	PreviewDraftRentalCostResponseDto,
} from "@repo/api-contracts";
import type { z } from "zod";
import { getDeliveryErrorMessage } from "../shared/delivery-error-messages";
import { deliveryBlockingMessages } from "./delivery-preview";
import {
	type DraftRentalDerivationValues,
	toPreviewDraftRentalCostDto,
} from "./draft-rental-composer.schema";

export function buildDraftRentalProposal(
	values: DraftRentalDerivationValues,
	schema: z.ZodType<DraftRentalDerivationValues>,
	previewSchema: z.ZodType<DraftRentalDerivationValues>,
	timezone: string,
	rentalId?: string,
): { body: PreviewDraftRentalCostBodyDto | null; messages: string[] } {
	const validation = schema.safeParse(values);
	const issues = validation.success ? [] : validation.error.issues;
	const messages = [...new Set(issues.map((issue) => issue.message))];
	const previewValidation = previewSchema.safeParse(values);
	if (!previewValidation.success) return { body: null, messages };
	return {
		body: toPreviewDraftRentalCostDto(
			previewValidation.data,
			timezone,
			rentalId,
		),
		messages,
	};
}

export function getDraftRentalReadiness({
	values,
	inputMessages,
	preview,
	previewError,
	canManageDelivery,
	expectedVersion,
	submitDisabled,
	pending,
	formValid,
}: {
	values: DraftRentalDerivationValues;
	inputMessages: string[];
	preview: PreviewDraftRentalCostResponseDto | undefined;
	previewError: unknown;
	canManageDelivery: boolean;
	expectedVersion: number | undefined;
	submitDisabled: boolean;
	pending: boolean;
	formValid: boolean;
}) {
	const messages = [
		...inputMessages,
		...deliveryBlockingMessages(preview?.delivery),
	];
	const deliverySelected = values.fulfillmentMethod === "DELIVERY";
	const exceptionAccepted =
		deliverySelected && values.deliveryExceptionAccepted;
	const agreementChanged =
		deliverySelected &&
		(values.deliveryAgreementDecision === "SET" ||
			values.deliveryAgreementDecision === "CLEAR");
	if (previewError) {
		messages.push(
			getDeliveryErrorMessage(previewError) ??
				"No pudimos actualizar el total. Revisá los datos e intentá nuevamente.",
		);
	}
	if (preview?.delivery?.policyExceptionRequired && !exceptionAccepted) {
		messages.push(
			canManageDelivery
				? "Autorizá la excepción a las condiciones de envío para guardar."
				: "Necesitás permiso para autorizar esta excepción.",
		);
	}
	if (!canManageDelivery && (exceptionAccepted || agreementChanged)) {
		messages.push(
			"No tenés permiso para modificar importes ni autorizar excepciones de envío.",
		);
	}
	if (
		preview &&
		expectedVersion !== undefined &&
		preview.draftVersion !== expectedVersion
	) {
		messages.push(
			"El borrador cambió mientras lo editabas. Volvé a abrirlo antes de guardar.",
		);
	}
	if (preview?.customerTotal === null && messages.length === 0) {
		messages.push(
			"El importe de entrega y retiro está pendiente. Revisá las condiciones de envío.",
		);
	}
	const canSave =
		!submitDisabled && formValid && Boolean(preview) && messages.length === 0;
	return {
		messages: [...new Set(messages)],
		canSubmit: canSave && !pending,
	};
}
