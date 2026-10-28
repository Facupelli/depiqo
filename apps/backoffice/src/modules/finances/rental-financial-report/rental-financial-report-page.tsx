import type { GetCurrentTenantResponseDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { formatTimestampInTimezone } from "@/lib/dates/format";
import {
	getProblemDetailsStatus,
	isAuthError,
	isForbiddenError,
} from "@/shared/errors";
import {
	getFinancialReportContext,
	rentalFinancialReportQueries,
} from "./rental-financial-report.queries";
import {
	type FinancialReportSelection,
	getFinancialReportPeriodLabel,
	getSelectedFinancialReportTotals,
} from "./rental-financial-report.utils";
import { RentalFinancialReportChart } from "./rental-financial-report-chart";
import { RentalFinancialReportOwners } from "./rental-financial-report-owners";
import {
	RentalFinancialReportError,
	RentalFinancialReportSkeleton,
} from "./rental-financial-report-state";
import { RentalFinancialReportSummary } from "./rental-financial-report-summary";
import { RentalFinancialReportTable } from "./rental-financial-report-table";
import { RentalFinancialReportToolbar } from "./rental-financial-report-toolbar";

export function RentalFinancialReportPage({
	business,
	selection,
	onSelectionChange,
}: {
	business: GetCurrentTenantResponseDto;
	selection: FinancialReportSelection;
	onSelectionChange: (selection: FinancialReportSelection) => void;
}) {
	const reportQuery = useQuery({
		...rentalFinancialReportQueries.report(
			selection.year,
			getFinancialReportContext(business),
		),
		throwOnError: (error) => isAuthError(error) || isForbiddenError(error),
	});
	const report = reportQuery.data;
	const totals = report
		? getSelectedFinancialReportTotals(report, selection.period)
		: undefined;
	const periodLabel = getFinancialReportPeriodLabel(
		selection.period,
		selection.year,
	);
	const errorStatus = getProblemDetailsStatus(reportQuery.error);
	const hasBlockingError =
		reportQuery.isError &&
		(!report || errorStatus === 409 || errorStatus === 404);
	return (
		<div className="@container/finances min-w-0 space-y-5">
			<h1 className="sr-only">Finanzas</h1>
			<RentalFinancialReportToolbar
				selection={selection}
				timezone={business.config.timezone}
				onChange={onSelectionChange}
			/>

			{hasBlockingError ? (
				<RentalFinancialReportError
					error={reportQuery.error}
					onRetry={() => reportQuery.refetch()}
					isRetrying={reportQuery.isFetching}
				/>
			) : !report || !totals ? (
				<RentalFinancialReportSkeleton />
			) : (
				<div className="space-y-4" aria-busy={reportQuery.isFetching}>
					{reportQuery.isError ? (
						<div
							role="alert"
							className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
						>
							<p>
								No pudimos actualizar el reporte. Se muestra la última
								información disponible.
							</p>
							<Button
								variant="outline"
								size="sm"
								onClick={() => reportQuery.refetch()}
								disabled={reportQuery.isFetching}
							>
								Reintentar
							</Button>
						</div>
					) : null}
					<section
						aria-label={`Resumen de ${periodLabel}`}
						className="space-y-3"
					>
						<RentalFinancialReportSummary
							totals={totals}
							currency={report.currency}
							inclusions={selection}
						/>
						{totals.rentalCount === 0 ? (
							<p className="rounded-lg border border-dashed px-4 py-3 text-xs text-neutral-500">
								No hay alquileres confirmados o completados con inicio en este
								período.
							</p>
						) : null}
					</section>
					<div className="grid min-w-0 gap-4 @2xl/finances:grid-cols-2">
						<RentalFinancialReportChart
							report={report}
							inclusions={selection}
							period={selection.period}
						/>
						<RentalFinancialReportOwners
							totals={totals}
							currency={report.currency}
							periodLabel={periodLabel}
						/>
					</div>
					<RentalFinancialReportTable
						report={report}
						selection={selection}
						onPeriodChange={(period) =>
							onSelectionChange({ ...selection, period })
						}
					/>
					<footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[11px] leading-relaxed text-neutral-500">
						<p className="max-w-3xl">
							Importes acordados de alquileres confirmados y completados,
							agrupados por mes de inicio.
							<br className="hidden sm:block" /> Incluye alquileres futuros; no
							representa cobros ni ganancias.
						</p>
						<div className="flex items-center gap-2">
							<p aria-live="polite" title={`Zona horaria: ${report.timezone}`}>
								{reportQuery.isFetching
									? "Actualizando reporte..."
									: `Actualizado: ${formatTimestampInTimezone(new Date(reportQuery.dataUpdatedAt), report.timezone, "DD/MM/YYYY HH:mm")}`}
							</p>
							<Button
								variant="ghost"
								size="icon"
								aria-label="Actualizar reporte"
								className="size-7 text-neutral-400 hover:text-depiqo-blue-600 pointer-coarse:size-11"
								onClick={() => reportQuery.refetch()}
								disabled={reportQuery.isFetching}
							>
								<RefreshCw
									className={`size-3.5 ${reportQuery.isFetching ? "animate-spin" : ""}`}
								/>
							</Button>
						</div>
					</footer>
				</div>
			)}
		</div>
	);
}
