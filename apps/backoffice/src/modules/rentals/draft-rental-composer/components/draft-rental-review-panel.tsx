import { Button } from "@repo/ui/components/button";
import { useStore } from "@tanstack/react-form";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { withForm } from "@/shared/contexts/form.context";
import { formatMoney } from "@/shared/utils/formatters";
import { useDraftRentalComposer } from "../draft-rental-composer.context";
import { createDraftRentalComposerDefaultValues } from "../draft-rental-composer.schema";
import { DraftRentalDeliveryReview } from "./draft-rental-delivery-review";
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
			const values = useStore(form.store, (state) => state.values);
			const [editor, setEditor] = useState<"equipment" | "delivery" | null>(
				null,
			);
			const delivery = pricePreview?.delivery;
			const hasEquipmentAdjustment = Boolean(values.targetTotal.trim());
			const hasDeliveryAgreement =
				values.deliveryAgreementDecision === "SET" ||
				(values.deliveryAgreementDecision !== "CLEAR" &&
					Boolean(storedAgreement));
			const needsDecision = Boolean(
				delivery?.requirements.some(
					(item) =>
						item === "AGREEMENT_DECISION_REQUIRED" ||
						item === "CURRENCY_DECISION_REQUIRED",
				),
			);
			const canClearDelivery =
				delivery?.calculatedCharge != null &&
				delivery.technicalFailure === null &&
				!isPriceLoading &&
				!retryPricePreview;
			const showDelivery = values.fulfillmentMethod === "DELIVERY";
			return (
				<>
					<DraftRentalFinancialSummary
						preview={pricePreview}
						isFetching={isPriceLoading}
						showDelivery={showDelivery}
						hasEquipmentAdjustment={hasEquipmentAdjustment}
						equipmentAction={
							includeManualPriceAdjustment ? (
								<div className="flex items-center gap-1">
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
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
										onClick={() => setEditor("equipment")}
									>
										<Pencil className="size-3.5" />
									</Button>
									{hasEquipmentAdjustment ? (
										<Button
											type="button"
											variant="ghost"
											size="icon-sm"
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
						deliveryAction={
							canManageDelivery ? (
								<div className="flex items-center gap-1">
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										className="text-muted-foreground"
										title={
											hasDeliveryAgreement
												? "Editar precio de entrega y retiro"
												: "Acordar precio de entrega y retiro"
										}
										aria-label={
											hasDeliveryAgreement
												? "Editar precio de entrega y retiro"
												: "Acordar precio de entrega y retiro"
										}
										disabled={isSubmitting}
										onClick={() => setEditor("delivery")}
									>
										<Pencil className="size-3.5" />
									</Button>
									{hasDeliveryAgreement && canClearDelivery ? (
										<Button
											type="button"
											variant="ghost"
											size="icon-sm"
											className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20"
											title="Usar precio calculado"
											aria-label="Usar precio calculado"
											disabled={isSubmitting}
											onClick={() => {
												form.setFieldValue(
													"deliveryAgreementDecision",
													"CLEAR",
												);
											}}
										>
											<Trash2 className="size-3.5" />
										</Button>
									) : null}
								</div>
							) : null
						}
						deliveryDetails={
							<>
								{needsDecision ? (
									<p className="text-xs font-medium">
										Cambiaron las condiciones de transporte. Revisá el acuerdo
										de precio.
									</p>
								) : null}
								{storedAgreement &&
								(needsDecision || values.deliveryAgreementDecision) ? (
									<details className="rounded-md border text-xs">
										<summary className="cursor-pointer px-3 py-2 font-medium">
											Acuerdo guardado
										</summary>
										<div className="space-y-2 border-t p-3">
											<p>
												{formatMoney(
													storedAgreement.amount,
													storedDeliveryCurrency ??
														pricePreview?.currency ??
														"USD",
												)}
											</p>
											{storedAgreement.reason ? (
												<p className="whitespace-pre-wrap break-words">
													Motivo: {storedAgreement.reason}
												</p>
											) : null}
											{needsDecision ||
											values.deliveryAgreementDecision !== "KEEP" ? (
												<Button
													type="button"
													variant="outline"
													size="sm"
													disabled={isSubmitting}
													onClick={() =>
														form.setFieldValue(
															"deliveryAgreementDecision",
															"KEEP",
														)
													}
												>
													Conservar importe guardado
												</Button>
											) : null}
										</div>
									</details>
								) : null}
								{values.deliveryAgreementDecision ? (
									<Button
										type="button"
										variant="link"
										size="sm"
										className="h-auto p-0 text-xs"
										disabled={isSubmitting}
										onClick={() =>
											form.setFieldValue("deliveryAgreementDecision", "")
										}
									>
										Deshacer decisión de precio
									</Button>
								) : null}
								<DraftRentalDeliveryReview
									form={form}
									delivery={delivery}
									canManageDelivery={canManageDelivery}
								/>
							</>
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
					</DraftRentalFinancialSummary>
					{editor === "equipment" && includeManualPriceAdjustment ? (
						<DraftRentalPricingDialog
							kind="equipment"
							defaultValues={{
								amount: values.targetTotal,
								reason: values.adjustmentReason,
							}}
							calculatedAmount={pricePreview?.pricing.calculated.total}
							currency={pricePreview?.currency ?? "USD"}
							onSave={(value) => {
								form.setFieldValue("targetTotal", value.amount);
								form.setFieldValue("adjustmentReason", value.reason);
							}}
							onClose={() => setEditor(null)}
						/>
					) : null}
					{editor === "delivery" && showDelivery && canManageDelivery ? (
						<DraftRentalPricingDialog
							kind="delivery"
							defaultValues={{
								amount:
									values.deliveryAgreementDecision === "SET"
										? values.deliveryAgreementAmount
										: (storedAgreement?.amount ?? ""),
								reason:
									values.deliveryAgreementDecision === "SET"
										? values.deliveryAgreementReason
										: (storedAgreement?.reason ?? ""),
							}}
							calculatedAmount={
								canClearDelivery ? delivery?.calculatedCharge : null
							}
							currency={
								delivery?.currency ??
								storedDeliveryCurrency ??
								pricePreview?.currency ??
								"USD"
							}
							onSave={(value) => {
								form.setFieldValue("deliveryAgreementDecision", "SET");
								form.setFieldValue("deliveryAgreementAmount", value.amount);
								form.setFieldValue("deliveryAgreementReason", value.reason);
							}}
							onClose={() => setEditor(null)}
						/>
					) : null}
				</>
			);
		},
	});
}
