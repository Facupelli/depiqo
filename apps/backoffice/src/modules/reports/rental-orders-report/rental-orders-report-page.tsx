import type { GetRentalOrdersReportQueryDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useId } from "react";
import { isAuthError, isForbiddenError } from "@/shared/errors";
import { ReportPagination } from "../report-pagination";
import { ReportRefreshButton, ReportRefreshError } from "../report-state";
import { ReportToolbar } from "../report-toolbar";
import type { ReportContext } from "../reports.queries";
import { rentalOrdersReportQueries } from "./rental-orders-report.queries";
import { RentalOrdersReportTable } from "./rental-orders-report-table";

const invoiceFilters = [
	{ value: "ALL", label: "Todos", summary: "rentalCount" },
	{ value: "WITH_INVOICE", label: "Con factura", summary: "withInvoiceCount" },
	{
		value: "WITHOUT_INVOICE",
		label: "Sin factura",
		summary: "withoutInvoiceCount",
	},
] as const;

export function RentalOrdersReportPage({
	input,
	context,
	canOpenRental,
	onInputChange,
}: {
	input: GetRentalOrdersReportQueryDto;
	context: ReportContext;
	canOpenRental: boolean;
	onInputChange: (input: GetRentalOrdersReportQueryDto) => void;
}) {
	const titleId = useId();
	const reportQuery = useQuery({
		...rentalOrdersReportQueries.report(input, context),
		throwOnError: (error, query) =>
			!query.state.data || isAuthError(error) || isForbiddenError(error),
	});
	const report = reportQuery.data;
	return (
		<div className="min-w-0 space-y-6">
			<ReportToolbar
				value={input}
				onChange={(changes) => onInputChange({ ...input, ...changes, page: 1 })}
			/>
			<section
				aria-labelledby={titleId}
				aria-busy={reportQuery.isFetching}
				className="min-w-0 space-y-5 rounded-xl border border-border bg-card text-card-foreground p-4 sm:p-5 lg:p-6"
			>
				<div className="flex items-center justify-between gap-3">
					<h2
						id={titleId}
						className="text-base font-semibold tracking-tight text-foreground"
					>
						Alquileres y facturas registradas del período
					</h2>
					<ReportRefreshButton
						isFetching={reportQuery.isFetching}
						onRefresh={() => {
							void reportQuery.refetch();
						}}
					/>
				</div>
				{reportQuery.isError ? (
					<ReportRefreshError
						isFetching={reportQuery.isFetching}
						onRetry={() => {
							void reportQuery.refetch();
						}}
					/>
				) : null}
				<fieldset
					aria-label="Presencia de factura"
					className="inline-flex min-w-0 max-w-full overflow-x-auto rounded-lg border border-border"
				>
					{invoiceFilters.map((filter) => {
						const selected = input.invoicePresence === filter.value;
						return (
							<Button
								key={filter.value}
								variant="ghost"
								aria-pressed={selected}
								onClick={() =>
									onInputChange({
										...input,
										invoicePresence: filter.value,
										page: 1,
									})
								}
								className={`h-9 shrink-0 gap-2 rounded-none border-r border-border px-2 text-xs last:border-r-0 sm:gap-3 sm:px-3 pointer-coarse:min-h-11 ${selected ? "bg-depiqo-blue-50 text-depiqo-blue-600 shadow-[inset_0_0_0_1px_var(--color-depiqo-blue-200)] hover:bg-depiqo-blue-100 hover:text-depiqo-blue-700" : "font-normal text-muted-foreground hover:bg-muted/40"}`}
							>
								{filter.label}
								{report ? (
									<span
										className={`rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ${selected ? "bg-depiqo-blue-100 text-depiqo-blue-700" : "bg-muted text-muted-foreground"}`}
									>
										{report.summary[filter.summary]}
									</span>
								) : (
									<Skeleton className="h-5 w-6" />
								)}
							</Button>
						);
					})}
				</fieldset>
				<div>
					<RentalOrdersReportTable
						report={report}
						canOpenRental={canOpenRental}
						titleId={titleId}
					/>
					{report ? (
						<ReportPagination
							page={report.page}
							pageSize={report.pageSize}
							total={report.total}
							noun="alquileres"
							disabled={reportQuery.isFetching}
							onPageChange={(page) => onInputChange({ ...input, page })}
							onPageSizeChange={(pageSize) =>
								onInputChange({ ...input, pageSize, page: 1 })
							}
						/>
					) : null}
				</div>
			</section>
			<p className="text-xs leading-relaxed text-muted-foreground">
				Período según el inicio del alquiler en{" "}
				{report?.period.timezone ?? context.timezone}. Incluye inicios futuros.
				Estos importes no indican cuánto se cobró ni cuánto queda por cobrar.
			</p>
		</div>
	);
}
