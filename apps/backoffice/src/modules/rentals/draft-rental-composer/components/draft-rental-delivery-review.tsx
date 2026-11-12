import type {
	GetRentalDetailResponseDto,
	PreviewDraftRentalCostDeliveryDto,
} from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { useId } from "react";
import { withForm } from "@/shared/contexts/form.context";
import { deliveryRestrictionLabels } from "../delivery-preview";
import { resetPendingDeliveryReview } from "../draft-rental-composer.form-utils";
import { createDraftRentalComposerDefaultValues } from "../draft-rental-composer.schema";

type DeliveryReviewProps = {
	delivery: PreviewDraftRentalCostDeliveryDto | null | undefined;
	canManageDelivery: boolean;
	storedAgreement:
		| NonNullable<GetRentalDetailResponseDto["draftDelivery"]>["staffAgreement"]
		| undefined;
	storedCurrency: string | undefined;
};

export const DraftRentalDeliveryReview = withForm({
	defaultValues: createDraftRentalComposerDefaultValues(),
	props: {} as DeliveryReviewProps,
	render: function Render({
		form,
		delivery,
		canManageDelivery,
		storedAgreement,
		storedCurrency,
	}) {
		const exceptionId = useId();
		const needsDecision = delivery?.requirements.some(
			(item) =>
				item === "AGREEMENT_DECISION_REQUIRED" ||
				item === "CURRENCY_DECISION_REQUIRED",
		);
		function chooseDecision(type: "SET" | "CLEAR" | "KEEP" | "") {
			form.setFieldValue("deliveryAgreementDecision", type);
			if (type === "SET") {
				form.setFieldValue("deliveryAgreementAmount", "");
				form.setFieldValue("deliveryAgreementReason", "");
			}
		}
		return (
			<form.Subscribe selector={(state) => state.values.fulfillmentMethod}>
				{(method) =>
					method !== "DELIVERY" ? null : (
						<Card size="sm" className="gap-3 shadow-none">
							<CardHeader>
								<CardTitle className="text-base">
									Entrega y recolección
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								{storedAgreement ? (
									<p className="text-xs text-muted-foreground">
										Acuerdo guardado: {storedAgreement.amount} {storedCurrency}.{" "}
										{storedAgreement.reason
											? `Motivo: ${storedAgreement.reason}. `
											: ""}
										Se conserva si no cambian las condiciones de transporte.
									</p>
								) : null}
								{needsDecision ? (
									<p className="text-sm font-medium">
										Cambiaron las condiciones de transporte. Elegí qué hacer con
										el acuerdo.
									</p>
								) : null}
								<form.Field name="deliveryAgreementDecision">
									{(field) => (
										<>
											{storedAgreement &&
											(needsDecision || field.state.value) ? (
												<Button
													type="button"
													variant={
														field.state.value === "KEEP"
															? "secondary"
															: "outline"
													}
													size="sm"
													className="w-full"
													onClick={() => chooseDecision("KEEP")}
												>
													Conservar importe guardado
												</Button>
											) : null}
											{canManageDelivery ? (
												<>
													{field.state.value !== "SET" ? (
														<Button
															type="button"
															variant="outline"
															size="sm"
															className="w-full"
															onClick={() => chooseDecision("SET")}
														>
															{storedAgreement
																? "Definir otro importe de envío"
																: "Acordar importe de envío"}
														</Button>
													) : (
														<>
															<form.Field name="deliveryAgreementAmount">
																{(amount) => (
																	<Field
																		className="gap-1.5"
																		data-invalid={!amount.state.meta.isValid}
																	>
																		<FieldLabel htmlFor={amount.name}>
																			Importe combinado de entrega y recolección
																		</FieldLabel>
																		<Input
																			id={amount.name}
																			inputMode="decimal"
																			value={amount.state.value}
																			onBlur={amount.handleBlur}
																			onChange={(event) =>
																				amount.handleChange(event.target.value)
																			}
																			placeholder="0,00"
																			aria-invalid={!amount.state.meta.isValid}
																		/>
																		<FieldError
																			errors={amount.state.meta.errors}
																		/>
																	</Field>
																)}
															</form.Field>
															<form.Field name="deliveryAgreementReason">
																{(reason) => (
																	<Field className="gap-1.5">
																		<FieldLabel htmlFor={reason.name}>
																			Motivo del acuerdo (opcional)
																		</FieldLabel>
																		<Input
																			id={reason.name}
																			value={reason.state.value}
																			onBlur={reason.handleBlur}
																			onChange={(event) =>
																				reason.handleChange(event.target.value)
																			}
																		/>
																	</Field>
																)}
															</form.Field>
														</>
													)}
													{delivery?.calculatedCharge != null &&
													(storedAgreement || field.state.value) ? (
														<Button
															type="button"
															variant={
																field.state.value === "CLEAR"
																	? "secondary"
																	: "outline"
															}
															size="sm"
															className="w-full"
															onClick={() => chooseDecision("CLEAR")}
														>
															Usar precio automático
														</Button>
													) : null}
												</>
											) : null}
											{field.state.value ? (
												<Button
													type="button"
													variant="ghost"
													size="sm"
													className="w-full"
													onClick={() => chooseDecision("")}
												>
													Deshacer decisión de precio
												</Button>
											) : null}
										</>
									)}
								</form.Field>
								{delivery?.restrictions.length ? (
									<div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
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
															htmlFor={exceptionId}
															className="flex items-start gap-2"
														>
															<Checkbox
																id={exceptionId}
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
															<FieldLabel htmlFor={field.name}>
																Motivo de la excepción (opcional)
															</FieldLabel>
															<Input
																id={field.name}
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
												<FieldLabel htmlFor={field.name}>
													Minutos de reserva para transporte
												</FieldLabel>
												<Input
													id={field.name}
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
												<p className="text-xs text-muted-foreground">
													Dejá vacío para usar la configuración cuando esté
													disponible.
												</p>
												<FieldError errors={field.state.meta.errors} />
											</Field>
										) : null
									}
								</form.Field>
							</CardContent>
						</Card>
					)
				}
			</form.Subscribe>
		);
	},
});
