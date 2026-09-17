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
import { Loader2 } from "lucide-react";
import { useId, useState } from "react";
import { withForm } from "@/shared/contexts/form.context";
import { formatMoney } from "@/shared/utils/formatters";
import { useDraftRentalComposer } from "../draft-rental-composer.context";
import { createDraftRentalComposerDefaultValues } from "../draft-rental-composer.schema";

export const DraftRentalReviewPanel = createDraftRentalReviewPanel(false);
export const PriceAdjustableDraftRentalReviewPanel =
	createDraftRentalReviewPanel(true);

function createDraftRentalReviewPanel(includeManualPriceAdjustment: boolean) {
	return withForm({
		defaultValues: createDraftRentalComposerDefaultValues(),
		render: function Render({ form }) {
			const {
				state: { pricePreview },
				meta: {
					isPriceLoading,
					isPriceError,
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
			const calculatedTotal = pricePreview?.calculated.total;
			const finalTotal =
				pricePreview?.final.total ?? (targetTotal || calculatedTotal);
			const currency = pricePreview?.final.currency ?? "USD";
			const difference = pricePreview?.targetTotalAdjustment?.adjustmentTotal;
			const direction = pricePreview?.targetTotalAdjustment?.direction;
			const formattedAdjustment =
				difference && direction && direction !== "NONE"
					? `${direction === "DECREASE" ? "-" : "+"}${formatMoney(difference, currency)}`
					: null;
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
					<Card size="sm" className="gap-3 shadow-none">
						<CardHeader>
							<CardTitle className="text-base">Resumen</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="rounded-lg border bg-muted/20 p-3">
								<div className="space-y-2">
									<SummaryRow
										label="Precio calculado"
										value={
											calculatedTotal
												? formatMoney(calculatedTotal, currency)
												: "-"
										}
									/>
									{formattedAdjustment ? (
										<SummaryRow
											label="Ajuste manual"
											value={formattedAdjustment}
										/>
									) : null}
								</div>
								<div className="my-2.5 border-t" />
								<SummaryRow
									label="Precio final"
									value={finalTotal ? formatMoney(finalTotal, currency) : "-"}
									strong
								/>
								{isPriceLoading ? (
									<p className="mt-2.5 flex items-center gap-2 text-muted-foreground text-xs">
										<Loader2 className="size-3 animate-spin" /> Calculando
										precio...
									</p>
								) : null}
								{isPriceError ? (
									<p className="mt-2.5 text-destructive text-xs">
										No pudimos calcular el precio.
									</p>
								) : null}
							</div>
						</CardContent>
					</Card>

					{includeManualPriceAdjustment ? (
						<Card size="sm" className="gap-3 shadow-none">
							<CardHeader className="grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
								<CardTitle className="text-base">Ajustar precio</CardTitle>
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
														Total acordado
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
													{!field.state.meta.isValid && (
														<FieldError errors={field.state.meta.errors} />
													)}
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
										Definir total acordado
									</Button>
								)}
							</CardContent>
						</Card>
					) : null}

					{submitError ? (
						<p className="pt-1 text-sm text-destructive">{submitError}</p>
					) : null}

					<form.Subscribe
						selector={(state) => [state.canSubmit, state.isSubmitting] as const}
					>
						{([formCanSubmit, formIsSubmitting]) => (
							<Button
								type="button"
								className="mt-3 w-full"
								disabled={
									submitDisabled ||
									!formCanSubmit ||
									isSubmitting ||
									formIsSubmitting
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
			);
		},
	});
}

function SummaryRow({
	label,
	value,
	strong,
}: {
	label: string;
	value: string;
	strong?: boolean;
}) {
	return (
		<div className="flex items-center justify-between gap-3 text-sm">
			<span className="text-muted-foreground">{label}</span>
			<span
				className={
					strong
						? "font-semibold text-lg tabular-nums tracking-tight"
						: "font-medium tabular-nums"
				}
			>
				{value}
			</span>
		</div>
	);
}
