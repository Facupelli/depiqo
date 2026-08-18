import { Button } from "@repo/ui/components/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { useForm } from "@tanstack/react-form";
import { useId } from "react";
import {
	createRentalBudgetCustomerFormDefaults,
	type RentalBudgetCustomerFormValues,
	rentalBudgetCustomerFormSchema,
} from "./rental-budget-customer.schema";

interface RentalBudgetCustomerFormProps {
	isPending: boolean;
	onSubmit: (values: RentalBudgetCustomerFormValues) => Promise<void>;
	onCancel: () => void;
}

export function RentalBudgetCustomerForm({
	isPending,
	onSubmit,
	onCancel,
}: RentalBudgetCustomerFormProps) {
	const formId = useId();
	const form = useForm({
		defaultValues: createRentalBudgetCustomerFormDefaults(),
		validators: {
			onSubmit: rentalBudgetCustomerFormSchema,
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
				className="space-y-6"
			>
				<FieldGroup>
					<CustomerTextField
						form={form}
						name="fullName"
						label="Nombre completo"
						placeholder="Nombre y apellido"
						disabled={isPending}
					/>
					<CustomerTextField
						form={form}
						name="documentNumber"
						label="Documento"
						placeholder="DNI, CUIT o documento"
						disabled={isPending}
					/>
					<CustomerTextField
						form={form}
						name="address"
						label="Dirección"
						placeholder="Calle, número y localidad"
						disabled={isPending}
					/>
					<CustomerTextField
						form={form}
						name="phone"
						label="Teléfono"
						placeholder="+54 11 1234-5678"
						disabled={isPending}
					/>
				</FieldGroup>
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
					selector={(state) => [state.canSubmit, state.isSubmitting]}
				>
					{([canSubmit, isSubmitting]) => (
						<Button
							type="submit"
							form={formId}
							disabled={!canSubmit || isSubmitting || isPending}
						>
							{isSubmitting || isPending
								? "Generando presupuesto..."
								: "Ver presupuesto"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</>
	);
}

function CustomerTextField({
	form,
	name,
	label,
	placeholder,
	disabled,
}: {
	form: ReturnType<typeof useForm>;
	name: keyof RentalBudgetCustomerFormValues;
	label: string;
	placeholder: string;
	disabled: boolean;
}) {
	return (
		<form.Field name={name}>
			{(field) => {
				const isInvalid =
					field.state.meta.isTouched && !field.state.meta.isValid;

				return (
					<Field data-invalid={isInvalid}>
						<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
						<Input
							id={field.name}
							name={field.name}
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
							placeholder={placeholder}
							aria-invalid={isInvalid}
							disabled={disabled}
						/>
						{isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
					</Field>
				);
			}}
		</form.Field>
	);
}
