import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { withForm } from "@/shared/contexts/form.context";
import { customerProfileOnboardingFormDefaultValues } from "./customer-profile-onboarding-form.schema";

export const Step1Personal = withForm({
	defaultValues: customerProfileOnboardingFormDefaultValues(),
	render: ({ form }) => (
		<div className="space-y-5">
			<div>
				<h2 className="text-xl font-semibold tracking-tight">
					Información personal
				</h2>
				<p className="text-sm text-muted-foreground mt-1">
					Completá tus datos básicos para comenzar.
				</p>
			</div>

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
									placeholder="Juan Pérez"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									aria-invalid={isInvalid}
								/>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
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
								<FieldLabel htmlFor={field.name}>Número de teléfono</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									type="tel"
									placeholder="+34 612 345 678"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									aria-invalid={isInvalid}
								/>
								<FieldDescription>
									Incluí el código de país y el prefijo. Ej: +34 612 345 678.
								</FieldDescription>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
				</form.Field>

				<form.Field name="birthDate">
					{(field) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>
									Fecha de nacimiento
								</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									type="date"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									aria-invalid={isInvalid}
								/>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
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
								<FieldLabel htmlFor={field.name}>DNI o NIE</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									placeholder="12345678Z"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									aria-invalid={isInvalid}
								/>
								<FieldDescription>
									Ingresá tu documento sin espacios.
								</FieldDescription>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
				</form.Field>
			</FieldGroup>
		</div>
	),
});
