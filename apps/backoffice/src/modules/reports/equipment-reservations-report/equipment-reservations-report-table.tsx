import type { GetEquipmentReservationsReportResponseDto } from "@repo/api-contracts";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { ReportTableSkeleton } from "../report-state";

export function EquipmentReservationsReportTable({
	report,
	titleId,
}: {
	report: GetEquipmentReservationsReportResponseDto | undefined;
	titleId: string;
}) {
	return (
		<div className="overflow-hidden rounded-lg border border-border">
			<Table
				aria-labelledby={titleId}
				className="text-foreground [&_td]:px-4 [&_td]:py-4 [&_th]:h-10 [&_th]:px-4 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground"
			>
				<TableHeader className="bg-muted/40">
					<TableRow className="hover:bg-transparent">
						<TableHead className="w-[65%]">Equipo</TableHead>
						<TableHead className="text-right">Alquileres</TableHead>
						<TableHead className="text-right">Unidades incluidas</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody className="[&_tr:nth-child(even)]:bg-muted/20">
					{!report ? (
						<ReportTableSkeleton columns={3} />
					) : report.data.length === 0 ? (
						<TableRow>
							<TableCell
								colSpan={3}
								className="h-40 whitespace-normal text-center text-muted-foreground"
							>
								{report.total > 0
									? "Esta página ya no tiene resultados."
									: "No hay equipos reservados para los filtros seleccionados."}
							</TableCell>
						</TableRow>
					) : (
						report.data.map((equipment, index) => (
							<TableRow key={equipment.equipmentTypeId}>
								<TableCell>
									<div className="flex items-center gap-5">
										<span className="w-5 shrink-0 text-xs text-muted-foreground tabular-nums">
											{String(
												(report.page - 1) * report.pageSize + index + 1,
											).padStart(2, "0")}
										</span>
										<span className="min-w-36 whitespace-normal font-semibold text-foreground">
											{equipment.equipmentTypeName || "Nombre no disponible"}
										</span>
									</div>
								</TableCell>
								<TableCell className="text-right font-semibold text-foreground tabular-nums">
									{equipment.rentalCount}
								</TableCell>
								<TableCell className="text-right text-foreground tabular-nums">
									{equipment.unitDemand}
								</TableCell>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	);
}
