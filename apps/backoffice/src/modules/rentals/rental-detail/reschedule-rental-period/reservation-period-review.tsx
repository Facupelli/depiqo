import type { PreviewConfirmedRentalPeriodResponseDto } from "@repo/api-contracts";
import { formatMoney } from "@/shared/utils/formatters";
import { formatRentalDetailDateBlock } from "../rental-detail.utils";

export function ReservationPeriodReview({
	preview,
	assetLabels,
	timezone,
}: {
	preview: PreviewConfirmedRentalPeriodResponseDto;
	assetLabels: Record<string, string>;
	timezone: string;
}) {
	const distinctPeriods = new Set(
		preview.assetReservations.map(
			({ period }) => `${period.start}/${period.end}`,
		),
	).size;
	const formatBoundary = (value: string) => {
		const { date, time } = formatRentalDetailDateBlock(value, timezone);
		return `${date} · ${time}`;
	};
	const formatPeriod = (period: { start: string; end: string }) =>
		`${formatBoundary(period.start)} → ${formatBoundary(period.end)}`;

	return (
		<section
			className="mt-5 space-y-3 border-t border-neutral-200 pt-4 text-sm"
			aria-label="Reservas propuestas de equipos"
			aria-live="polite"
		>
			<h3 className="font-medium">Reservas propuestas de equipos</h3>
			{!preview.delivery && preview.proposedAcceptedCustomerTotal !== null ? (
				<p className="flex flex-wrap justify-between gap-2">
					<span className="text-muted-foreground">
						Total del alquiler, sin cambios
					</span>
					<span className="font-medium tabular-nums">
						{formatMoney(
							preview.proposedAcceptedCustomerTotal,
							preview.currency,
						)}
					</span>
				</p>
			) : null}
			{preview.reservationPeriod ? (
				<div className="space-y-1">
					<p className="text-muted-foreground text-xs">
						Desde la primera reserva hasta la última
					</p>
					<p className="font-medium tabular-nums">
						{formatPeriod(preview.reservationPeriod)}
					</p>
					<p className="text-muted-foreground text-xs">
						Cada equipo puede tener un período de reserva diferente.
					</p>
				</div>
			) : (
				<p className="text-muted-foreground">
					No pudimos obtener las reservas. Revisá los avisos y volvé a intentar.
				</p>
			)}
			{distinctPeriods > 1 ? (
				<p className="text-muted-foreground">
					Los equipos tienen distintos períodos de reserva. Revisá el detalle
					antes de guardar.
				</p>
			) : null}
			{preview.assetReservations.length > 0 ? (
				<details className="rounded-md border p-3">
					<summary className="cursor-pointer font-medium focus-visible:outline-ring">
						Ver reservas individuales ({preview.assetReservations.length})
					</summary>
					<ul className="mt-3 max-h-60 space-y-3 overflow-y-auto">
						{preview.assetReservations.map((reservation) => (
							<li key={reservation.assetBlockId} className="space-y-1">
								<p className="break-words font-medium [overflow-wrap:anywhere]">
									{assetLabels[reservation.assetId] ?? reservation.assetId}
								</p>
								<p className="text-muted-foreground text-xs tabular-nums">
									{formatPeriod(reservation.period)}
								</p>
							</li>
						))}
					</ul>
				</details>
			) : null}
			<p className="text-muted-foreground text-xs">
				Esta vista previa es orientativa. La disponibilidad final se verifica al
				guardar.
			</p>
		</section>
	);
}
