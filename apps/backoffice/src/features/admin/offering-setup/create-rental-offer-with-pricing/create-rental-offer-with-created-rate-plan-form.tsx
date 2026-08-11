import { Button } from "@repo/ui/components/button";
import type React from "react";
import { RatePlanFields } from "@/features/pricing/rate-plan/rate-plan-fields";
import { useAppForm } from "@/shared/contexts/form.context";
import {
	type CreateRentalOfferWithCreatedRatePlanFormValues,
	createRentalOfferWithCreatedRatePlanFormDefaultValues,
	createRentalOfferWithCreatedRatePlanFormSchema,
} from "./create-rental-offer-with-pricing.schema";

type CreateRentalOfferWithCreatedRatePlanFormProps = {
	formId: string;
	isPending: boolean;
	defaultValues?: CreateRentalOfferWithCreatedRatePlanFormValues;
	submitLabel?: string;
	pendingLabel?: string;
	cancelLabel?: string;
	secondaryAction?: React.ReactNode;
	onSubmit: (
		values: CreateRentalOfferWithCreatedRatePlanFormValues,
	) => Promise<void> | void;
	onCancel: () => void;
};

export function CreateRentalOfferWithCreatedRatePlanForm({
	formId,
	isPending,
	defaultValues,
	submitLabel = "Crear y vincular plan",
	pendingLabel = "Creando y vinculando...",
	cancelLabel = "Cancelar",
	secondaryAction,
	onSubmit,
	onCancel,
}: CreateRentalOfferWithCreatedRatePlanFormProps): React.JSX.Element {
	const form = useAppForm({
		defaultValues:
			defaultValues ?? createRentalOfferWithCreatedRatePlanFormDefaultValues(),
		validators: { onSubmit: createRentalOfferWithCreatedRatePlanFormSchema },
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
				<RatePlanFields form={form} />
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
