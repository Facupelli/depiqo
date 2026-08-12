import { useTenantTimezone } from "@/shared/timezone/operational-timezone.hooks";
import { formatOrderNumber } from "@/shared/utils/formatters";
import { RENTAL_STATUS_CONFIG } from "../../rental-status.config";
import { useRentalDetailContext } from "../rental-detail.context";
import { formatRentalDetailDateTime } from "../rental-detail.utils";
import { RentalDetailActionsMenu } from "./rental-detail-actions-menu";

export function RentalDetailHeader() {
	const { rental } = useRentalDetailContext();
	const timezone = useTenantTimezone();

	return (
		<header className="border-b border-neutral-200 pb-8">
			<div className="flex flex-col gap-6">
				<div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
					<div>
						<div className="flex flex-wrap items-center gap-3 mb-1.5">
							<h1 className="text-3xl font-bold tracking-tight leading-none">
								#{formatOrderNumber(rental.number)}
							</h1>
							<RentalStatusBadge />
						</div>
						<p className="text-sm text-neutral-400 mt-2">
							Creado el {formatRentalDetailDateTime(rental.createdAt, timezone)}
						</p>
					</div>
					<div className="flex justify-start xl:justify-end">
						<RentalDetailActionsMenu />
					</div>
				</div>
				{/* <section className="rounded-2xl border px-5 py-5 sm:px-6 bg-white border-neutral-200">
					<div className="flex items-start gap-4">
						<div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-100">
							<Package className="size-6 text-neutral-600" />
						</div>
						<div className="space-y-2 min-w-0">
							<h2 className="text-xl font-semibold tracking-tight text-neutral-950">
								Pedido{" "}
								{RENTAL_ORDER_STATUS_CONFIG[
									rental.status
								]?.label.toLowerCase() ?? rental.status.toLowerCase()}
							</h2>
							<p className="text-sm text-neutral-500">
								Las acciones operativas de v2 estarán disponibles próximamente.
							</p>
						</div>
					</div>
				</section> */}
			</div>
		</header>
	);
}

function RentalStatusBadge() {
	const { rental } = useRentalDetailContext();
	const config = RENTAL_STATUS_CONFIG[rental.status];
	return (
		<span
			className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold tracking-widest uppercase ${config?.className ?? "bg-neutral-100 text-neutral-700"}`}
		>
			{config?.label ?? rental.status}
		</span>
	);
}
