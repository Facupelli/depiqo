import { getProblemDetailsCode, ProblemDetailsError } from "@/shared/errors";

export type ArchiveProductUiError = {
	message: string;
};

const NETWORK_ERROR_MESSAGE = "Ocurrió un error al archivar el producto.";

const GENERIC_ARCHIVE_ERROR_MESSAGE = "No pudimos archivar el producto.";

const archiveErrorMessages = {
	"catalog.rentable_item_not_found":
		"No encontramos este producto. Actualizá la página e intentá de nuevo.",
} satisfies Record<string, string>;

export function getArchiveProductError(error: unknown): ArchiveProductUiError {
	if (!(error instanceof ProblemDetailsError)) {
		return { message: NETWORK_ERROR_MESSAGE };
	}

	const code = getProblemDetailsCode(error);

	if (!code || !(code in archiveErrorMessages)) {
		return { message: GENERIC_ARCHIVE_ERROR_MESSAGE };
	}

	return {
		message: archiveErrorMessages[code as keyof typeof archiveErrorMessages],
	};
}
