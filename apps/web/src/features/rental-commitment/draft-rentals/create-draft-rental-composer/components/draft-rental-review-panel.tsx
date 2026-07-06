import { useStore } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { withForm } from "@/shared/contexts/form.context";
import { formatMoney } from "@/shared/utils/formatters";
import { useDraftRentalComposer } from "../create-draft-rental-composer.context";
import { createDraftRentalComposerDefaultValues } from "../create-draft-rental-composer.schema";

export const DraftRentalReviewPanel = withForm({
	defaultValues: createDraftRentalComposerDefaultValues(),
	render: function Render({ form }) {
		const {
			pricePreview,
			isPriceLoading,
			isPriceError,
			isSubmitting,
			branchMissing,
		} = useDraftRentalComposer();
		const values = useStore(form.store, (state) => state.values);
		const calculatedTotal = pricePreview?.calculated.total;
		const finalTotal =
			pricePreview?.final.total ?? (values.targetTotal || calculatedTotal);
		const currency = pricePreview?.final.currency ?? "USD";
		const difference = pricePreview?.manualPricingAdjustment?.adjustmentTotal;
		const direction = pricePreview?.manualPricingAdjustment?.direction;
		const canSubmit =
			!branchMissing &&
			values.branchId.length > 0 &&
			values.periodStartDate.length > 0 &&
			values.periodEndDate.length > 0 &&
			values.selectedOffers.length > 0 &&
			(values.fulfillmentMethod !== "DELIVERY" ||
				(values.deliveryDetails.addressLine1.trim().length > 0 &&
					values.deliveryDetails.city.trim().length > 0));

		return (
			<Card className="shadow-xs">
				<CardHeader>
					<CardTitle className="text-base">Resumen y guardado</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2 rounded-lg border bg-muted/20 p-3">
						<SummaryRow
							label="Precio calculado"
							value={
								calculatedTotal ? formatMoney(calculatedTotal, currency) : "—"
							}
						/>
						<SummaryRow
							label="Precio final"
							value={finalTotal ? formatMoney(finalTotal, currency) : "—"}
							strong
						/>
						<SummaryRow
							label="Diferencia"
							value={
								difference
									? `${direction === "DECREASE" ? "−" : "+"}${formatMoney(difference, currency)}`
									: "—"
							}
						/>
						{isPriceLoading ? (
							<p className="flex items-center gap-2 text-muted-foreground text-xs">
								<Loader2 className="size-3 animate-spin" /> Calculando precio...
							</p>
						) : null}
						{isPriceError ? (
							<p className="text-destructive text-xs">
								No pudimos calcular el precio.
							</p>
						) : null}
					</div>

					<form.Field name="targetTotal">
						{(field: any) => (
							<Field data-invalid={!field.state.meta.isValid}>
								<FieldLabel htmlFor={field.name}>
									Precio final deseado
								</FieldLabel>
								<Input
									id={field.name}
									inputMode="decimal"
									placeholder="Opcional"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
								/>
								{!field.state.meta.isValid && (
									<FieldError errors={field.state.meta.errors} />
								)}
							</Field>
						)}
					</form.Field>

					<form.Field name="adjustmentReason">
						{(field: any) => (
							<Field>
								<FieldLabel htmlFor={field.name}>Motivo del ajuste</FieldLabel>
								<Textarea
									id={field.name}
									placeholder="Opcional"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
									className="min-h-20"
								/>
							</Field>
						)}
					</form.Field>

					<form.Subscribe
						selector={(state) => [state.canSubmit, state.isSubmitting] as const}
					>
						{([formCanSubmit, formIsSubmitting]) => (
							<Button
								type="button"
								className="w-full"
								disabled={
									!canSubmit ||
									!formCanSubmit ||
									isSubmitting ||
									formIsSubmitting
								}
								onClick={() => form.handleSubmit()}
							>
								{isSubmitting || formIsSubmitting
									? "Guardando..."
									: "Crear borrador"}
							</Button>
						)}
					</form.Subscribe>
				</CardContent>
			</Card>
		);
	},
});

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
			<span className={strong ? "font-semibold" : "font-medium"}>{value}</span>
		</div>
	);
}
