import { Button } from "@repo/ui/components/button";
import type React from "react";
import { useAppForm } from "@/shared/contexts/form.context";
import { RatePlanFields } from "../rate-plan/rate-plan-fields";
import {
	type CreateRatePlanBaseFormValues,
	createRatePlanBaseFormDefaultValues,
	createRatePlanBaseFormSchema,
} from "./create-rate-plan.schema";

type CreateRatePlanFormProps = {
	formId: string;
	isPending: boolean;
	defaultValues?: CreateRatePlanBaseFormValues;
	submitLabel?: string;
	pendingLabel?: string;
	cancelLabel?: string;
	onSubmit: (values: CreateRatePlanBaseFormValues) => Promise<void> | void;
	onCancel: () => void;
};

export function CreateRatePlanForm({
	formId,
	isPending,
	defaultValues,
	submitLabel = "Crear plan",
	pendingLabel = "Creando...",
	cancelLabel = "Cancelar",
	onSubmit,
	onCancel,
}: CreateRatePlanFormProps): React.JSX.Element {
	const form = useAppForm({
		defaultValues: defaultValues ?? createRatePlanBaseFormDefaultValues(),
		validators: { onSubmit: createRatePlanBaseFormSchema },
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
				<RatePlanFields form={form} />
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
