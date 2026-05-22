import { ChevronDown, FileSignature } from "lucide-react";
import { useState } from "react";
import { useOrderDetailContext } from "@/features/orders/contexts/order-detail.context";
import { SidebarCardHeader } from "@/features/orders/components/order-detail-sidebar-primitives";
import {
	formatOptionalSigningDate,
	formatSigningDate,
	getSigningStatusMeta,
} from "@/features/orders/order-detail.utils";
import type { ParsedOrderDetailResponseDto } from "@/features/orders/queries/get-order-by-id";

export function OrderSigningCard() {
	const { order } = useOrderDetailContext();
	const [isExpanded, setIsExpanded] = useState(false);
	const isConfirmedLifecycle =
		order.status === "CONFIRMED" ||
		order.status === "ACTIVE" ||
		order.status === "COMPLETED";

	if (!isConfirmedLifecycle) {
		return null;
	}

	const statusMeta = getSigningStatusMeta(order.signing.status);
	const isSigned = order.signing.status === "SIGNED";
	const summaryTimestamp =
		order.signing.signedAt ??
		order.signing.expiresAt ??
		order.signing.createdAt;

	return (
		<section className="bg-white border border-neutral-200 rounded-lg p-5">
			<button
				type="button"
				onClick={() => setIsExpanded((previous) => !previous)}
				className="flex w-full items-start justify-between gap-4 text-left"
			>
				<div className="min-w-0 flex-1">
					<SidebarCardHeader
						icon={<FileSignature className="size-4" />}
						title="Firma del contrato"
					/>
					<div className="flex items-center gap-3">
						<div
							className={`flex size-10 shrink-0 items-center justify-center rounded-full ${statusMeta.iconWrapClassName}`}
						>
							<FileSignature className={`size-4 ${statusMeta.iconClassName}`} />
						</div>
						<div className="min-w-0">
							<p className="text-sm font-semibold text-neutral-950">
								{statusMeta.label}
							</p>
							<p className="mt-0.5 text-xs text-neutral-500">
								{statusMeta.description}
							</p>
						</div>
					</div>
				</div>

				<div className="flex shrink-0 items-center gap-2 pt-1 text-neutral-400">
					<ChevronDown
						className={`size-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
					/>
				</div>
			</button>

			<div className="mt-4 space-y-3">
				{!isSigned ? (
					<SigningSummaryDetails
						summaryTimestamp={summaryTimestamp}
						expiresAt={order.signing.expiresAt}
					/>
				) : null}
			</div>

			{isExpanded ? (
				<div className="mt-4 space-y-4 border-t border-neutral-100 pt-4">
					{isSigned ? (
						<SigningSummaryDetails
							summaryTimestamp={summaryTimestamp}
							expiresAt={order.signing.expiresAt}
						/>
					) : null}

					<SigningDetailRow
						label="Creada"
						value={formatOptionalSigningDate(order.signing.createdAt)}
					/>
					<SigningDetailRow
						label="Firmada"
						value={formatOptionalSigningDate(order.signing.signedAt)}
					/>
				</div>
			) : null}
		</section>
	);
}

function SigningDetailRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-3">
			<p className="font-mono text-[10px] tracking-[0.12em] uppercase text-neutral-400">
				{label}
			</p>
			<p className="text-sm font-medium text-neutral-950">{value}</p>
		</div>
	);
}

function SigningSummaryDetails({
	summaryTimestamp,
	expiresAt,
}: {
	summaryTimestamp:
		| ParsedOrderDetailResponseDto["signing"]["signedAt"]
		| ParsedOrderDetailResponseDto["signing"]["expiresAt"]
		| ParsedOrderDetailResponseDto["signing"]["createdAt"];
	expiresAt: ParsedOrderDetailResponseDto["signing"]["expiresAt"];
}) {
	return (
		<div className="space-y-3">
			<div className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
				<p className="font-mono text-[9px] tracking-widest uppercase text-neutral-400 mb-1">
					Actividad
				</p>
				<p className="text-sm font-semibold text-neutral-950">
					{summaryTimestamp
						? formatSigningDate(summaryTimestamp)
						: "Sin actividad registrada"}
				</p>
			</div>

			{expiresAt ? (
				<div className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
					<p className="font-mono text-[9px] tracking-widest uppercase text-neutral-400 mb-1">
						Vence
					</p>
					<p className="text-sm font-semibold text-neutral-950">
						{formatSigningDate(expiresAt)}
					</p>
				</div>
			) : null}
		</div>
	);
}
