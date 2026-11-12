import type { RescheduleConfirmedRentalPeriodBodyDto } from "@repo/api-contracts";
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
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { rentalKeys } from "@/modules/rentals/rental.queries";
import { RentalPeriodPicker } from "@/modules/rentals/shared/rental-period/rental-period-picker";
import { contractKeys } from "../documents/signing/rental-contract-signing.queries";
import { formatRentalDetailDateBlock } from "../rental-detail.utils";
import {
	DeliveryPeriodReview,
	deliveryReviewBlockers,
	needsMinuteAcceptance,
	needsPolicyAuthorization,
} from "./delivery-period-review";
import { usePreviewRentalPeriod } from "./preview-rental-period.mutation";
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
	fulfillmentMethod: "PICKUP" | "DELIVERY";
	canAuthorizeDeliveryException: boolean;
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

function OpenRescheduleRentalPeriodDialog(
	props: RescheduleRentalPeriodDialogProps,
) {
	// Keep the opening version, dates, and timezone together until the dialog closes.
	const [opening] = useState(() => props);
	const {
		rentalId,
		rentalVersion,
		currentPeriodStart,
		currentPeriodEnd,
		operationalTimezone,
		fulfillmentMethod,
	} = opening;
	const { onOpenChange, canAuthorizeDeliveryException } = props;
	const isDelivery = fulfillmentMethod === "DELIVERY";
	const previewPeriod = usePreviewRentalPeriod();
	const generation = useRef(0);
	const operationInFlight = useRef(false);
	const [authorized, setAuthorized] = useState(false);
	const [reason, setReason] = useState("");
	const [minutesAccepted, setMinutesAccepted] = useState(false);
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
	const formSchema = createRescheduleRentalPeriodFormSchema({
		operationalTimezone,
		currentOperationTime,
	});

	function invalidateReview() {
		generation.current += 1;
		if (!previewPeriod.isPending) previewPeriod.reset();
		setAuthorized(false);
		setReason("");
		setMinutesAccepted(false);
	}

	function matchingReview(body: RescheduleConfirmedRentalPeriodBodyDto) {
		const result = previewPeriod.data;
		if (!result || result.request.generation !== generation.current)
			return null;
		const { request, preview } = result;
		if (
			request.rentalId !== rentalId ||
			preview.rentalId !== rentalId ||
			request.body.expectedVersion !== body.expectedVersion ||
			preview.expectedVersion !== body.expectedVersion ||
			request.body.period.start !== body.period.start ||
			request.body.period.end !== body.period.end ||
			new Date(preview.period.start).toISOString() !== body.period.start ||
			new Date(preview.period.end).toISOString() !== body.period.end
		)
			return null;
		return preview;
	}

	function reviewIsComplete(body: RescheduleConfirmedRentalPeriodBodyDto) {
		const preview = matchingReview(body);
		if (
			!preview?.reviewIdentity ||
			!preview.delivery ||
			preview.delivery.proposedEffectiveCharge === null ||
			preview.proposedAcceptedCustomerTotal === null ||
			deliveryReviewBlockers(preview).length > 0 ||
			(preview.delivery.currentPricingSource === "STAFF_AGREEMENT" &&
				!preview.delivery.staffAgreementPreserved)
		)
			return false;
		if (
			needsPolicyAuthorization(preview) &&
			(!canAuthorizeDeliveryException || !authorized)
		)
			return false;
		if (
			needsMinuteAcceptance(preview) &&
			(!minutesAccepted ||
				preview.delivery.transportReservationMinutes === null)
		)
			return false;
		return true;
	}

	async function handleServerError(error: unknown) {
		const uiError = toRescheduleRentalPeriodUiError(error);
		setServerError(uiError);
		if (isDelivery) invalidateReview();
		if (uiError.kind === "stale") {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: rentalKeys.all() }),
				queryClient.invalidateQueries({
					queryKey: contractKeys.rentalSigningSummary(rentalId),
				}),
			]);
		}
	}

	const form = useForm({
		defaultValues: hydrateConfirmedRentalPeriod(
			currentPeriodStart,
			currentPeriodEnd,
			operationalTimezone,
		),
		validators: {
			onChange: formSchema,
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			if (operationInFlight.current || serverError?.kind === "stale") return;
			const body = toRescheduleConfirmedRentalPeriodBody(
				value,
				operationalTimezone,
				rentalVersion,
			);
			const review = matchingReview(body);
			if (isDelivery && review && (!reviewIsComplete(body) || serverError))
				return;
			operationInFlight.current = true;
			setServerError(null);

			try {
				if (isDelivery && !review) {
					invalidateReview();
					const requestGeneration = generation.current;
					try {
						await previewPeriod.mutateAsync({
							rentalId,
							body,
							generation: requestGeneration,
						});
					} catch (error) {
						if (
							requestGeneration === generation.current ||
							toRescheduleRentalPeriodUiError(error).kind === "stale"
						)
							await handleServerError(error);
					}
					return;
				}
				if (isDelivery && review?.reviewIdentity) {
					body.reviewIdentity = review.reviewIdentity;
					if (
						needsPolicyAuthorization(review) &&
						authorized &&
						canAuthorizeDeliveryException
					) {
						body.policyException = {
							type: "AUTHORIZE",
							...(reason.trim() ? { reason: reason.trim() } : {}),
						};
					}
					if (needsMinuteAcceptance(review) && minutesAccepted)
						body.acceptReusedTransportReservationMinutes = true;
				}
				await reschedulePeriod.mutateAsync({ rentalId, body });
				toast.success("Período actualizado");
				onOpenChange(false);
			} catch (error) {
				await handleServerError(error);
			} finally {
				operationInFlight.current = false;
			}
		},
	});
	const isStale = serverError?.kind === "stale";
	const isPending = previewPeriod.isPending || reschedulePeriod.isPending;
	const review =
		previewPeriod.data?.request.generation === generation.current
			? previewPeriod.data.preview
			: null;

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen && (isPending || operationInFlight.current)) return;
		onOpenChange(nextOpen);
	}

	function clearCorrectableServerError() {
		invalidateReview();
		if (serverError?.kind !== "stale") setServerError(null);
	}

	return (
		<Dialog
			open
			onOpenChange={handleOpenChange}
			disablePointerDismissal={isPending}
		>
			<DialogContent
				className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
				showCloseButton={!isPending}
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
						{isDelivery
							? "El precio de los equipos y del seguro no cambiará. Revisá el precio y las condiciones de entrega y retiro antes de guardar."
							: "El precio acordado y los equipos asignados no cambiarán. Solo se actualizará el período del alquiler."}
					</p>

					<form
						onSubmit={(event) => {
							event.preventDefault();
							event.stopPropagation();
							form.handleSubmit();
						}}
					>
						<fieldset disabled={reschedulePeriod.isPending || isStale}>
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
																			if (reschedulePeriod.isPending) return;
																			clearCorrectableServerError();
																			startDateField.handleChange(value);
																		}}
																		onStartDateBlur={startDateField.handleBlur}
																		onStartTimeChange={(value) => {
																			if (reschedulePeriod.isPending) return;
																			clearCorrectableServerError();
																			startTimeField.handleChange(value);
																		}}
																		onStartTimeBlur={startTimeField.handleBlur}
																		onEndDateChange={(value) => {
																			if (reschedulePeriod.isPending) return;
																			clearCorrectableServerError();
																			endDateField.handleChange(value);
																		}}
																		onEndDateBlur={endDateField.handleBlur}
																		onEndTimeChange={(value) => {
																			if (reschedulePeriod.isPending) return;
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
						</fieldset>

						{review ? (
							<DeliveryPeriodReview
								preview={review}
								canAuthorize={canAuthorizeDeliveryException}
								authorized={authorized}
								reason={reason}
								minutesAccepted={minutesAccepted}
								disabled={isPending}
								onAuthorizedChange={setAuthorized}
								onReasonChange={setReason}
								onMinutesAcceptedChange={setMinutesAccepted}
							/>
						) : null}

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
								disabled={isPending}
								onClick={() => handleOpenChange(false)}
							>
								Cancelar
							</Button>
							<form.Subscribe
								selector={(state) => ({
									canSubmit: state.canSubmit,
									isSubmitting: state.isSubmitting,
									values: state.values,
								})}
							>
								{({ canSubmit, isSubmitting, values }) => {
									const valid = formSchema.safeParse(values).success;
									const body = valid
										? toRescheduleConfirmedRentalPeriodBody(
												values,
												operationalTimezone,
												rentalVersion,
											)
										: null;
									const hasReview = body
										? matchingReview(body) !== null
										: false;
									return (
										<>
											{isDelivery && hasReview ? (
												<Button
													type="button"
													variant="ghost"
													disabled={
														!valid || isSubmitting || isPending || isStale
													}
													onClick={() => {
														if (operationInFlight.current) return;
														clearCorrectableServerError();
														form.handleSubmit();
													}}
												>
													Volver a revisar
												</Button>
											) : null}
											<Button
												type="submit"
												disabled={
													!canSubmit ||
													isSubmitting ||
													isPending ||
													isStale ||
													(isDelivery &&
														(!valid ||
															(hasReview &&
																(!body ||
																	!reviewIsComplete(body) ||
																	serverError !== null))))
												}
											>
												{isSubmitting || isPending ? (
													<Loader2 className="size-4 animate-spin" />
												) : null}
												{isDelivery && !hasReview
													? "Revisar cambios"
													: isDelivery
														? "Guardar cambios"
														: "Guardar período"}
											</Button>
										</>
									);
								}}
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
