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
import { AlertCircle, CalendarDays, Layers, Truck, X } from "lucide-react";
import type { ReactNode } from "react";
import { formatTimestampInTimezone } from "@/lib/dates/format";
import { ProblemDetailsError } from "@/shared/errors";
import { useBranchTimezone } from "@/shared/timezone/operational-timezone.hooks";
import { sumDecimalStrings } from "@/shared/utils/decimal-string";
import { formatMoney } from "@/shared/utils/formatters";
import { rentalConfirmationSummaryOptions } from "../confirm-rental/get-rental-confirmation-summary.queries";
import { buildRentalConfirmationSummary } from "../rental-confirmation-summary";
import { useRentalDetailContext } from "../rental-detail.context";

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
			<AlertDialogContent className="max-h-[calc(100dvh-2rem)] gap-7 overflow-y-auto p-6 data-[size=default]:max-w-[calc(100%-2rem)] sm:p-8 data-[size=default]:sm:max-w-2xl">
				<AlertDialogHeader className="relative place-items-start gap-3 pr-10 text-left">
					<AlertDialogTitle className="text-2xl font-semibold tracking-tight">
						Confirmar alquiler
					</AlertDialogTitle>
					<AlertDialogDescription>
						Al confirmar, los equipos quedarán reservados para este alquiler.
					</AlertDialogDescription>
					<AlertDialogCancel
						aria-label="Cerrar"
						variant="outline"
						size="icon-sm"
						className="absolute top-0 right-0"
						disabled={isPending}
					>
						<X className="size-4" />
					</AlertDialogCancel>
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
				<AlertDialogFooter className="mt-3">
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
	const start = formatTimestampInTimezone(
		summary.period.start,
		summary.period.timezone,
		"D MMM, HH:mm",
	);
	const end = formatTimestampInTimezone(
		summary.period.end,
		summary.period.timezone,
		"D MMM, HH:mm",
	);

	return (
		<div className="space-y-7">
			<dl className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-neutral-50/70 px-4 sm:px-5">
				<ReviewRow
					icon={<CalendarDays className="size-5" />}
					label="Período del alquiler"
				>
					{start} - {end}
				</ReviewRow>
				<ReviewRow
					icon={<Layers className="size-5" />}
					label="Equipos a reservar"
				>
					{summary.reservedEquipmentCount}{" "}
					{summary.reservedEquipmentCount === 1 ? "unidad" : "unidades"}
				</ReviewRow>
				{summary.delivery ? (
					<ReviewRow
						icon={<Truck className="size-5" />}
						label={summary.delivery.label}
					>
						{summary.delivery.address}
					</ReviewRow>
				) : null}
			</dl>

			<div className="space-y-3 text-sm">
				<p className="flex justify-between gap-4">
					<span className="text-muted-foreground">Equipos y seguro</span>
					<span className="text-right tabular-nums">
						{formatMoney(
							sumDecimalStrings([
								summary.equipmentAmount,
								summary.insuranceAmount,
							]),
							summary.total.currency,
						)}
					</span>
				</p>
				{summary.deliveryCharge !== null ? (
					<p className="flex justify-between gap-3">
						<span className="text-muted-foreground">Entrega y retiro</span>
						<span className="text-right tabular-nums">
							{formatMoney(summary.deliveryCharge, summary.total.currency)}
						</span>
					</p>
				) : null}
			</div>
			<div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-neutral-200 pt-5">
				<div className="min-w-0 text-lg font-semibold">
					<span className="[overflow-wrap:anywhere]">
						{totalVerified
							? "Total a confirmar"
							: "Total pendiente de verificar"}
					</span>
				</div>
				<span className="min-w-0 text-right text-2xl font-bold tracking-tight tabular-nums [overflow-wrap:anywhere]">
					{formatMoney(summary.total.amount, summary.total.currency)}
				</span>
			</div>
		</div>
	);
}

function ReviewRow({
	icon,
	label,
	children,
}: {
	icon: ReactNode;
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="grid grid-cols-[1.25rem_1fr] items-start gap-x-3 gap-y-2 py-4 text-sm sm:grid-cols-[1.25rem_1fr_1.5fr] sm:items-center sm:gap-x-4 sm:py-5">
			<span aria-hidden="true" className="text-muted-foreground">
				{icon}
			</span>
			<dt>{label}</dt>
			<dd className="col-start-2 min-w-0 font-semibold [overflow-wrap:anywhere] sm:col-start-3">
				{children}
			</dd>
		</div>
	);
}
