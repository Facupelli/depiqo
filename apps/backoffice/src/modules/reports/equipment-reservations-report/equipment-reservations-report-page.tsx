import type { GetEquipmentReservationsReportQueryDto } from "@repo/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { useId } from "react";
import { isAuthError, isForbiddenError } from "@/shared/errors";
import { ReportPagination } from "../report-pagination";
import { ReportRefreshButton, ReportRefreshError } from "../report-state";
import { ReportToolbar } from "../report-toolbar";
import type { ReportContext } from "../reports.queries";
import { equipmentReservationsReportQueries } from "./equipment-reservations-report.queries";
import { EquipmentReservationsReportTable } from "./equipment-reservations-report-table";

export function EquipmentReservationsReportPage({
	input,
	context,
	onInputChange,
}: {
	input: GetEquipmentReservationsReportQueryDto;
	context: ReportContext;
	onInputChange: (input: GetEquipmentReservationsReportQueryDto) => void;
}) {
	const titleId = useId();
	const reportQuery = useQuery({
		...equipmentReservationsReportQueries.report(input, context),
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
						Equipos ordenados por cantidad de alquileres
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
				<p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
					<Info className="mt-0.5 size-3.5 shrink-0" />
					<span>
						<strong className="font-medium text-foreground">Alquileres:</strong>{" "}
						pedidos distintos ·{" "}
						<strong className="font-medium text-foreground">Unidades:</strong>{" "}
						cantidad de equipos incluidos, también en combos y accesorios.
					</span>
				</p>
				<div>
					<EquipmentReservationsReportTable report={report} titleId={titleId} />
					{report ? (
						<ReportPagination
							page={report.page}
							pageSize={report.pageSize}
							total={report.total}
							noun="tipos de equipo"
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
			</p>
		</div>
	);
}
