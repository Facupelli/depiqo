import type { PreviewDraftRentalCostDeliveryDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { useStore } from "@tanstack/react-form";
import { useId } from "react";
import { withForm } from "@/shared/contexts/form.context";
import { formatMoney } from "@/shared/utils/formatters";
import { getDeliveryTechnicalFailureMessage } from "../delivery-preview";
import { useDraftRentalComposer } from "../draft-rental-composer.context";
import { createDraftRentalComposerDefaultValues } from "../draft-rental-composer.schema";

export const RoutedDeliveryPricingFields = withForm({
	defaultValues: createDraftRentalComposerDefaultValues(),
	props: {} as {
		delivery: PreviewDraftRentalCostDeliveryDto | null | undefined;
		loading: boolean;
	},
	render: function Render({ form, delivery, loading }) {
		const {
			state: {
				canManageDelivery,
				storedAgreement: savedAgreement,
				storedDeliveryCurrency,
				validationContext,
			},
		} = useDraftRentalComposer();
		const storedAgreement =
			validationContext.initialValues?.deliveryArrangement === "ROUTED"
				? savedAgreement
				: undefined;
		const id = useId();
		const decision = useStore(
			form.store,
			(state) => state.values.deliveryAgreementDecision,
		);
		const currency = delivery?.currency ?? storedDeliveryCurrency;
		return (
			<div className="space-y-3 border-t pt-4">
				<div className="flex items-center justify-between gap-3 text-sm">
					<span>Entrega y retiro</span>
					<span className="font-medium tabular-nums">
						{loading
							? "Calculando..."
							: delivery?.effectiveCharge != null && currency
								? formatMoney(delivery.effectiveCharge, currency)
								: "Por definir"}
					</span>
				</div>
				<p className="text-xs text-muted-foreground">
					{getDeliveryTechnicalFailureMessage(delivery) ??
						(delivery
							? "Podés usar el precio calculado o definir otro importe."
							: "Completá las condiciones de envío para consultar el precio.")}
				</p>
				{storedAgreement ? (
					<p className="text-xs text-muted-foreground">
						Importe actual:{" "}
						{storedDeliveryCurrency
							? formatMoney(storedAgreement.amount, storedDeliveryCurrency)
							: storedAgreement.amount}
						{storedAgreement.reason ? ` · ${storedAgreement.reason}` : ""}
					</p>
				) : null}
				{canManageDelivery ? (
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							variant={decision === "SET" ? "secondary" : "outline"}
							size="sm"
							onClick={() => {
								if (decision !== "SET") {
									form.setFieldValue(
										"deliveryAgreementAmount",
										storedAgreement?.amount ?? "",
									);
									form.setFieldValue(
										"deliveryAgreementReason",
										storedAgreement?.reason ?? "",
									);
								}
								form.setFieldValue("deliveryAgreementDecision", "SET");
							}}
						>
							Definir importe
						</Button>
						<Button
							type="button"
							variant={
								decision === (storedAgreement ? "CLEAR" : "")
									? "secondary"
									: "outline"
							}
							size="sm"
							disabled={
								loading ||
								(decision !== "SET" &&
									(delivery?.calculatedCharge == null ||
										Boolean(delivery.technicalFailure)))
							}
							onClick={() =>
								form.setFieldValue(
									"deliveryAgreementDecision",
									storedAgreement ? "CLEAR" : "",
								)
							}
						>
							Usar precio calculado
						</Button>
						{storedAgreement ? (
							<Button
								type="button"
								variant={decision === "KEEP" ? "secondary" : "outline"}
								size="sm"
								onClick={() =>
									form.setFieldValue("deliveryAgreementDecision", "KEEP")
								}
							>
								Conservar importe actual
							</Button>
						) : null}
					</div>
				) : null}
				{decision === "SET" ? (
					<>
						<form.Field name="deliveryAgreementAmount">
							{(field) => (
								<Field data-invalid={!field.state.meta.isValid}>
									<FieldLabel htmlFor={`${id}-amount`}>
										Importe de entrega y retiro
									</FieldLabel>
									<Input
										id={`${id}-amount`}
										inputMode="decimal"
										placeholder="0,00"
										disabled={!canManageDelivery}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
										aria-invalid={!field.state.meta.isValid}
									/>
									<FieldError errors={field.state.meta.errors} />
								</Field>
							)}
						</form.Field>
						<form.Field name="deliveryAgreementReason">
							{(field) => (
								<Field>
									<FieldLabel htmlFor={`${id}-reason`}>
										Motivo del importe (opcional)
									</FieldLabel>
									<Input
										id={`${id}-reason`}
										disabled={!canManageDelivery}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
									/>
								</Field>
							)}
						</form.Field>
					</>
				) : null}
			</div>
		);
	},
});
