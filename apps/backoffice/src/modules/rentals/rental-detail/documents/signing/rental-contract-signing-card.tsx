import { Button } from "@repo/ui/components/button";
import {
	CheckCircle2,
	ChevronDown,
	Download,
	FileSignature,
} from "lucide-react";
import { useId, useState } from "react";
import { useRentalDetailContext } from "@/modules/rentals/rental-detail/rental-detail.context";
import { useTenantTimezone } from "@/shared/timezone/operational-timezone.hooks";
import {
	formatRentalContractSigningDate,
	getRentalContractSigningState,
	getRentalContractSigningToneClasses,
} from "./rental-contract-signing-summary.utils";
import { useRentalSignedRemitoDownload } from "./use-rental-signed-remito-download";

export function RentalContractSigningCard() {
	const {
		rental,
		contractSigningSummary: summary,
		isContractSigningSummaryLoading: isLoading,
	} = useRentalDetailContext();
	const timezone = useTenantTimezone();
	const [isExpanded, setIsExpanded] = useState(false);
	const contentId = useId();
	const signedPdf = summary?.artifacts.signedPdf ?? null;
	const signedRemitoDownload = useRentalSignedRemitoDownload(
		rental.id,
		signedPdf?.fileName ?? "remito-firmado.pdf",
	);

	if (isLoading)
		return (
			<section className="rounded-lg border border-neutral-200 bg-white p-4 @5xl/rental-detail:p-5">
				<div className="@5xl/rental-detail:hidden">
					<p className="text-sm font-bold text-neutral-950">
						Firma del contrato
					</p>
					<p className="mt-0.5 text-sm text-neutral-500">
						Cargando contrato...
					</p>
				</div>
				<div className="hidden @5xl/rental-detail:block">
					<SidebarHeader
						icon={<FileSignature className="size-4" />}
						title="Firma del contrato"
					/>
					<p className="pl-2">cargando...</p>
				</div>
			</section>
		);

	if (!summary)
		return (
			<section className="rounded-lg border border-neutral-200 bg-white p-4 @5xl/rental-detail:p-5">
				<p className="text-sm font-bold text-neutral-950 @5xl/rental-detail:hidden">
					Firma del contrato
				</p>
				<p className="mt-0.5 text-sm text-neutral-500 @5xl/rental-detail:hidden">
					Sin contrato generado
				</p>
				<div className="hidden @5xl/rental-detail:block">no hay firma</div>
			</section>
		);

	const state = getRentalContractSigningState(summary);
	const toneClasses = getRentalContractSigningToneClasses(state.tone);
	const request = summary.latestSigningRequest;
	const isRequestSigned = request?.status === "SIGNED";

	return (
		<section className="rounded-lg border border-neutral-200 bg-white p-4 @5xl/rental-detail:p-5">
			<button
				type="button"
				onClick={() => setIsExpanded((previous) => !previous)}
				className="flex w-full min-w-0 items-start justify-between gap-4 text-left"
				aria-controls={contentId}
				aria-expanded={isExpanded}
			>
				<div className="min-w-0 flex-1">
					<div className="@5xl/rental-detail:hidden">
						<p className="text-sm font-bold text-neutral-950">
							Firma del contrato
						</p>
						<p className="mt-0.5 break-words text-sm text-neutral-600">
							{state.label}
						</p>
					</div>
					<div className="hidden @5xl/rental-detail:block">
						<SidebarHeader
							icon={<FileSignature className="size-4" />}
							title="Firma del contrato"
						/>
					</div>
					<div className="hidden items-center gap-3 @5xl/rental-detail:flex">
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

			<div
				id={contentId}
				className={isExpanded ? "block" : "hidden @5xl/rental-detail:block"}
			>
				{state.activityAt && state.activityLabel ? (
					<div className="mt-4 rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
						<p className="mb-1 font-mono text-[9px] uppercase tracking-wider text-neutral-400">
							{state.activityLabel}
						</p>
						<p className="text-sm font-semibold text-neutral-950">
							{formatRentalContractSigningDate(state.activityAt, timezone)}
						</p>
					</div>
				) : null}

				{signedPdf ? (
					<Button
						type="button"
						variant="outline"
						className="mt-4 w-full"
						onClick={signedRemitoDownload.download}
						disabled={signedRemitoDownload.isDownloading}
					>
						<Download className="size-4" />
						{signedRemitoDownload.isDownloading
							? "Descargando..."
							: "Descargar remito firmado"}
					</Button>
				) : null}

				{isExpanded ? (
					<div className="mt-4 space-y-3 border-t border-neutral-100 pt-4">
						{request ? (
							<>
								<SigningDetailRow label="Firmante" value={request.signerName} />
								<SigningDetailRow label="Email" value={request.signerEmail} />
								<SigningDetailRow
									label="Teléfono"
									value={request.signerPhone}
								/>
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
								{!isRequestSigned ? (
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
			</div>
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
			<p className="font-mono text-[10px] tracking-wider uppercase text-neutral-400">
				{label}
			</p>
			<p className="text-right text-sm font-medium text-neutral-950">
				{value ?? "Sin registro"}
			</p>
		</div>
	);
}
