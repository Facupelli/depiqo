import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { Button } from "@repo/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CalendarDays, Package, ReceiptText } from "lucide-react";
import type { ReactNode } from "react";
import { ProblemDetailsError } from "@/shared/errors";
import { useBranchTimezone } from "@/shared/timezone/operational-timezone.hooks";
import { formatMoney } from "@/shared/utils/formatters";
import { rentalConfirmationSummaryOptions } from "../confirm-rental/get-rental-confirmation-summary.queries";
import { buildRentalConfirmationSummary } from "../rental-confirmation-summary";
import { useRentalDetailContext } from "../rental-detail.context";
import { formatRentalDetailDateBlock } from "../rental-detail.utils";

export type RentalConfirmationDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	canConfirm: boolean;
	isPending: boolean;
	errorMessage: string | null;
	onConfirm: (expectedVersion: number) => void;
};

export function RentalConfirmationDialog({
	open,
	onOpenChange,
	canConfirm,
	isPending,
	errorMessage,
	onConfirm,
}: RentalConfirmationDialogProps) {
	const { rental } = useRentalDetailContext();
	const timezone = useBranchTimezone(rental.branchId);
	const costQuery = useQuery({
		...rentalConfirmationSummaryOptions(rental.id, rental.version),
		enabled: open && rental.status === "DRAFT",
	});
	const summary = buildRentalConfirmationSummary(
		rental,
		timezone,
		costQuery.data,
	);
	const versionConflict =
		costQuery.data && costQuery.data.rentalVersion !== rental.version;
	const summaryReady =
		Boolean(summary) &&
		costQuery.isSuccess &&
		!costQuery.isFetching &&
		!versionConflict &&
		!costQuery.data?.deliveryReviewRequired;
	const costError =
		costQuery.error instanceof ProblemDetailsError &&
		costQuery.error.problemDetails.code ===
			"rental_commitment.delivery_review_required"
			? "Revisá el acuerdo y la autorización de envío desde Editar borrador."
			: "No pudimos obtener el total a confirmar. Revisá el pedido e intentá nuevamente.";

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto">
				<AlertDialogHeader>
					<AlertDialogTitle>Confirmar alquiler</AlertDialogTitle>
					<AlertDialogDescription>
						Revisá el período, los equipos y el total antes de bloquear su
						disponibilidad para otros pedidos. La disponibilidad de los equipos
						se verifica al confirmar.
					</AlertDialogDescription>
				</AlertDialogHeader>
				{summary ? (
					<RentalConfirmationReview
						summary={summary}
						totalVerified={summaryReady}
					/>
				) : null}
				{costQuery.isFetching ? (
					<output className="block text-sm text-muted-foreground">
						{summary
							? "Actualizando total del cliente. Esperá antes de confirmar..."
							: "Calculando total del cliente..."}
					</output>
				) : null}
				{costQuery.isError ? (
					<div className="space-y-2">
						<p className="text-sm text-destructive" role="alert">
							{costError}
						</p>
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={costQuery.isFetching}
							onClick={() => {
								void costQuery.refetch();
							}}
						>
							Reintentar cálculo
						</Button>
					</div>
				) : null}
				{versionConflict ? (
					<p className="text-sm text-destructive">
						El borrador cambió. Volvé a cargar el pedido antes de confirmarlo.
					</p>
				) : null}
				{errorMessage ? (
					<div className="flex min-w-0 items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
						<AlertCircle className="mt-0.5 size-4 shrink-0" />
						<p className="min-w-0 [overflow-wrap:anywhere]">{errorMessage}</p>
					</div>
				) : null}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Volver</AlertDialogCancel>
					<AlertDialogAction
						disabled={!canConfirm || !summaryReady || isPending}
						onClick={(event) => {
							event.preventDefault();
							if (summaryReady && costQuery.data) {
								onConfirm(costQuery.data.rentalVersion);
							}
						}}
					>
						{isPending ? "Confirmando..." : "Confirmar alquiler"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

function RentalConfirmationReview({
	summary,
	totalVerified,
}: {
	summary: NonNullable<ReturnType<typeof buildRentalConfirmationSummary>>;
	totalVerified: boolean;
}) {
	const start = formatRentalDetailDateBlock(
		summary.period.start,
		summary.period.timezone,
	);
	const end = formatRentalDetailDateBlock(
		summary.period.end,
		summary.period.timezone,
	);

	return (
		<div className="space-y-4">
			<section className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
				<ReviewSectionTitle icon={<CalendarDays className="size-4" />}>
					Período del alquiler
				</ReviewSectionTitle>
				<div className="mt-3 grid gap-3 sm:grid-cols-2">
					<PeriodDate label="Retiro" date={start.date} time={start.time} />
					<PeriodDate label="Devolución" date={end.date} time={end.time} />
				</div>
			</section>

			<section className="rounded-lg border border-neutral-200 p-4">
				<ReviewSectionTitle icon={<Package className="size-4" />}>
					Equipos a bloquear
				</ReviewSectionTitle>
				<div className="mt-3 max-h-56 space-y-3 overflow-y-auto pr-1">
					{summary.equipment.map((equipment) => (
						<div key={equipment.id} className="space-y-2">
							<EquipmentRow
								name={equipment.name}
								quantity={equipment.quantity}
							/>
							{equipment.children.length > 0 ? (
								<div className="space-y-1.5 border-neutral-100 border-l pl-3">
									{equipment.children.map((child) => (
										<EquipmentRow
											key={child.id}
											name={child.name}
											quantity={child.quantity}
											compact
										/>
									))}
								</div>
							) : null}
						</div>
					))}
					{summary.accessories.length > 0 ? (
						<div className="border-neutral-100 border-t pt-3">
							<p className="mb-2 text-xs font-medium text-neutral-500">
								Accesorios a bloquear
							</p>
							<div className="space-y-1.5">
								{summary.accessories.map((accessory) => (
									<EquipmentRow
										key={accessory.id}
										name={accessory.name}
										quantity={accessory.quantity}
										compact
									/>
								))}
							</div>
						</div>
					) : null}
				</div>
			</section>

			<div className="space-y-2 text-sm">
				<p className="flex justify-between gap-3">
					<span>Equipos</span>
					<span>
						{formatMoney(summary.equipmentAmount, summary.total.currency)}
					</span>
				</p>
				<p className="flex justify-between gap-3">
					<span>Seguro</span>
					<span>
						{formatMoney(summary.insuranceAmount, summary.total.currency)}
					</span>
				</p>
				{summary.deliveryCharge !== null ? (
					<p className="flex justify-between gap-3">
						<span>Entrega y recolección</span>
						<span>
							{formatMoney(summary.deliveryCharge, summary.total.currency)}
						</span>
					</p>
				) : null}
			</div>
			<div className="flex flex-col gap-2 rounded-lg border border-neutral-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex min-w-0 items-center gap-2 text-sm font-medium">
					<ReceiptText className="size-4 shrink-0" />
					<span className="[overflow-wrap:anywhere]">
						{totalVerified
							? "Total a confirmar"
							: "Total pendiente de verificar"}
					</span>
				</div>
				<span className="min-w-0 font-mono text-lg font-bold [overflow-wrap:anywhere]">
					{formatMoney(summary.total.amount, summary.total.currency)}
				</span>
			</div>
		</div>
	);
}

function ReviewSectionTitle({
	icon,
	children,
}: {
	icon: ReactNode;
	children: ReactNode;
}) {
	return (
		<div className="flex items-center gap-2 text-sm font-semibold text-neutral-950">
			<span className="text-neutral-500">{icon}</span>
			<h2>{children}</h2>
		</div>
	);
}

function PeriodDate({
	label,
	date,
	time,
}: {
	label: string;
	date: string;
	time: string;
}) {
	return (
		<div className="rounded-md border border-neutral-200 bg-white px-3 py-2">
			<p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
				{label}
			</p>
			<p className="mt-0.5 text-sm font-medium text-neutral-950">{date}</p>
			<p className="text-xs text-neutral-500">{time}</p>
		</div>
	);
}

function EquipmentRow({
	name,
	quantity,
	compact = false,
}: {
	name: string;
	quantity: number;
	compact?: boolean;
}) {
	return (
		<div className="flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-1">
			<p
				className={`min-w-0 flex-1 [overflow-wrap:anywhere] ${
					compact
						? "text-sm text-neutral-600"
						: "text-sm font-medium text-neutral-900"
				}`}
			>
				{name}
			</p>
			<span className="shrink-0 text-xs text-neutral-500">
				{quantity} {quantity === 1 ? "unidad" : "unidades"}
			</span>
		</div>
	);
}
