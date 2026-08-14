import { Button } from "@repo/ui/components/button";
import type React from "react";
import { PricePlanFields } from "@/modules/pricing/price-plans/public";
import { useAppForm } from "@/shared/contexts/form.context";
import {
	type CreateBranchAvailabilityWithNewPricePlanFormValues,
	createBranchAvailabilityWithNewPricePlanFormDefaultValues,
	createBranchAvailabilityWithNewPricePlanFormSchema,
} from "./add-branch-availability.schema";

type CreateBranchAvailabilityWithNewPricePlanFormProps = {
	formId: string;
	isPending: boolean;
	defaultValues?: CreateBranchAvailabilityWithNewPricePlanFormValues;
	submitLabel?: string;
	pendingLabel?: string;
	cancelLabel?: string;
	secondaryAction?: React.ReactNode;
	onSubmit: (
		values: CreateBranchAvailabilityWithNewPricePlanFormValues,
	) => Promise<void> | void;
	onCancel: () => void;
};

export function CreateBranchAvailabilityWithNewPricePlanForm({
	formId,
	isPending,
	defaultValues,
	submitLabel = "Crear y vincular plan",
	pendingLabel = "Creando y vinculando...",
	cancelLabel = "Cancelar",
	secondaryAction,
	onSubmit,
	onCancel,
}: CreateBranchAvailabilityWithNewPricePlanFormProps): React.JSX.Element {
	const form = useAppForm({
		defaultValues:
			defaultValues ??
			createBranchAvailabilityWithNewPricePlanFormDefaultValues(),
		validators: {
			onSubmit: createBranchAvailabilityWithNewPricePlanFormSchema,
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
				className="space-y-8"
			>
				<PricePlanFields form={form} />
			</form>

			<div className="mt-8 flex justify-end gap-3 border-t pt-4">
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
