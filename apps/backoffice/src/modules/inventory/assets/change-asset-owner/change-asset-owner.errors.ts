import { getProblemDetailsCode, ProblemDetailsError } from "@/shared/errors";

const changeAssetOwnerErrorMessages = {
	"asset_inventory.asset_not_found":
		"No encontramos esta unidad. Actualizá la página e intentá de nuevo.",
	"asset_inventory.invalid_asset_field":
		"No se pudo aplicar el cambio de propietario.",
	"asset_inventory.asset_owner_not_found":
		"El propietario seleccionado ya no existe. Elegí otro propietario.",
	"asset_inventory.active_owner_contract_not_found":
		"El propietario seleccionado no tiene un contrato activo y no puede asignarse.",
	"asset_inventory.multiple_active_owner_contracts":
		"El propietario seleccionado tiene múltiples contratos activos y no puede asignarse.",
} satisfies Record<string, string>;

const genericChangeAssetOwnerErrorMessage =
	"No pudimos cambiar el propietario. Intentá de nuevo.";

export function getChangeAssetOwnerErrorMessage(error: unknown): string {
	if (!(error instanceof ProblemDetailsError)) {
		return genericChangeAssetOwnerErrorMessage;
	}

	const code = getProblemDetailsCode(error);

	return code && code in changeAssetOwnerErrorMessages
		? changeAssetOwnerErrorMessages[
				code as keyof typeof changeAssetOwnerErrorMessages
			]
		: genericChangeAssetOwnerErrorMessage;
}
