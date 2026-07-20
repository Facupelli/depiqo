import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { withForm } from "@/shared/contexts/form.context";
import { customerProfileOnboardingFormDefaultValues } from "./customer-profile-onboarding-form.schema";

type FieldErrorIssue = {
	message: string;
};

export const Step5Contacts = withForm({
	defaultValues: customerProfileOnboardingFormDefaultValues(),
	props: {
		clearManualError: (_fieldName: string) => {},
		getFieldErrors: (_fieldName: string, _fieldErrors: unknown[] | undefined) =>
			[] as FieldErrorIssue[],
	},
	render: ({ clearManualError, form, getFieldErrors }) => (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-semibold tracking-tight">
					Contactos de referencia
				</h2>
				<p className="text-sm text-muted-foreground mt-1">
					Necesitamos al menos un contacto de referencia.
				</p>
			</div>

			<div className="space-y-4">
				<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					Contacto 1
				</p>
				<FieldGroup>
					<form.Field name="contact1Name">
						{(field) => {
							const errors = getFieldErrors(
								field.name,
								field.state.meta.errors,
							);
							const isInvalid = field.state.meta.isTouched && errors.length > 0;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Nombre completo</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										placeholder="María García"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => {
											clearManualError(field.name);
											field.handleChange(e.target.value);
										}}
										aria-invalid={isInvalid}
									/>
									{isInvalid ? <FieldError errors={errors} /> : null}
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="contact1Phone">
						{(field) => {
							const errors = getFieldErrors(
								field.name,
								field.state.meta.errors,
							);
							const isInvalid = field.state.meta.isTouched && errors.length > 0;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Teléfono</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										type="tel"
										placeholder="+34 612 345 678"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => {
											clearManualError(field.name);
											field.handleChange(e.target.value);
										}}
										aria-invalid={isInvalid}
									/>
									{isInvalid ? <FieldError errors={errors} /> : null}
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="contact1Relationship">
						{(field) => {
							const errors = getFieldErrors(
								field.name,
								field.state.meta.errors,
							);
							const isInvalid = field.state.meta.isTouched && errors.length > 0;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Vínculo</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										placeholder="Cónyuge, hermano/a, amigo/a..."
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => {
											clearManualError(field.name);
											field.handleChange(e.target.value);
										}}
										aria-invalid={isInvalid}
									/>
									{isInvalid ? <FieldError errors={errors} /> : null}
								</Field>
							);
						}}
					</form.Field>
				</FieldGroup>
			</div>

			<div className="space-y-4">
				<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					Contacto 2{" "}
					<span className="normal-case font-normal text-muted-foreground/70">
						(opcional)
					</span>
				</p>
				<FieldGroup>
					<form.Field name="contact2Name">
						{(field) => {
							const errors = getFieldErrors(
								field.name,
								field.state.meta.errors,
							);
							const isInvalid = field.state.meta.isTouched && errors.length > 0;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Nombre completo</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										placeholder="Carlos López"
										value={field.state.value ?? ""}
										onBlur={field.handleBlur}
										onChange={(e) => {
											clearManualError(field.name);
											field.handleChange(e.target.value);
										}}
										aria-invalid={isInvalid}
									/>
									{isInvalid ? <FieldError errors={errors} /> : null}
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="contact2Phone">
						{(field) => {
							const errors = getFieldErrors(
								field.name,
								field.state.meta.errors,
							);
							const isInvalid = field.state.meta.isTouched && errors.length > 0;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Teléfono</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										type="tel"
										placeholder="+34 612 345 678"
										value={field.state.value ?? ""}
										onBlur={field.handleBlur}
										onChange={(e) => {
											clearManualError(field.name);
											field.handleChange(e.target.value);
										}}
										aria-invalid={isInvalid}
									/>
									{isInvalid ? <FieldError errors={errors} /> : null}
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="contact2Relationship">
						{(field) => {
							const errors = getFieldErrors(
								field.name,
								field.state.meta.errors,
							);
							const isInvalid = field.state.meta.isTouched && errors.length > 0;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Vínculo</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										placeholder="Cónyuge, hermano/a, amigo/a..."
										value={field.state.value ?? ""}
										onBlur={field.handleBlur}
										onChange={(e) => {
											clearManualError(field.name);
											field.handleChange(e.target.value);
										}}
										aria-invalid={isInvalid}
									/>
									{isInvalid ? <FieldError errors={errors} /> : null}
								</Field>
							);
						}}
					</form.Field>
				</FieldGroup>
			</div>
		</div>
	),
});
