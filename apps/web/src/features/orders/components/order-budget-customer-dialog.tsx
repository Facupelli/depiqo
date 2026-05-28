import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	orderBudgetCustomerFormDefaults,
	orderBudgetCustomerFormSchema,
	toOrderBudgetRequestDto,
} from "@/features/orders/schemas/order-budget-customer-form.schema";

const formId = "order-budget-customer";

export function OrderBudgetCustomerDialog({
	open,
	onOpenChange,
	onSubmit,
	isOpeningBudget,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (
		values: ReturnType<typeof toOrderBudgetRequestDto>,
	) => Promise<void>;
	isOpeningBudget: boolean;
}) {
	const form = useForm({
		defaultValues: orderBudgetCustomerFormDefaults,
		validators: {
			onSubmit: orderBudgetCustomerFormSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(toOrderBudgetRequestDto(value));
		},
	});

	function handleOpenChange(nextOpen: boolean) {
		onOpenChange(nextOpen);

		if (!nextOpen) {
			form.reset();
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Datos para el presupuesto</DialogTitle>
					<DialogDescription>
						Este borrador no tiene un cliente vinculado. Puedes generar el
						presupuesto con campos vacios o completar estos datos para que se
						incluyan en el PDF.
					</DialogDescription>
				</DialogHeader>

				{open ? (
					<>
						<form
							id={formId}
							onSubmit={(event) => {
								event.preventDefault();
								event.stopPropagation();
								void form.handleSubmit();
							}}
							className="space-y-6"
						>
							<FieldGroup>
								<form.Field name="fullName">
									{(field) => (
										<Field>
											<FieldLabel htmlFor={field.name}>
												Nombre completo
											</FieldLabel>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) =>
													field.handleChange(event.target.value)
												}
												placeholder="Ej. Juan Perez"
											/>
											<FieldError errors={field.state.meta.errors} />
										</Field>
									)}
								</form.Field>

								<form.Field name="documentNumber">
									{(field) => (
										<Field>
											<FieldLabel htmlFor={field.name}>Documento</FieldLabel>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) =>
													field.handleChange(event.target.value)
												}
												placeholder="Ej. 30111222"
											/>
											<FieldError errors={field.state.meta.errors} />
										</Field>
									)}
								</form.Field>

								<form.Field name="address">
									{(field) => (
										<Field>
											<FieldLabel htmlFor={field.name}>Dirección</FieldLabel>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) =>
													field.handleChange(event.target.value)
												}
												placeholder="Ej. Av. Corrientes 1234"
											/>
											<FieldError errors={field.state.meta.errors} />
										</Field>
									)}
								</form.Field>

								<form.Field name="phone">
									{(field) => (
										<Field>
											<FieldLabel htmlFor={field.name}>Teléfono</FieldLabel>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) =>
													field.handleChange(event.target.value)
												}
												placeholder="Ej. 11 5555 5555"
											/>
											<FieldError errors={field.state.meta.errors} />
										</Field>
									)}
								</form.Field>
							</FieldGroup>
						</form>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => handleOpenChange(false)}
								disabled={isOpeningBudget}
							>
								Cancelar
							</Button>
							<Button
								type="button"
								onClick={() => void form.handleSubmit()}
								disabled={isOpeningBudget}
							>
								{isOpeningBudget
									? "Abriendo presupuesto..."
									: "Ver presupuesto"}
							</Button>
						</DialogFooter>
					</>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
