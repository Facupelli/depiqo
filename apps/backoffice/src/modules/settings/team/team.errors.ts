import { getProblemDetailsCode, ProblemDetailsError } from "@/shared/errors";

const teamErrorMessages: Record<string, string> = {
	"tenant_management.collaborator_not_found":
		"No encontramos a este integrante del equipo.",
	"tenant_management.collaborator_email_already_in_use":
		"Ya existe un integrante con este correo electrónico.",
	"tenant_management.cannot_manage_self":
		"No puedes realizar esta acción sobre tu propia cuenta.",
	"tenant_management.collaborator_management_forbidden":
		"No tienes autorización para administrar a este integrante.",
	"tenant_management.invalid_collaborator_status_transition":
		"El estado del integrante cambió. Actualiza la lista e inténtalo nuevamente.",
	"tenant_management.last_active_administrator":
		"Debe permanecer al menos un Administrador activo en el equipo.",
	"tenant_management.role_not_found":
		"El rol seleccionado ya no está disponible.",
	"tenant_management.role_assignment_forbidden":
		"No tienes autorización para asignar ese rol.",
	"tenant_management.administrator_role_assignment_forbidden":
		"Solo un Administrador puede asignar el rol de Administrador.",
	"tenant_management.team_authorization_state_invalid":
		"El estado de autorización del equipo no es válido. Contacta a soporte.",
};

export function getTeamErrorMessage(
	error: unknown,
	fallback = "No pudimos completar la acción. Inténtalo nuevamente.",
): string {
	const code = getProblemDetailsCode(error);
	if (code && teamErrorMessages[code]) return teamErrorMessages[code];
	if (error instanceof ProblemDetailsError && error.problemDetails.detail) {
		return error.problemDetails.detail;
	}
	return fallback;
}
