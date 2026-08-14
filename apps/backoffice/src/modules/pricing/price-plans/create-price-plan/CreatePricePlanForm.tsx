import { Button } from "@repo/ui/components/button";
import type React from "react";
import { useAppForm } from "@/shared/contexts/form.context";
import {
	type CreatePricePlanBaseFormValues,
	createPricePlanBaseFormDefaultValues,
	createPricePlanBaseFormSchema,
} from "./create-price-plan.schema";
import { PricePlanFields } from "./PricePlanFields";

type CreatePricePlanFormProps = {
	formId: string;
	isPending: boolean;
	defaultValues?: CreatePricePlanBaseFormValues;
	submitLabel?: string;
	pendingLabel?: string;
	cancelLabel?: string;
	onSubmit: (values: CreatePricePlanBaseFormValues) => Promise<void> | void;
	onCancel: () => void;
};

export function CreatePricePlanForm({
	formId,
	isPending,
	defaultValues,
	submitLabel = "Crear plan",
	pendingLabel = "Creando...",
	cancelLabel = "Cancelar",
	onSubmit,
	onCancel,
}: CreatePricePlanFormProps): React.JSX.Element {
	const form = useAppForm({
		defaultValues: defaultValues ?? createPricePlanBaseFormDefaultValues(),
		validators: { onSubmit: createPricePlanBaseFormSchema },
		onSubmit: async ({ value }) => onSubmit(value),
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
				<PricePlanFields form={form} />
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
