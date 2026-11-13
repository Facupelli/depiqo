import type {
	PreviewDraftRentalCostBodyDto,
	PreviewDraftRentalCostResponseDto,
} from "@repo/api-contracts";
import type { z } from "zod";
import { ProblemDetailsError } from "@/shared/errors";
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
			previewError instanceof ProblemDetailsError
				? previewError.problemDetails.detail ||
						"No pudimos calcular el costo. Revisá los datos e intentá nuevamente."
				: "No pudimos calcular el costo. Revisá los datos e intentá nuevamente.",
		);
	}
	if (preview?.delivery?.policyExceptionRequired && !exceptionAccepted) {
		messages.push(
			canManageDelivery
				? "Aceptá explícitamente la excepción de envío para guardar."
				: "Se requiere permiso para autorizar esta excepción de envío.",
		);
	}
	if (!canManageDelivery && (exceptionAccepted || agreementChanged)) {
		messages.push(
			"No tenés permiso para modificar acuerdos o autorizar excepciones de envío.",
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
			"El costo del envío está pendiente. Revisá las condiciones de transporte.",
		);
	}
	const canSave =
		!submitDisabled && formValid && Boolean(preview) && messages.length === 0;
	return {
		messages: [...new Set(messages)],
		canSubmit: canSave && !pending,
	};
}
