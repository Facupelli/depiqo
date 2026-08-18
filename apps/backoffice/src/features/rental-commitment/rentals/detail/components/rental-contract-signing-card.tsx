import { CheckCircle2, ChevronDown, FileSignature } from "lucide-react";
import { useState } from "react";
import { useRentalContractSigningSummary } from "@/features/contracts/contracts.queries";
import { useRentalDetailContext } from "@/modules/rentals/rental-detail/rental-detail.context";
import { useTenantTimezone } from "@/shared/timezone/operational-timezone.hooks";
import {
	formatRentalContractSigningDate,
	getRentalContractSigningState,
	getRentalContractSigningToneClasses,
} from "../rental-contract-signing-summary.utils";

export function RentalContractSigningCard() {
	const { rental } = useRentalDetailContext();
	const timezone = useTenantTimezone();
	const { data: summary, isLoading } = useRentalContractSigningSummary(
		rental.id,
	);
	const [isExpanded, setIsExpanded] = useState(false);

	if (isLoading)
		return (
			<div className="bg-white border border-neutral-200 rounded-lg p-5">
				<div className="min-w-0 flex-1">
					<SidebarHeader
						icon={<FileSignature className="size-4" />}
						title="Firma del contrato"
					/>
					<p className="pl-2">cargando...</p>
				</div>
			</div>
		);

	if (!summary)
		return (
			<div className="bg-white border border-neutral-200 rounded-lg p-5">
				no hay firma
			</div>
		);

	const state = getRentalContractSigningState(summary);
	const toneClasses = getRentalContractSigningToneClasses(state.tone);
	const request = summary.latestSigningRequest;
	const isSigned = summary.contractStatus === "SIGNED" || !!summary.acceptance;

	return (
		<section className="bg-white border border-neutral-200 rounded-lg p-5">
			<button
				type="button"
				onClick={() => setIsExpanded((previous) => !previous)}
				className="flex w-full items-start justify-between gap-4 text-left"
			>
				<div className="min-w-0 flex-1">
					<SidebarHeader
						icon={<FileSignature className="size-4" />}
						title="Firma del contrato"
					/>
					<div className="flex items-center gap-3">
						<div
							className={`flex size-10 shrink-0 items-center justify-center rounded-full ${toneClasses.iconWrapClassName}`}
						>
							{state.tone === "success" ? (
								<CheckCircle2
									className={`size-4 ${toneClasses.iconClassName}`}
								/>
							) : (
								<FileSignature
									className={`size-4 ${toneClasses.iconClassName}`}
								/>
							)}
						</div>
						<div className="min-w-0">
							<p className="text-sm font-semibold text-neutral-950">
								{state.label}
							</p>
							<p className="mt-0.5 text-xs text-neutral-500">
								{state.description}
							</p>
						</div>
					</div>
				</div>
				<ChevronDown
					className={`size-4 shrink-0 transition-transform text-neutral-400 ${isExpanded ? "rotate-180" : ""}`}
				/>
			</button>

			{state.activityAt ? (
				<div className="mt-4 rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
					<p className="font-mono text-[9px] tracking-widest uppercase text-neutral-400 mb-1">
						Actividad
					</p>
					<p className="text-sm font-semibold text-neutral-950">
						{formatRentalContractSigningDate(state.activityAt, timezone)}
					</p>
				</div>
			) : null}

			{isExpanded ? (
				<div className="mt-4 space-y-3 border-t border-neutral-100 pt-4">
					{request ? (
						<>
							<SigningDetailRow label="Firmante" value={request.signerName} />
							<SigningDetailRow label="Email" value={request.signerEmail} />
							<SigningDetailRow label="Teléfono" value={request.signerPhone} />
							<SigningDetailRow
								label="Enviado"
								value={formatRentalContractSigningDate(
									request.sentAt,
									timezone,
								)}
							/>
							<SigningDetailRow
								label="Visto"
								value={formatRentalContractSigningDate(
									request.viewedAt,
									timezone,
								)}
							/>
							<SigningDetailRow
								label="Firmado"
								value={formatRentalContractSigningDate(
									request.signedAt,
									timezone,
								)}
							/>
							{!isSigned ? (
								<SigningDetailRow
									label="Vence"
									value={formatRentalContractSigningDate(
										request.expiresAt,
										timezone,
									)}
								/>
							) : null}
							{request.cancelledAt ? (
								<SigningDetailRow
									label="Cancelado"
									value={formatRentalContractSigningDate(
										request.cancelledAt,
										timezone,
									)}
								/>
							) : null}
							{request.failedAt ? (
								<SigningDetailRow
									label="Fallido"
									value={formatRentalContractSigningDate(
										request.failedAt,
										timezone,
									)}
								/>
							) : null}
						</>
					) : (
						<div className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
							<p className="text-sm font-semibold text-neutral-950">
								Sin solicitud registrada
							</p>
							<p className="mt-0.5 text-xs text-neutral-500">
								El administrador todavía no envió la invitación.
							</p>
						</div>
					)}
				</div>
			) : null}
		</section>
	);
}

function SidebarHeader({
	icon,
	title,
}: {
	icon: React.ReactNode;
	title: string;
}) {
	return (
		<div className="flex items-center gap-2 border-b border-neutral-100 mb-3 pb-1">
			<span className="flex size-8 items-center justify-center text-neutral-600">
				{icon}
			</span>
			<h2 className="text-sm font-bold text-neutral-950">{title}</h2>
		</div>
	);
}

function SigningDetailRow({
	label,
	value,
}: {
	label: string;
	value: string | null;
}) {
	return (
		<div className="flex items-center justify-between gap-3">
			<p className="font-mono text-[10px] tracking-[0.12em] uppercase text-neutral-400">
				{label}
			</p>
			<p className="text-right text-sm font-medium text-neutral-950">
				{value ?? "Sin registro"}
			</p>
		</div>
	);
}
