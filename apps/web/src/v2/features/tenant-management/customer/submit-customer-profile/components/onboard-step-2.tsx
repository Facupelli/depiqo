import type { useUploadFile } from "@better-upload/client";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ImageUploadField } from "@/shared/components/image-uploader";
import { withForm } from "@/shared/contexts/form.context";
import { customerProfileOnboardingFormDefaultValues } from "./customer-profile-onboarding-form.schema";

type FieldErrorIssue = {
	message: string;
};

export const Step2Document = withForm({
	defaultValues: customerProfileOnboardingFormDefaultValues(),
	props: {
		isUploading: false,
		clearManualError: (_fieldName: string) => {},
		getFieldErrors: (_fieldName: string, _fieldErrors: unknown[] | undefined) =>
			[] as FieldErrorIssue[],
		uploader: null as unknown as ReturnType<typeof useUploadFile>,
	},
	render: ({ clearManualError, form, getFieldErrors, uploader }) => {
		return (
			<div className="space-y-5">
				<div>
					<h2 className="text-xl font-semibold tracking-tight">
						Documento y domicilio
					</h2>
					<p className="text-sm text-muted-foreground mt-1">
						Subí una foto de tu documento y completá tu dirección.
					</p>
				</div>

				<FieldGroup>
					<form.Field name="currentIdentityDocumentPath">
						{(field) =>
							field.state.value ? (
								<div className="rounded-md border px-3 py-2 text-sm">
									<div className="flex items-center justify-between gap-3">
										<div>
											<p className="font-medium">Documento actual cargado</p>
											<p className="text-muted-foreground break-all">
												{field.state.value}
											</p>
										</div>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => field.handleChange(null)}
										>
											Quitar
										</Button>
									</div>
									<p className="mt-2 text-xs text-muted-foreground">
										Si no subís un archivo nuevo, vamos a conservar este
										documento para reenviar el formulario.
									</p>
								</div>
							) : null
						}
					</form.Field>

					<form.Field name="identityDocumentFile">
						{(field) => {
							const errors = getFieldErrors(
								field.name,
								field.state.meta.errors,
							);
							const isInvalid = field.state.meta.isTouched && errors.length > 0;

							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Documento</FieldLabel>
									<ImageUploadField
										uploader={uploader}
										value={field.state.value}
										onChange={(file) => {
											clearManualError(field.name);
											field.handleChange(file);
										}}
										id={field.name}
										accept=".pdf,image/jpeg,image/png,image/webp"
										description={{
											fileTypes: "PDF, JPEG, PNG, WEBP",
											maxFileSize: "3MB",
										}}
									/>
									{isInvalid ? <FieldError errors={errors} /> : null}
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="address">
						{(field) => {
							const errors = getFieldErrors(
								field.name,
								field.state.meta.errors,
							);
							const isInvalid = field.state.meta.isTouched && errors.length > 0;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Domicilio real</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										placeholder="Av. Corrientes 1234, Piso 2"
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

					<form.Field name="city">
						{(field) => {
							const errors = getFieldErrors(
								field.name,
								field.state.meta.errors,
							);
							const isInvalid = field.state.meta.isTouched && errors.length > 0;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Localidad</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										placeholder="Madrid"
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

					<form.Field name="stateRegion">
						{(field) => {
							const errors = getFieldErrors(
								field.name,
								field.state.meta.errors,
							);
							const isInvalid = field.state.meta.isTouched && errors.length > 0;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>
										Provincia / Región
									</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										placeholder="Comunidad de Madrid"
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

					<form.Field name="country">
						{(field) => {
							const errors = getFieldErrors(
								field.name,
								field.state.meta.errors,
							);
							const isInvalid = field.state.meta.isTouched && errors.length > 0;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>País</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										placeholder="España"
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
		);
	},
});
