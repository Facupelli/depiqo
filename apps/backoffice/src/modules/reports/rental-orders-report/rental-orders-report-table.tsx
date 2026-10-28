import type {
	GetRentalOrdersReportResponseDto,
	ReportRentalStatusDto,
} from "@repo/api-contracts";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { Link } from "@tanstack/react-router";
import { formatTimestampInTimezone } from "@/lib/dates/format";
import { formatExactMoney } from "@/shared/utils/decimal-string";
import { formatOrderNumber } from "@/shared/utils/formatters";
import { ReportTableSkeleton } from "../report-state";
import { formatReportRentalPeriod } from "./rental-orders-report.utils";
import { RentalOrdersReportInvoices } from "./rental-orders-report-invoices";

const statuses: Record<
	ReportRentalStatusDto,
	{ label: string; className: string }
> = {
	CONFIRMED: {
		label: "Confirmado",
		className: "bg-emerald-50 text-emerald-700",
	},
	COMPLETED: {
		label: "Completado",
		className: "bg-muted text-muted-foreground",
	},
	CANCELLED: { label: "Cancelado", className: "bg-red-50 text-red-700" },
};

export function RentalOrdersReportTable({
	report,
	canOpenRental,
	titleId,
}: {
	report: GetRentalOrdersReportResponseDto | undefined;
	canOpenRental: boolean;
	titleId: string;
}) {
	return (
		<div className="overflow-hidden rounded-lg border border-border">
			<Table
				aria-labelledby={titleId}
				className="text-foreground [&_td]:px-4 [&_td]:py-3 [&_th]:h-10 [&_th]:px-4 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground"
			>
				<TableHeader className="bg-muted/40">
					<TableRow className="hover:bg-transparent">
						<TableHead className="w-[19%]">Alquiler / Cliente</TableHead>
						<TableHead className="w-[19%]">Período</TableHead>
						<TableHead>Estado</TableHead>
						<TableHead className="text-right">Precio acordado</TableHead>
						<TableHead className="w-[22%]">Facturas</TableHead>
						<TableHead>Sucursal</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody className="[&_tr:nth-child(even)]:bg-muted/20">
					{!report ? (
						<ReportTableSkeleton columns={6} />
					) : report.data.length === 0 ? (
						<TableRow>
							<TableCell
								colSpan={6}
								className="h-40 whitespace-normal text-center text-muted-foreground"
							>
								{report.total > 0
									? "Esta página ya no tiene resultados."
									: "No hay alquileres para los filtros seleccionados."}
							</TableCell>
						</TableRow>
					) : (
						report.data.map((rental) => {
							const rentalNumber = formatOrderNumber(rental.rentalNumber);
							const status = statuses[rental.status];
							const timezone = report.period.timezone;
							return (
								<TableRow key={rental.id}>
									<TableCell>
										<div className="space-y-0.5">
											{canOpenRental ? (
												<Link
													to="/dashboard/orders/$orderId"
													params={{ orderId: rental.id }}
													preload={false}
													className="inline-flex min-h-5 items-center font-semibold text-depiqo-blue-600 hover:underline pointer-coarse:min-h-11"
												>
													{rentalNumber}
												</Link>
											) : (
												<span className="font-semibold text-foreground">
													{rentalNumber}
												</span>
											)}
											<p
												className="max-w-56 truncate text-xs text-muted-foreground"
												title={rental.customer?.name ?? undefined}
											>
												{rental.customer === null
													? "Sin cliente"
													: (rental.customer.name ?? "Nombre no disponible")}
											</p>
										</div>
									</TableCell>
									<TableCell className="text-foreground">
										<span
											title={`${formatTimestampInTimezone(rental.period.start, timezone, "DD/MM/YYYY HH:mm")} - ${formatTimestampInTimezone(rental.period.end, timezone, "DD/MM/YYYY HH:mm")} (${timezone})`}
										>
											{formatReportRentalPeriod(
												rental.period.start,
												rental.period.end,
												timezone,
											)}
										</span>
									</TableCell>
									<TableCell>
										<span
											className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${status.className}`}
										>
											{status.label}
										</span>
									</TableCell>
									<TableCell className="text-right">
										{rental.acceptedCustomerTotal === null ||
										rental.currency === null ? (
											<span
												className="text-muted-foreground"
												title="El importe o la moneda no están completos en los datos guardados."
											>
												Datos incompletos
											</span>
										) : (
											<div className="space-y-0.5">
												<p className="font-semibold text-foreground tabular-nums">
													{formatExactMoney(
														rental.acceptedCustomerTotal,
														rental.currency,
													)}
												</p>
												<p className="text-xs text-muted-foreground">
													{rental.currency}
												</p>
											</div>
										)}
									</TableCell>
									<TableCell>
										<RentalOrdersReportInvoices
											invoices={rental.invoices}
											rentalNumber={rentalNumber}
										/>
									</TableCell>
									<TableCell className="text-foreground">
										<span
											className="block max-w-48 truncate"
											title={rental.branch.name ?? undefined}
										>
											{rental.branch.name ?? "Nombre no disponible"}
										</span>
									</TableCell>
								</TableRow>
							);
						})
					)}
				</TableBody>
			</Table>
		</div>
	);
}
