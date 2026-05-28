import { useForm } from "@tanstack/react-form";
import type React from "react";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useAppForm } from "@/shared/contexts/form.context";
import { RatePlanActiveField } from "../rate-plan/rate-plan-active-field";
import { RatePlanFields } from "../rate-plan/rate-plan-fields";
import {
	type CreateRatePlanFormValues,
	createRatePlanFormDefaultValues,
	createRatePlanFormSchema,
} from "./create-rate-plan.schema";

type CreateRatePlanFormProps = {
	formId: string;
	isPending: boolean;
	defaultValues?: CreateRatePlanFormValues;
	submitLabel?: string;
	pendingLabel?: string;
	cancelLabel?: string;
	onSubmit: (values: CreateRatePlanFormValues) => Promise<void> | void;
	onCancel: () => void;
};

export function CreateRatePlanForm({
	formId,
	defaultValues,
	isPending,
	submitLabel = "Crear plan",
	pendingLabel = "Creando...",
	cancelLabel = "Cancelar",
	onSubmit,
	onCancel,
}: CreateRatePlanFormProps): React.JSX.Element {
	const form = useAppForm({
		defaultValues: defaultValues ?? createRatePlanFormDefaultValues(),
		validators: { onSubmit: createRatePlanFormSchema },
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
				className="space-y-8"
			>
				<FieldGroup className="grid gap-5 md:grid-cols-2">
					<RatePlanFields form={form} />
					<RatePlanActiveField form={form} />
				</FieldGroup>
			</form>

			<div className="mt-8 flex justify-end gap-3 border-t pt-4">
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
							disabled={!canSubmit || !isDirty || isSubmitting || isPending}
						>
							{isSubmitting || isPending ? pendingLabel : submitLabel}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</>
	);
}
