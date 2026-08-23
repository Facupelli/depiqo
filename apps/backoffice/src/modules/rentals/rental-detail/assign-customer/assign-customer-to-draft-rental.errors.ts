import { getProblemDetailsCode, ProblemDetailsError } from "@/shared/errors";

const GENERIC_ASSIGN_ERROR_MESSAGE = "No pudimos asignar el cliente al pedido.";

const assignmentErrorMessages = {
	"rental_commitment.rental_not_found":
		"No encontramos el pedido al que querés asignar el cliente.",
	"rental_commitment.rental_must_be_draft":
		"Solo se puede asignar un cliente a un pedido en borrador.",
	"rental_commitment.customer_not_found_or_outside_tenant":
		"Este cliente ya no está disponible para asignarlo al pedido.",
	"rental_commitment.customer_deleted":
		"Este cliente fue eliminado y ya no está disponible para asignarlo al pedido.",
	"rental_commitment.customer_inactive":
		"Este cliente está inactivo y no se puede asignar al pedido.",
} satisfies Record<string, string>;

export function getAssignCustomerToDraftRentalErrorMessage(
	error: unknown,
): string {
	if (!(error instanceof ProblemDetailsError)) {
		return GENERIC_ASSIGN_ERROR_MESSAGE;
	}

	const code = getProblemDetailsCode(error);

	if (!code || !(code in assignmentErrorMessages)) {
		return GENERIC_ASSIGN_ERROR_MESSAGE;
	}

	return assignmentErrorMessages[code as keyof typeof assignmentErrorMessages];
}
