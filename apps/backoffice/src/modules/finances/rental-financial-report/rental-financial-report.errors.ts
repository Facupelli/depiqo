import { getProblemDetailsCode, isForbiddenError } from "@/shared/errors";

export function getFinancialReportErrorMessage(error: unknown): string {
	if (isForbiddenError(error))
		return "No tienes permisos para consultar las finanzas del negocio.";
	if (
		getProblemDetailsCode(error) ===
		"rental_commitment.financial_report_currency_mismatch"
	) {
		return "Hay alquileres con importes en una moneda distinta a la configurada para el negocio. Es necesario revisar esas monedas antes de generar el reporte.";
	}
	return "No pudimos cargar el reporte financiero. Inténtalo nuevamente.";
}
