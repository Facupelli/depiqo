import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { withForm } from "@/shared/contexts/form.context";
import { customerProfileOnboardingFormDefaultValues } from "./customer-profile-onboarding-form.schema";

export const Step4Acquisition = withForm({
	defaultValues: customerProfileOnboardingFormDefaultValues(),
	props: {
		tenantName: "",
	},
	render: ({ form, tenantName }) => (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-semibold tracking-tight">
					Redes y referencia
				</h2>
				<p className="text-sm text-muted-foreground mt-1">
					Queremos entender mejor tu perfil antes de aprobar la cuenta.
				</p>
			</div>

			<FieldGroup>
				<form.Field name="instagram">
					{(field) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Instagram</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									placeholder="tuusuario"
									value={field.state.value ?? ""}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									aria-invalid={isInvalid}
								/>
								<FieldDescription>
									Ingresá tu usuario o el link a tu perfil. Lo guardamos como
									usuario.
								</FieldDescription>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
				</form.Field>

				<form.Field name="knowsExistingCustomer">
					{(field) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel>
									¿Conocés a algún cliente de {tenantName}?
								</FieldLabel>
								<Select
									value={field.state.value ? "yes" : "no"}
									onValueChange={(value) => field.handleChange(value === "yes")}
								>
									<SelectTrigger aria-invalid={isInvalid}>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="no">No</SelectItem>
										<SelectItem value="yes">Sí</SelectItem>
									</SelectContent>
								</Select>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
				</form.Field>

				<form.Subscribe
					selector={(state) => state.values.knowsExistingCustomer}
				>
					{(knowsExistingCustomer) =>
						knowsExistingCustomer ? (
							<form.Field name="knownCustomerName">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>
												Nombre del cliente
											</FieldLabel>
											<Input
												id={field.name}
												name={field.name}
												placeholder="Nombre y apellido"
												value={field.state.value ?? ""}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												aria-invalid={isInvalid}
											/>
											{isInvalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							</form.Field>
						) : null
					}
				</form.Subscribe>
			</FieldGroup>
		</div>
	),
});
