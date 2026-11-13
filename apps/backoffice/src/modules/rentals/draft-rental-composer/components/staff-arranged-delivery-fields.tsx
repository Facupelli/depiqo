import { Button } from "@repo/ui/components/button";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { useStore } from "@tanstack/react-form";
import { withForm } from "@/shared/contexts/form.context";
import { useDraftRentalComposer } from "../draft-rental-composer.context";
import { resetPendingDeliveryReview } from "../draft-rental-composer.form-utils";
import {
	canPreserveStaffAgreement,
	createDraftRentalComposerDefaultValues,
} from "../draft-rental-composer.schema";

export const StaffArrangedDeliveryFields = withForm({
	defaultValues: createDraftRentalComposerDefaultValues(),
	props: { canManageDelivery: false },
	render: function Render({ form, canManageDelivery }) {
		const {
			state: { storedAgreement, validationContext },
		} = useDraftRentalComposer();
		const existing =
			canPreserveStaffAgreement(validationContext.initialValues) &&
			Boolean(storedAgreement);
		const decision = useStore(
			form.store,
			(state) => state.values.deliveryAgreementDecision,
		);
		const preserving = existing && decision !== "SET";
		return (
			<div className="space-y-3">
				<div className="grid gap-3 sm:grid-cols-2">
					<form.Field name="deliveryAgreementAmount">
						{(field) => (
							<Field data-invalid={!field.state.meta.isValid}>
								<FieldLabel htmlFor={field.name}>
									Importe de entrega y retiro
								</FieldLabel>
								<Input
									id={field.name}
									inputMode="decimal"
									placeholder="0,00"
									value={
										preserving ? storedAgreement?.amount : field.state.value
									}
									disabled={!canManageDelivery}
									readOnly={preserving}
									onBlur={field.handleBlur}
									aria-invalid={!field.state.meta.isValid}
									onChange={(event) => {
										field.handleChange(event.target.value);
										form.setFieldValue("deliveryAgreementDecision", "SET");
									}}
								/>
								<FieldError errors={field.state.meta.errors} />
							</Field>
						)}
					</form.Field>
					<form.Field name="transportReservationMinutes">
						{(field) => (
							<Field data-invalid={!field.state.meta.isValid}>
								<FieldLabel htmlFor={field.name}>
									Margen para transporte (min)
								</FieldLabel>
								<Input
									id={field.name}
									inputMode="numeric"
									placeholder="0"
									value={field.state.value}
									disabled={!canManageDelivery}
									onBlur={field.handleBlur}
									aria-invalid={!field.state.meta.isValid}
									onChange={(event) => {
										if (event.target.value !== field.state.value)
											resetPendingDeliveryReview(
												form,
												validationContext.initialValues,
											);
										field.handleChange(event.target.value);
									}}
								/>
								<p className="text-xs text-muted-foreground">
									Reservamos tiempo adicional antes y después del alquiler para
									entregar y retirar los equipos.
								</p>
								<FieldError errors={field.state.meta.errors} />
							</Field>
						)}
					</form.Field>
				</div>
				<form.Field name="deliveryAgreementReason">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>
								Motivo del acuerdo (opcional)
							</FieldLabel>
							<Input
								id={field.name}
								value={
									preserving
										? (storedAgreement?.reason ?? "")
										: field.state.value
								}
								disabled={!canManageDelivery}
								readOnly={preserving}
								onBlur={field.handleBlur}
								onChange={(event) => {
									field.handleChange(event.target.value);
									form.setFieldValue("deliveryAgreementDecision", "SET");
								}}
							/>
						</Field>
					)}
				</form.Field>
				<form.Field name="deliveryAgreementDecision">
					{(field) => (
						<Field data-invalid={!field.state.meta.isValid}>
							{existing && canManageDelivery ? (
								<div className="flex flex-wrap gap-2">
									<Button
										type="button"
										size="sm"
										variant={
											field.state.value === "KEEP" ? "secondary" : "outline"
										}
										onClick={() => {
											form.setFieldValue(
												"deliveryAgreementAmount",
												storedAgreement?.amount ?? "",
											);
											form.setFieldValue(
												"deliveryAgreementReason",
												storedAgreement?.reason ?? "",
											);
											field.handleChange("KEEP");
										}}
									>
										Conservar importe guardado
									</Button>
									<Button
										type="button"
										size="sm"
										variant={
											field.state.value === "SET" ? "secondary" : "outline"
										}
										onClick={() => field.handleChange("SET")}
									>
										Registrar nuevo acuerdo
									</Button>
								</div>
							) : null}
							{field.state.value !== "SET" ? (
								<p className="text-xs text-muted-foreground">
									{field.state.value === "KEEP"
										? "Se conserva el importe, el motivo y la atribución originales del acuerdo."
										: "Si cambiás la dirección o las condiciones de transporte, elegí conservar el acuerdo o registrar uno nuevo."}
								</p>
							) : null}
							<FieldError errors={field.state.meta.errors} />
						</Field>
					)}
				</form.Field>
			</div>
		);
	},
});
