import {
	getProblemDetailsCode,
	getProblemDetailsStatus,
	ProblemDetailsError,
} from "@/shared/errors";

const unexpectedErrorMessage =
	"No pudimos cambiar tu contraseña. Inténtalo nuevamente.";

export function mapChangePasswordError(error: unknown): string {
	if (!(error instanceof ProblemDetailsError)) {
		return unexpectedErrorMessage;
	}

	const code = getProblemDetailsCode(error);

	if (code === "tenant_management.current_password_incorrect") {
		return "La contraseña actual es incorrecta.";
	}

	if (code === "tenant_management.local_credential_not_found") {
		return "Esta cuenta no tiene una contraseña local que se pueda cambiar.";
	}

	const status = getProblemDetailsStatus(error);

	if (status === 401 || status === 403) {
		return "Tu sesión ya no es válida. Cierra sesión e ingresa nuevamente.";
	}

	if (status === 400 || status === 422) {
		return "La nueva contraseña no es válida. Revisa los datos e inténtalo nuevamente.";
	}

	return unexpectedErrorMessage;
}
