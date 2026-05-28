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
import {
	CUSTOMER_PROFILE_LEAD_SOURCE_LABELS,
	CUSTOMER_PROFILE_LEAD_SOURCE_OPTIONS,
	customerFormValues,
} from "../../schemas/onboard-form.schema";

export const Step4Acquisition = withForm({
	defaultValues: customerFormValues,
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
					Queremos entender mejor cómo llegaste a nosotros.
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

				<form.Field name="heardAboutUs">
					{(field) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel>¿Dónde nos conociste?</FieldLabel>
								<Select
									value={field.state.value}
									onValueChange={(value) =>
										field.handleChange(value as typeof field.state.value)
									}
									items={CUSTOMER_PROFILE_LEAD_SOURCE_OPTIONS.map((option) => ({
										value: option,
										label: CUSTOMER_PROFILE_LEAD_SOURCE_LABELS[option],
									}))}
								>
									<SelectTrigger aria-invalid={isInvalid}>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{CUSTOMER_PROFILE_LEAD_SOURCE_OPTIONS.map((option) => (
											<SelectItem key={option} value={option}>
												{CUSTOMER_PROFILE_LEAD_SOURCE_LABELS[option]}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
				</form.Field>

				<form.Subscribe selector={(state) => state.values.heardAboutUs}>
					{(heardAboutUs) =>
						heardAboutUs === "OTHER" ? (
							<form.Field name="heardAboutUsOther">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>
												Contanos dónde
											</FieldLabel>
											<Input
												id={field.name}
												name={field.name}
												placeholder="Ej: una recomendación, una feria..."
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
