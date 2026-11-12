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
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import { useId } from "react";
import { z } from "zod";
import { useAppForm } from "@/shared/contexts/form.context";
import { formatMoney } from "@/shared/utils/formatters";
import {
	draftRentalDeliveryAmountSchema,
	draftRentalEquipmentAmountSchema,
} from "../draft-rental-composer.schema";

type DraftRentalPricingValues = {
	amount: string;
	reason: string;
};

type PricingDialogProps = {
	kind: "equipment" | "delivery";
	defaultValues: DraftRentalPricingValues;
	calculatedAmount: string | null | undefined;
	currency: string;
	onSave: (value: DraftRentalPricingValues) => void;
	onClose: () => void;
};

// Mounted only while open: defaults are a snapshot of the composer, not synchronized state.
export function DraftRentalPricingDialog({
	kind,
	defaultValues,
	calculatedAmount,
	currency,
	onSave,
	onClose,
}: PricingDialogProps) {
	const id = useId();
	const isEquipment = kind === "equipment";
	const schema = z
		.object({
			amount: z.string(),
			reason: z.string(),
		})
		.superRefine((value, context) => {
			const result = (
				isEquipment
					? draftRentalEquipmentAmountSchema
					: draftRentalDeliveryAmountSchema
			).safeParse(value.amount);
			if (!result.success || !value.amount.trim()) {
				context.addIssue({
					code: "custom",
					path: ["amount"],
					message:
						result.error?.issues[0]?.message ??
						"Ingresá un total de equipos positivo y con hasta dos decimales.",
				});
			}
		});
	const form = useAppForm({
		defaultValues,
		validators: { onChange: schema, onBlur: schema, onSubmit: schema },
		onSubmit: ({ value }) => {
			onSave(value);
			onClose();
		},
	});
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{isEquipment
							? "Ajustar equipos"
							: "Acordar precio de entrega y retiro"}
					</DialogTitle>
					<DialogDescription>
						{isEquipment
							? "Definí el total de equipos que pagará el cliente."
							: "Definí el importe combinado de entrega y retiro que pagará el cliente."}{" "}
						Los cambios se aplican al borrador al guardar.
					</DialogDescription>
				</DialogHeader>
				<div className="flex justify-between gap-4 rounded-md bg-muted px-3 py-3 text-sm">
					<span>Precio calculado</span>
					<span className="font-medium tabular-nums">
						{calculatedAmount != null
							? formatMoney(calculatedAmount, currency)
							: "No disponible"}
					</span>
				</div>
				<form
					id={id}
					className="space-y-4"
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						void form.handleSubmit();
					}}
				>
					<form.Field name="amount">
						{(field) => (
							<Field data-invalid={!field.state.meta.isValid}>
								<FieldLabel htmlFor={`${id}-amount`}>
									{isEquipment ? "Total de equipos" : "Importe"}
								</FieldLabel>
								<Input
									id={`${id}-amount`}
									inputMode="decimal"
									placeholder="0,00"
									value={field.state.value}
									onChange={(event) => field.handleChange(event.target.value)}
									onBlur={field.handleBlur}
									aria-invalid={!field.state.meta.isValid}
								/>
								<FieldError errors={field.state.meta.errors} />
							</Field>
						)}
					</form.Field>
					<form.Field name="reason">
						{(field) => (
							<Field>
								<FieldLabel htmlFor={`${id}-reason`}>
									Motivo (opcional)
								</FieldLabel>
								<Textarea
									id={`${id}-reason`}
									className="min-h-16"
									value={field.state.value}
									onChange={(event) => field.handleChange(event.target.value)}
									onBlur={field.handleBlur}
								/>
							</Field>
						)}
					</form.Field>
					{!isEquipment && calculatedAmount == null ? (
						<p className="text-xs text-muted-foreground">
							No hay un precio automático disponible. El importe acordado
							permite definir el precio de entrega y retiro.
						</p>
					) : null}
				</form>
				<DialogFooter>
					<Button type="button" variant="outline" onClick={onClose}>
						Cancelar
					</Button>
					<form.Subscribe selector={(state) => state.canSubmit}>
						{(canSubmit) => (
							<Button type="submit" form={id} disabled={!canSubmit}>
								Guardar
							</Button>
						)}
					</form.Subscribe>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
