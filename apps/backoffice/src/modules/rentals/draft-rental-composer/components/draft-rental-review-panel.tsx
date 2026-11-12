import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import { useStore } from "@tanstack/react-form";
import { useId, useState } from "react";
import { withForm } from "@/shared/contexts/form.context";
import { useDraftRentalComposer } from "../draft-rental-composer.context";
import { createDraftRentalComposerDefaultValues } from "../draft-rental-composer.schema";
import { DraftRentalDeliveryReview } from "./draft-rental-delivery-review";
import { DraftRentalFinancialSummary } from "./draft-rental-financial-summary";

export const DraftRentalReviewPanel = createDraftRentalReviewPanel(false);
export const PriceAdjustableDraftRentalReviewPanel =
	createDraftRentalReviewPanel(true);

function createDraftRentalReviewPanel(includeManualPriceAdjustment: boolean) {
	return withForm({
		defaultValues: createDraftRentalComposerDefaultValues(),
		render: function Render({ form }) {
			const {
				state: {
					pricePreview,
					blockingMessages,
					canManageDelivery,
					storedAgreement,
					storedDeliveryCurrency,
				},
				meta: {
					isPriceLoading,
					retryPricePreview,
					isSubmitting,
					submitDisabled,
					submitError,
					submitLabel,
				},
			} = useDraftRentalComposer();
			const targetTotal = useStore(
				form.store,
				(state) => state.values.targetTotal,
			);
			const adjustmentFieldsId = useId();
			const [isAdjustmentEditing, setIsAdjustmentEditing] = useState(() =>
				Boolean(targetTotal.trim()),
			);
			function removeAdjustment() {
				form.setFieldValue("targetTotal", "");
				form.setFieldValue("adjustmentReason", "");
				setIsAdjustmentEditing(false);
			}
			return (
				<div className="space-y-2">
					<DraftRentalFinancialSummary
						preview={pricePreview}
						isFetching={isPriceLoading}
					/>
					<DraftRentalDeliveryReview
						form={form}
						delivery={pricePreview?.delivery}
						canManageDelivery={canManageDelivery}
						storedAgreement={storedAgreement}
						storedCurrency={storedDeliveryCurrency}
					/>
					{blockingMessages.map((message) => (
						<p key={message} className="text-xs text-destructive" role="alert">
							{message}
						</p>
					))}
					{retryPricePreview ? (
						<Button
							type="button"
							size="sm"
							variant="outline"
							className="w-full"
							onClick={retryPricePreview}
						>
							Reintentar cálculo
						</Button>
					) : null}
					{includeManualPriceAdjustment ? (
						<Card size="sm" className="gap-3 shadow-none">
							<CardHeader className="grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
								<CardTitle className="text-base">Ajustar equipos</CardTitle>
								{isAdjustmentEditing && targetTotal.trim() ? (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-auto px-2 py-1 text-muted-foreground"
										onClick={removeAdjustment}
									>
										Quitar ajuste
									</Button>
								) : null}
							</CardHeader>
							<CardContent>
								{isAdjustmentEditing ? (
									<div id={adjustmentFieldsId} className="space-y-3">
										<form.Field name="targetTotal">
											{(field) => (
												<Field
													className="gap-1.5"
													data-invalid={!field.state.meta.isValid}
												>
													<FieldLabel htmlFor={field.name}>
														Total de equipos
													</FieldLabel>
													<Input
														id={field.name}
														inputMode="decimal"
														placeholder="Ingresá un total"
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={(event) =>
															field.handleChange(event.target.value)
														}
													/>
													{!field.state.meta.isValid ? (
														<FieldError errors={field.state.meta.errors} />
													) : null}
												</Field>
											)}
										</form.Field>
										<form.Field name="adjustmentReason">
											{(field) => (
												<Field className="gap-1.5">
													<FieldLabel htmlFor={field.name}>Motivo</FieldLabel>
													<Textarea
														id={field.name}
														placeholder="Opcional"
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={(event) =>
															field.handleChange(event.target.value)
														}
														className="min-h-16"
													/>
												</Field>
											)}
										</form.Field>
									</div>
								) : (
									<Button
										type="button"
										variant="outline"
										className="w-full"
										aria-expanded={false}
										aria-controls={adjustmentFieldsId}
										onClick={() => setIsAdjustmentEditing(true)}
									>
										Definir total de equipos
									</Button>
								)}
							</CardContent>
						</Card>
					) : null}
					{submitError ? (
						<p className="pt-1 text-sm text-destructive">{submitError}</p>
					) : null}
					<form.Subscribe selector={(state) => state.isSubmitting}>
						{(formIsSubmitting) => (
							<Button
								type="button"
								className="mt-3 w-full"
								disabled={submitDisabled || formIsSubmitting}
								onClick={() => form.handleSubmit()}
							>
								{isSubmitting || formIsSubmitting
									? "Guardando..."
									: submitLabel}
							</Button>
						)}
					</form.Subscribe>
				</div>
			);
		},
	});
}
