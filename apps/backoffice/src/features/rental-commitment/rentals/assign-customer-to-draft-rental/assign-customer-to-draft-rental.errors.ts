import { ProblemDetailsError } from "@/shared/errors";

const PROBLEM_TYPE_BASE_URI = "https://api.depiqo.com/problems";

const assignmentErrorMessages = {
	[`${PROBLEM_TYPE_BASE_URI}/rental-commitment/rental-not-found`]:
		"No encontramos el pedido al que querés asignar el cliente.",
	[`${PROBLEM_TYPE_BASE_URI}/rental-commitment/rental-must-be-draft`]:
		"Solo se puede asignar un cliente a un pedido en borrador.",
	[`${PROBLEM_TYPE_BASE_URI}/rental-commitment/customer-not-assignable-to-draft-rental`]:
		"Este cliente ya no está disponible para asignarlo al pedido.",
	[`${PROBLEM_TYPE_BASE_URI}/rental-commitment/customer-deleted`]:
		"Este cliente fue eliminado y ya no está disponible para asignarlo al pedido.",
	[`${PROBLEM_TYPE_BASE_URI}/rental-commitment/customer-inactive`]:
		"Este cliente está inactivo y no se puede asignar al pedido.",
	[`${PROBLEM_TYPE_BASE_URI}/rental-commitment/invalid-customer`]:
		"El cliente seleccionado no es válido.",
} as const;

export function getAssignCustomerToDraftRentalErrorMessage(
	error: unknown,
): string {
	if (!(error instanceof ProblemDetailsError)) {
		return "No pudimos asignar el cliente al pedido.";
	}

	return (
		assignmentErrorMessages[
			error.problemDetails.type as keyof typeof assignmentErrorMessages
		] ?? "No pudimos asignar el cliente al pedido."
	);
}
