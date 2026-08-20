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
					<form.Field name="fullName">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Nombre completo</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) =>
											field.handleChange(event.target.value)
										}
										placeholder="Nombre y apellido"
										aria-invalid={isInvalid}
										disabled={isPending}
									/>
									{isInvalid ? (
										<FieldError errors={field.state.meta.errors} />
									) : null}
								</Field>
							);
						}}
					</form.Field>
					<form.Field name="documentNumber">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Documento</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) =>
											field.handleChange(event.target.value)
										}
										placeholder="DNI, CUIT o documento"
										aria-invalid={isInvalid}
										disabled={isPending}
									/>
									{isInvalid ? (
										<FieldError errors={field.state.meta.errors} />
									) : null}
								</Field>
							);
						}}
					</form.Field>
					<form.Field name="address">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Dirección</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) =>
											field.handleChange(event.target.value)
										}
										placeholder="Calle, número y localidad"
										aria-invalid={isInvalid}
										disabled={isPending}
									/>
									{isInvalid ? (
										<FieldError errors={field.state.meta.errors} />
									) : null}
								</Field>
							);
						}}
					</form.Field>
					<form.Field name="phone">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Teléfono</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) =>
											field.handleChange(event.target.value)
										}
										placeholder="+54 11 1234-5678"
										aria-invalid={isInvalid}
										disabled={isPending}
									/>
									{isInvalid ? (
										<FieldError errors={field.state.meta.errors} />
									) : null}
								</Field>
							);
						}}
					</form.Field>
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
