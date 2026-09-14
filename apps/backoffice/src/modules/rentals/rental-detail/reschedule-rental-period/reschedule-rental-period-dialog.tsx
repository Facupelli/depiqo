import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { rentalKeys } from "@/modules/rentals/rental.queries";
import { RentalPeriodPicker } from "@/modules/rentals/shared/rental-period/rental-period-picker";
import { contractKeys } from "../documents/signing/rental-contract-signing.queries";
import { formatRentalDetailDateBlock } from "../rental-detail.utils";
import {
	type RescheduleRentalPeriodUiError,
	toRescheduleRentalPeriodUiError,
} from "./reschedule-rental-period.errors";
import { useRescheduleRentalPeriod } from "./reschedule-rental-period.mutation";
import {
	createRescheduleRentalPeriodFormSchema,
	hydrateConfirmedRentalPeriod,
	toRescheduleConfirmedRentalPeriodBody,
} from "./reschedule-rental-period.schema";

export interface RescheduleRentalPeriodDialogProps {
	rentalId: string;
	rentalVersion: number;
	currentPeriodStart: string;
	currentPeriodEnd: string;
	operationalTimezone: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function RescheduleRentalPeriodDialog(
	props: RescheduleRentalPeriodDialogProps,
) {
	if (!props.open) return null;

	return <OpenRescheduleRentalPeriodDialog {...props} />;
}

function OpenRescheduleRentalPeriodDialog({
	rentalId,
	rentalVersion,
	currentPeriodStart,
	currentPeriodEnd,
	operationalTimezone,
	onOpenChange,
}: RescheduleRentalPeriodDialogProps) {
	const queryClient = useQueryClient();
	const periodId = useId();
	const [currentOperationTime] = useState(() => new Date());
	const [serverError, setServerError] =
		useState<RescheduleRentalPeriodUiError | null>(null);
	const reschedulePeriod = useRescheduleRentalPeriod();
	const currentStart = formatRentalDetailDateBlock(
		currentPeriodStart,
		operationalTimezone,
	);
	const currentEnd = formatRentalDetailDateBlock(
		currentPeriodEnd,
		operationalTimezone,
	);
	const form = useForm({
		defaultValues: hydrateConfirmedRentalPeriod(
			currentPeriodStart,
			currentPeriodEnd,
			operationalTimezone,
		),
		validators: {
			onSubmit: createRescheduleRentalPeriodFormSchema({
				operationalTimezone,
				currentOperationTime,
			}),
		},
		onSubmit: async ({ value }) => {
			setServerError(null);

			try {
				await reschedulePeriod.mutateAsync({
					rentalId,
					body: toRescheduleConfirmedRentalPeriodBody(
						value,
						operationalTimezone,
						rentalVersion,
					),
				});
				toast.success("Período actualizado");
				onOpenChange(false);
			} catch (error) {
				const uiError = toRescheduleRentalPeriodUiError(error);
				setServerError(uiError);

				if (uiError.kind === "stale") {
					await Promise.all([
						queryClient.invalidateQueries({ queryKey: rentalKeys.all() }),
						queryClient.invalidateQueries({
							queryKey: contractKeys.rentalSigningSummary(rentalId),
						}),
					]);
				}
			}
		},
	});
	const isStale = serverError?.kind === "stale";

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen && reschedulePeriod.isPending) return;
		onOpenChange(nextOpen);
	}

	function clearCorrectableServerError() {
		if (serverError?.kind !== "stale") setServerError(null);
	}

	return (
		<Dialog
			open
			onOpenChange={handleOpenChange}
			disablePointerDismissal={reschedulePeriod.isPending}
		>
			<DialogContent
				className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
				showCloseButton={!reschedulePeriod.isPending}
			>
				<DialogHeader>
					<DialogTitle>Reprogramar alquiler</DialogTitle>
					<DialogDescription>
						Modificá las fechas y horarios confirmados del alquiler.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-5">
					<section className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
						<p className="font-medium text-neutral-500 text-xs uppercase tracking-wide">
							Período actual
						</p>
						<div className="mt-2 grid grid-cols-2 gap-3">
							<PeriodBoundary
								label="Inicio"
								date={currentStart.date}
								time={currentStart.time}
							/>
							<PeriodBoundary
								label="Devolución"
								date={currentEnd.date}
								time={currentEnd.time}
							/>
						</div>
					</section>

					<p className="text-muted-foreground text-sm">
						El precio acordado y los equipos asignados no cambiarán. Solo se
						actualizará el período del alquiler.
					</p>

					<form
						onSubmit={(event) => {
							event.preventDefault();
							event.stopPropagation();
							form.handleSubmit();
						}}
					>
						<form.Field name="startDate">
							{(startDateField) => (
								<form.Field name="startTime">
									{(startTimeField) => (
										<form.Field name="endDate">
											{(endDateField) => (
												<form.Field name="endTime">
													{(endTimeField) => {
														const fields = [
															startDateField,
															startTimeField,
															endDateField,
															endTimeField,
														];
														const invalid = fields.map(
															(field) => !field.state.meta.isValid,
														);

														return (
															<Field data-invalid={invalid.some(Boolean)}>
																<FieldLabel htmlFor={periodId}>
																	Nuevo período
																</FieldLabel>
																<RentalPeriodPicker
																	id={periodId}
																	value={{
																		startDate: startDateField.state.value,
																		startTime: startTimeField.state.value,
																		endDate: endDateField.state.value,
																		endTime: endTimeField.state.value,
																	}}
																	invalid={{
																		startDate: invalid[0],
																		startTime: invalid[1],
																		endDate: invalid[2],
																		endTime: invalid[3],
																	}}
																	onStartDateChange={(value) => {
																		clearCorrectableServerError();
																		startDateField.handleChange(value);
																	}}
																	onStartDateBlur={startDateField.handleBlur}
																	onStartTimeChange={(value) => {
																		clearCorrectableServerError();
																		startTimeField.handleChange(value);
																	}}
																	onStartTimeBlur={startTimeField.handleBlur}
																	onEndDateChange={(value) => {
																		clearCorrectableServerError();
																		endDateField.handleChange(value);
																	}}
																	onEndDateBlur={endDateField.handleBlur}
																	onEndTimeChange={(value) => {
																		clearCorrectableServerError();
																		endTimeField.handleChange(value);
																	}}
																	onEndTimeBlur={endTimeField.handleBlur}
																/>
																<FieldError
																	errors={fields.flatMap(
																		(field) => field.state.meta.errors,
																	)}
																/>
															</Field>
														);
													}}
												</form.Field>
											)}
										</form.Field>
									)}
								</form.Field>
							)}
						</form.Field>

						{serverError ? (
							<div
								className="flex gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-destructive text-sm"
								role="alert"
							>
								<AlertCircle className="mt-0.5 size-4 shrink-0" />
								<div className="min-w-0 space-y-1 [overflow-wrap:anywhere]">
									<p>{serverError.message}</p>
									{isStale ? (
										<p className="font-medium">
											Cerrá este diálogo y revisá el estado actualizado antes de
											volver a intentarlo.
										</p>
									) : null}
								</div>
							</div>
						) : null}

						<DialogFooter className="mt-5 flex-col-reverse gap-2 sm:flex-row">
							<Button
								type="button"
								variant="outline"
								disabled={reschedulePeriod.isPending}
								onClick={() => handleOpenChange(false)}
							>
								Cancelar
							</Button>
							<form.Subscribe
								selector={(state) => [state.canSubmit, state.isSubmitting]}
							>
								{([canSubmit, isSubmitting]) => (
									<Button
										type="submit"
										disabled={
											!canSubmit ||
											isSubmitting ||
											reschedulePeriod.isPending ||
											isStale
										}
									>
										{isSubmitting || reschedulePeriod.isPending ? (
											<Loader2 className="size-4 animate-spin" />
										) : null}
										Guardar período
									</Button>
								)}
							</form.Subscribe>
						</DialogFooter>
					</form>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function PeriodBoundary({
	label,
	date,
	time,
}: {
	label: string;
	date: string;
	time: string;
}) {
	return (
		<div className="min-w-0">
			<p className="text-muted-foreground text-xs">{label}</p>
			<p className="truncate font-medium text-sm">{date}</p>
			<p className="text-muted-foreground text-xs tabular-nums">{time}</p>
		</div>
	);
}
