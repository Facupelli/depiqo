import { Clock } from "lucide-react";
import { useTenantTimezone } from "@/shared/timezone/operational-timezone.hooks";
import { useRentalDetailContext } from "../rental-detail.context";
import { formatRentalDetailDateTime } from "../rental-detail.utils";

export function RentalActivityLog() {
	const { rental } = useRentalDetailContext();
	const timezone = useTenantTimezone();

	return (
		<section>
			<div className="mb-5 flex items-center gap-2">
				<Clock className="size-4 text-neutral-400" />
				<span className="text-sm font-semibold text-neutral-950">
					Activity Log
				</span>
			</div>
			<ActivityEntry
				label="Pedido creado"
				timestamp={formatRentalDetailDateTime(rental.createdAt, timezone)}
			/>
			{rental.confirmedAt ? (
				<ActivityEntry
					label="Pedido confirmado"
					timestamp={formatRentalDetailDateTime(rental.confirmedAt, timezone)}
				/>
			) : null}
			{rental.cancelledAt ? (
				<ActivityEntry
					label="Pedido cancelado"
					timestamp={formatRentalDetailDateTime(rental.cancelledAt, timezone)}
				/>
			) : null}
		</section>
	);
}

function ActivityEntry({
	label,
	timestamp,
}: {
	label: string;
	timestamp: string;
}) {
	return (
		<div className="flex items-start gap-4">
			<div className="shrink-0 pt-1">
				<div className="flex size-8 items-center justify-center rounded-full bg-neutral-950">
					<Clock className="size-3.5 text-white" />
				</div>
			</div>
			<div className="flex flex-col gap-0.5 pb-6">
				<span className="text-sm font-semibold text-neutral-950">{label}</span>
				<span className="text-xs text-neutral-400">{timestamp} · System</span>
			</div>
		</div>
	);
}
