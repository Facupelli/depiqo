import type React from "react";
import { Button } from "@repo/ui/components/button";
import { useAppForm } from "@/shared/contexts/form.context";
import { RatePlanFields } from "../../rate-plan/rate-plan-fields";
import {
	type CreateRatePlanAndAttachToRentalOfferFormValues,
	createRatePlanAndAttachToRentalOfferFormDefaultValues,
	createRatePlanAndAttachToRentalOfferFormSchema,
} from "./create-rate-plan-and-attach-to-rental-offer.schema";

type CreateRatePlanAndAttachFormProps = {
	formId: string;
	isPending: boolean;
	catalogRentalOfferId: string;
	defaultValues?: CreateRatePlanAndAttachToRentalOfferFormValues;
	submitLabel?: string;
	pendingLabel?: string;
	cancelLabel?: string;
	onSubmit: (
		values: CreateRatePlanAndAttachToRentalOfferFormValues,
		context: { catalogRentalOfferId: string },
	) => Promise<void> | void;
	onCancel: () => void;
};

export function CreateRatePlanAndAttachForm({
	formId,
	isPending,
	catalogRentalOfferId,
	defaultValues,
	submitLabel = "Crear y vincular plan",
	pendingLabel = "Creando...",
	cancelLabel = "Cancelar",
	onSubmit,
	onCancel,
}: CreateRatePlanAndAttachFormProps): React.JSX.Element {
	const form = useAppForm({
		defaultValues:
			defaultValues ?? createRatePlanAndAttachToRentalOfferFormDefaultValues(),
		validators: { onSubmit: createRatePlanAndAttachToRentalOfferFormSchema },
		onSubmit: async ({ value }) => {
			await onSubmit(value, { catalogRentalOfferId });
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
