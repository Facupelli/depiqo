import { RENTAL_STATUS_CONFIG } from "@/modules/rentals/shared/rental-status.config";
import { useTenantTimezone } from "@/shared/timezone/operational-timezone.hooks";
import { formatOrderNumber } from "@/shared/utils/formatters";
import { useRentalDetailContext } from "../rental-detail.context";
import { formatRentalDetailDateTime } from "../rental-detail.utils";
import { RentalDetailActionsMenu } from "./rental-detail-actions-menu";

export function RentalDetailHeader() {
	const { rental } = useRentalDetailContext();
	const timezone = useTenantTimezone();

	return (
		<header className="border-b border-neutral-200 pb-5 @5xl/rental-detail:pb-6">
			<div className="flex flex-col gap-4 @5xl/rental-detail:gap-6">
				<div className="flex min-w-0 flex-col gap-4 @sm/rental-detail:flex-row @sm/rental-detail:items-start @sm/rental-detail:justify-between">
					<div className="min-w-0">
						<div className="mb-1.5 flex min-w-0 flex-wrap items-center gap-3">
							<h1 className="min-w-0 break-all text-3xl font-bold leading-none tracking-tight">
								#{formatOrderNumber(rental.rentalNumber)}
							</h1>
							<RentalStatusBadge />
						</div>
						<p className="mt-2 text-sm text-neutral-400">
							Creado el {formatRentalDetailDateTime(rental.createdAt, timezone)}
						</p>
					</div>
					<div className="flex shrink-0 justify-start @sm/rental-detail:justify-end">
						<RentalDetailActionsMenu />
					</div>
				</div>
			</div>
		</header>
	);
}

function RentalStatusBadge() {
	const { rental } = useRentalDetailContext();
	const config = RENTAL_STATUS_CONFIG[rental.status];
	return (
		<span
			className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${config?.className ?? "bg-neutral-100 text-neutral-700"}`}
		>
			{config?.label ?? rental.status}
		</span>
	);
}
