import { GenericErrorPage } from "@/shared/components/generic-error-page";
import { PermissionDeniedPage } from "@/shared/components/permission-denied-page";
import { isForbiddenError } from "@/shared/errors";

type AdminRouteErrorProps = {
	error: unknown;
	genericMessage?: string;
	forbiddenMessage?: string;
};

export function AdminRouteError({
	error,
	genericMessage,
	forbiddenMessage,
}: AdminRouteErrorProps) {
	if (isForbiddenError(error)) {
		return (
			<PermissionDeniedPage
				message={forbiddenMessage ?? "No tienes permisos para ver esta pagina."}
			/>
		);
	}

	return (
		<GenericErrorPage
			message={
				genericMessage ?? "No pudimos cargar esta pagina en este momento."
			}
		/>
	);
}
