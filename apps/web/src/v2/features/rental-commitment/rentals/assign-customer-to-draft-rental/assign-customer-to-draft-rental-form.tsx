import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { useAppForm } from "@/shared/contexts/form.context";
import { RentalCustomerSelector } from "@/v2/features/tenant-management/customer/components/rental-customer-selector";
import {
	type AssignCustomerToDraftRentalFormValues,
	assignCustomerToDraftRentalFormSchema,
	createAssignCustomerToDraftRentalDefaultValues,
} from "./assign-customer-to-draft-rental.schema";

type AssignCustomerToDraftRentalFormProps = {
	defaultValues?: AssignCustomerToDraftRentalFormValues;
	onSubmit: (values: AssignCustomerToDraftRentalFormValues) => Promise<void>;
	onCancel: () => void;
	isPending: boolean;
};

export function AssignCustomerToDraftRentalForm({
	defaultValues,
	onSubmit,
	onCancel,
	isPending,
}: AssignCustomerToDraftRentalFormProps) {
	const formId = useId();
	const form = useAppForm({
		defaultValues:
			defaultValues ?? createAssignCustomerToDraftRentalDefaultValues(),
		validators: {
			onSubmit: assignCustomerToDraftRentalFormSchema,
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
			>
				<form.Field name="customerId">
					{(field) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;

						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel>Cliente</FieldLabel>
								<RentalCustomerSelector
									value={field.state.value}
									onValueChange={field.handleChange}
									placeholder="Seleccioná un cliente"
									allowEmpty={false}
								/>
								{isInvalid ? (
									<FieldError errors={field.state.meta.errors} />
								) : null}
							</Field>
						);
					}}
				</form.Field>
			</form>

			<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={isPending}
				>
					Cancelar
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
							disabled={!canSubmit || !isDirty || isPending}
						>
							{isSubmitting || isPending ? "Asignando..." : "Asignar cliente"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</>
	);
}
