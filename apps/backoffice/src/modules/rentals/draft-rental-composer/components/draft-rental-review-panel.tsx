import { Button } from "@repo/ui/components/button";
import { useStore } from "@tanstack/react-form";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { withForm } from "@/shared/contexts/form.context";
import { useDraftRentalComposer } from "../draft-rental-composer.context";
import { createDraftRentalComposerDefaultValues } from "../draft-rental-composer.schema";
import {
	getCurrentDraftRentalCostPreview,
	getCurrentDraftRentalEquipmentPreview,
} from "../draft-rental-preview";
import { DraftRentalFinancialSummary } from "./draft-rental-financial-summary";
import { DraftRentalPricingDialog } from "./draft-rental-pricing-dialog";

export const DraftRentalReviewPanel = createDraftRentalReviewPanel(false);
export const PriceAdjustableDraftRentalReviewPanel =
	createDraftRentalReviewPanel(true);

function createDraftRentalReviewPanel(includeManualPriceAdjustment: boolean) {
	return withForm({
		defaultValues: createDraftRentalComposerDefaultValues(),
		render: function Render({ form }) {
			const {
				state: { costPreview, blockingMessages },
				meta: {
					isPriceLoading,
					retryPricePreview,
					isSubmitting,
					submitDisabled,
					submitError,
					submitLabel,
				},
			} = useDraftRentalComposer();
			const values = useStore(form.store, (state) => state.values);
			const [editing, setEditing] = useState(false);
			const pricePreview = getCurrentDraftRentalCostPreview(
				values,
				costPreview,
			);
			const equipmentPreview = getCurrentDraftRentalEquipmentPreview(
				values,
				costPreview,
			);
			const hasEquipmentAdjustment = Boolean(values.targetTotal.trim());
			return (
				<>
					<DraftRentalFinancialSummary
						preview={pricePreview}
						equipmentPreview={equipmentPreview}
						isFetching={isPriceLoading}
						showDelivery={values.fulfillmentMethod === "DELIVERY"}
						staffArranged={values.deliveryArrangement === "STAFF_ARRANGED"}
						hasEquipmentAdjustment={hasEquipmentAdjustment}
						equipmentAction={
							includeManualPriceAdjustment ? (
								<div className="flex items-center gap-1">
									<Button
										type="button"
										variant="ghost"
										size="icon-xs"
										className="text-muted-foreground"
										title={
											hasEquipmentAdjustment
												? "Editar ajuste de equipos"
												: "Ajustar precio de equipos"
										}
										aria-label={
											hasEquipmentAdjustment
												? "Editar ajuste de equipos"
												: "Ajustar precio de equipos"
										}
										disabled={isSubmitting}
										onClick={() => setEditing(true)}
									>
										<Pencil className="size-3.5" />
									</Button>
									{hasEquipmentAdjustment ? (
										<Button
											type="button"
											variant="ghost"
											size="icon-xs"
											className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20"
											title="Quitar ajuste"
											aria-label="Quitar ajuste"
											disabled={isSubmitting}
											onClick={() => {
												form.setFieldValue("targetTotal", "");
												form.setFieldValue("adjustmentReason", "");
											}}
										>
											<Trash2 className="size-3.5" />
										</Button>
									) : null}
								</div>
							) : null
						}
					>
						<div className="mt-4 space-y-2 border-t pt-4">
							{blockingMessages.map((message) => (
								<p
									key={message}
									className="text-xs text-destructive"
									role="alert"
								>
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
							{submitError ? (
								<p className="text-sm text-destructive">{submitError}</p>
							) : null}
							<form.Subscribe selector={(state) => state.isSubmitting}>
								{(formIsSubmitting) => (
									<Button
										type="button"
										className="w-full"
										disabled={
											submitDisabled || !pricePreview || formIsSubmitting
										}
										onClick={() => form.handleSubmit()}
									>
										{isSubmitting || formIsSubmitting
											? "Guardando..."
											: submitLabel}
									</Button>
								)}
							</form.Subscribe>
						</div>
					</DraftRentalFinancialSummary>
					{editing && includeManualPriceAdjustment ? (
						<DraftRentalPricingDialog
							kind="equipment"
							defaultValues={{
								amount: values.targetTotal,
								reason: values.adjustmentReason,
							}}
							calculatedAmount={equipmentPreview?.pricing.calculated.total}
							currency={equipmentPreview?.currency ?? "USD"}
							onSave={(value) => {
								form.setFieldValue("targetTotal", value.amount);
								form.setFieldValue("adjustmentReason", value.reason);
							}}
							onClose={() => setEditing(false)}
						/>
					) : null}
				</>
			);
		},
	});
}
