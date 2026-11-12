import type { PreviewDraftRentalCostDeliveryDto } from "@repo/api-contracts";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { useId } from "react";
import { withForm } from "@/shared/contexts/form.context";
import { deliveryRestrictionLabels } from "../delivery-preview";
import { resetPendingDeliveryReview } from "../draft-rental-composer.form-utils";
import { createDraftRentalComposerDefaultValues } from "../draft-rental-composer.schema";

export const DraftRentalDeliveryReview = withForm({
	defaultValues: createDraftRentalComposerDefaultValues(),
	props: {} as {
		delivery: PreviewDraftRentalCostDeliveryDto | null | undefined;
		canManageDelivery: boolean;
	},
	render: function Render({ form, delivery, canManageDelivery }) {
		const id = useId();
		if (delivery?.arrangement === "STAFF_ARRANGED") {
			return (
				<p className="mt-3 text-xs text-muted-foreground">
					Entrega coordinada por el equipo. Se conservan las condiciones
					guardadas, sin validar nuevamente el transporte:{" "}
					{delivery.deliveryDetails.address}. Reserva para transporte:{" "}
					{delivery.transportReservationMinutes} min.
				</p>
			);
		}
		return (
			<form.Subscribe
				selector={(state) => state.values.transportReservationMinutes}
			>
				{(minutes) =>
					delivery?.restrictions.length ||
					delivery?.requirements.includes(
						"TRANSPORT_RESERVATION_MINUTES_REQUIRED",
					) ||
					minutes !== "" ? (
						<details className="mt-3 rounded-md border text-xs">
							<summary className="cursor-pointer px-3 py-2 font-medium">
								Condiciones de entrega
								{delivery?.policyExceptionRequired ||
								delivery?.requirements.includes(
									"TRANSPORT_RESERVATION_MINUTES_REQUIRED",
								)
									? " · Requiere revisión"
									: ""}
							</summary>
							<div className="space-y-3 border-t p-3">
								{delivery?.restrictions.length ? (
									<div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-950">
										{delivery.restrictions.map((restriction) => (
											<p key={restriction}>
												{deliveryRestrictionLabels[restriction]}
											</p>
										))}
										{!delivery.policyExceptionRequired ? (
											<p>
												Excepción guardada. Se conserva para estas condiciones
												de transporte.
											</p>
										) : canManageDelivery ? (
											<>
												<form.Field name="deliveryExceptionAccepted">
													{(field) => (
														<label
															htmlFor={`${id}-exception`}
															className="flex items-start gap-2"
														>
															<Checkbox
																id={`${id}-exception`}
																checked={field.state.value}
																onCheckedChange={(checked) =>
																	field.handleChange(checked === true)
																}
															/>
															<span>
																Autorizar esta entrega excepcional con las
																condiciones actuales
															</span>
														</label>
													)}
												</form.Field>
												<form.Field name="deliveryExceptionReason">
													{(field) => (
														<Field className="gap-1.5">
															<FieldLabel htmlFor={`${id}-reason`}>
																Motivo de la excepción (opcional)
															</FieldLabel>
															<Input
																id={`${id}-reason`}
																value={field.state.value}
																onChange={(event) =>
																	field.handleChange(event.target.value)
																}
																onBlur={field.handleBlur}
															/>
														</Field>
													)}
												</form.Field>
											</>
										) : (
											<p>Necesitás permiso para autorizar esta excepción.</p>
										)}
									</div>
								) : null}
								<form.Field name="transportReservationMinutes">
									{(field) =>
										delivery?.requirements.includes(
											"TRANSPORT_RESERVATION_MINUTES_REQUIRED",
										) || field.state.value !== "" ? (
											<Field
												className="gap-1.5"
												data-invalid={!field.state.meta.isValid}
											>
												<FieldLabel htmlFor={`${id}-minutes`}>
													Minutos de reserva para transporte
												</FieldLabel>
												<Input
													id={`${id}-minutes`}
													inputMode="numeric"
													value={field.state.value}
													onChange={(event) => {
														if (event.target.value !== field.state.value)
															resetPendingDeliveryReview(form);
														field.handleChange(event.target.value);
													}}
													onBlur={field.handleBlur}
													placeholder="Entero no negativo, incluyendo 0"
													aria-invalid={!field.state.meta.isValid}
												/>
												<p className="text-muted-foreground">
													Dejá vacío para usar la configuración cuando esté
													disponible.
												</p>
												<FieldError errors={field.state.meta.errors} />
											</Field>
										) : null
									}
								</form.Field>
							</div>
						</details>
					) : null
				}
			</form.Subscribe>
		);
	},
});
