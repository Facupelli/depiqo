import { Button } from "@repo/ui/components/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@repo/ui/components/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { useForm } from "@tanstack/react-form";
import type React from "react";
import {
	type PricePlanSelectionFormValues,
	pricePlanSelectionFormDefaultValues,
	pricePlanSelectionFormSchema,
} from "./price-plan-selection.schema";

export interface PricePlanOption {
	id: string;
	name: string;
}

interface PricePlanSelectionFormProps {
	formId: string;
	ratePlanOptions: PricePlanOption[];
	defaultValues?: PricePlanSelectionFormValues;
	isPending: boolean;
	submitLabel?: string;
	pendingLabel?: string;
	cancelLabel?: string;
	secondaryAction?: React.ReactNode;
	onSubmit: (values: PricePlanSelectionFormValues) => Promise<void> | void;
	onCancel: () => void;
}

export function PricePlanSelectionForm({
	formId,
	ratePlanOptions,
	defaultValues = pricePlanSelectionFormDefaultValues(),
	isPending,
	submitLabel = "Asociar plan",
	pendingLabel = "Asociando...",
	cancelLabel = "Cancelar",
	secondaryAction,
	onSubmit,
	onCancel,
}: PricePlanSelectionFormProps) {
	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: pricePlanSelectionFormSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		},
	});

	return (
		<>
			<form
				id={formId}
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-4"
			>
				<FieldGroup>
					<form.Field name="ratePlanId">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel>Plan de tarifa</FieldLabel>
									<Select
										value={field.state.value}
										onValueChange={(value) => {
											if (value) field.handleChange(value);
										}}
										disabled={isPending || ratePlanOptions.length === 0}
									>
										<SelectTrigger aria-invalid={isInvalid}>
											<SelectValue placeholder="Selecciona un plan" />
										</SelectTrigger>
										<SelectContent>
											{ratePlanOptions.map((ratePlan) => (
												<SelectItem key={ratePlan.id} value={ratePlan.id}>
													{ratePlan.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{ratePlanOptions.length === 0 && (
										<p className="text-muted-foreground text-sm">
											No hay planes de tarifa disponibles para asociar.
										</p>
									)}
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>
				</FieldGroup>
			</form>

			<div className="flex justify-end gap-2">
				{secondaryAction}
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={isPending}
				>
					{cancelLabel}
				</Button>
				<form.Subscribe
					selector={(state) => [
						state.canSubmit,
						state.isSubmitting,
						state.isDirty,
					]}
				>
					{([canSubmit, isSubmitting, isDirty]) => (
						<Button
							type="submit"
							form={formId}
							disabled={
								!canSubmit ||
								!isDirty ||
								isSubmitting ||
								isPending ||
								ratePlanOptions.length === 0
							}
						>
							{isSubmitting || isPending ? pendingLabel : submitLabel}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</>
	);
}
