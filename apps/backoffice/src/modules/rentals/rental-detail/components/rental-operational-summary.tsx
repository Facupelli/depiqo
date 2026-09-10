import { Button } from "@repo/ui/components/button";
import { UserPlus } from "lucide-react";
import type { ReactNode } from "react";
import { useBranchTimezone } from "@/shared/timezone/operational-timezone.hooks";
import { formatMoney } from "@/shared/utils/formatters";
import { AssignCustomerToDraftRentalDialog } from "../assign-customer/assign-customer-to-draft-rental-dialog";
import { getRentalContractSigningState } from "../documents/signing/rental-contract-signing-summary.utils";
import { useRentalDetailContext } from "../rental-detail.context";
import {
	formatRentalDetailDateBlock,
	getRentalDisplayTotal,
} from "../rental-detail.utils";

export function RentalOperationalSummary() {
	const {
		rental,
		customerSummary,
		isCustomerSummaryLoading,
		isCustomerSummaryError,
		contractSigningSummary,
		isContractSigningSummaryLoading,
		isContractSigningSummaryError,
	} = useRentalDetailContext();
	const timezone = useBranchTimezone(rental.branchId);
	const pickup = formatRentalDetailDateBlock(rental.period.start, timezone);
	const returnDate = formatRentalDetailDateBlock(rental.period.end, timezone);
	const pricing = rental.pricing;
	const total = pricing ? getRentalDisplayTotal(rental, pricing) : null;

	let contractLabel = "Sin contrato generado";
	if (isContractSigningSummaryLoading) {
		contractLabel = "Cargando contrato...";
	} else if (isContractSigningSummaryError) {
		contractLabel = "No pudimos cargar el contrato";
	} else if (contractSigningSummary) {
		contractLabel = getRentalContractSigningState(contractSigningSummary).label;
	}

	return (
		<section className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50/60 px-4 py-4 @5xl/rental-detail:hidden">
			<div className="grid grid-cols-1 gap-x-6 gap-y-4 @sm/rental-detail:grid-cols-2">
				<SummaryItem label="Cliente" className="@sm/rental-detail:col-span-2">
					{customerSummary ? (
						customerSummary.displayName
					) : isCustomerSummaryLoading && rental.customerId !== null ? (
						<span className="text-neutral-500">Cargando cliente...</span>
					) : isCustomerSummaryError && rental.customerId !== null ? (
						<span className="text-neutral-500">
							No pudimos cargar el cliente
						</span>
					) : rental.customerId !== null ? (
						<span className="text-neutral-500">Cliente no disponible</span>
					) : (
						<AssignCustomerToDraftRentalDialog
							trigger={
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="h-7"
								>
									<UserPlus className="size-3.5" />
									Asignar cliente
								</Button>
							}
							renderTrigger={(trigger) => (
								<div className="flex flex-wrap items-center gap-2">
									<span className="text-neutral-500">Sin cliente asignado</span>
									{trigger}
								</div>
							)}
							unavailableFallback={
								<span className="text-neutral-500">Sin cliente asignado</span>
							}
						/>
					)}
				</SummaryItem>

				<SummaryItem label="Retiro">
					{pickup.date} · {pickup.time}
				</SummaryItem>
				<SummaryItem label="Devolución">
					{returnDate.date} · {returnDate.time}
				</SummaryItem>
				<SummaryItem label="Contrato">
					<span
						className={
							isContractSigningSummaryLoading ||
							isContractSigningSummaryError ||
							!contractSigningSummary
								? "text-neutral-500"
								: undefined
						}
					>
						{contractLabel}
					</span>
				</SummaryItem>
				<SummaryItem label="Total">
					{pricing !== null && total !== null ? (
						<span className="font-mono">
							{formatMoney(total, pricing.currency)}
						</span>
					) : (
						<span className="text-neutral-500">Sin precio calculado</span>
					)}
				</SummaryItem>
			</div>
		</section>
	);
}

function SummaryItem({
	label,
	className,
	children,
}: {
	label: string;
	className?: string;
	children: ReactNode;
}) {
	return (
		<div className={`min-w-0 ${className ?? ""}`}>
			<p className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
				{label}
			</p>
			<div className="mt-1 min-w-0 break-words text-sm font-semibold text-neutral-950">
				{children}
			</div>
		</div>
	);
}
