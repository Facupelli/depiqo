import { useForm } from "@tanstack/react-form";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buildR2PublicUrl } from "@/lib/r2-public-url";
import type {
	UserProfileDirtyValues,
	UserProfileFormValues,
} from "../schemas/user-profile-form.schema";
import { userProfileFormSchema } from "../schemas/user-profile-form.schema";

interface UserProfileFormProps {
	defaultValues: UserProfileFormValues;
	mode: "create" | "update";
	isPending: boolean;
	onSubmit: (payload: {
		values: UserProfileFormValues;
		dirtyValues: UserProfileDirtyValues;
	}) => Promise<void> | void;
	feedbackMessage?: ReactNode;
	errorMessage?: ReactNode;
}

const formId = "user-profile-settings-form";

const trackedFields = [
	"fullName",
	"documentNumber",
	"phone",
	"address",
	"signUrl",
] as const;

export function UserProfileForm({
	defaultValues,
	mode,
	isPending,
	onSubmit,
	feedbackMessage,
	errorMessage,
}: UserProfileFormProps) {
	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: userProfileFormSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit({
				values: value,
				dirtyValues: getDirtyValues(value, defaultValues),
			});
		},
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>Perfil del titular</CardTitle>
				<CardDescription>
					Define los datos y la firma que el sistema usara para generar los
					contratos del rental.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{feedbackMessage ? (
					<p className="text-sm text-emerald-600">{feedbackMessage}</p>
				) : null}

				{errorMessage ? (
					<p className="text-sm text-destructive">{errorMessage}</p>
				) : null}

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
											aria-invalid={isInvalid}
											placeholder="Ej. Juan Perez"
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
											aria-invalid={isInvalid}
											placeholder="Ej. 30111222"
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
										<FieldLabel htmlFor={field.name}>Telefono</FieldLabel>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) =>
												field.handleChange(event.target.value)
											}
											aria-invalid={isInvalid}
											placeholder="Ej. +54 9 388 123 4567"
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
										<FieldLabel htmlFor={field.name}>Direccion</FieldLabel>
										<Textarea
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) =>
												field.handleChange(event.target.value)
											}
											aria-invalid={isInvalid}
											placeholder="Direccion legal o comercial usada en los contratos"
										/>
										{isInvalid ? (
											<FieldError errors={field.state.meta.errors} />
										) : null}
									</Field>
								);
							}}
						</form.Field>

						<form.Field name="signUrl">
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								const previewUrl = buildR2PublicUrl(
									field.state.value,
									"branding",
								);

								return (
									<Field data-invalid={isInvalid} className="space-y-3">
										<div className="space-y-1">
											<FieldLabel>Firma</FieldLabel>
											<p className="text-sm text-muted-foreground">
												Subi la firma del titular para incluirla en el contrato.
											</p>
										</div>

										<div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed bg-muted/30 px-4 py-6">
											{previewUrl ? (
												<img
													src={previewUrl}
													alt="Firma cargada"
													className="max-h-32 w-auto rounded-md object-contain"
												/>
											) : (
												<p className="text-center text-sm text-muted-foreground">
													Aun no hay una firma cargada.
												</p>
											)}
										</div>

										{isInvalid ? (
											<FieldError errors={field.state.meta.errors} />
										) : null}
									</Field>
								);
							}}
						</form.Field>

						<form.Field name="signatureFile">
							{(field) => (
								<Field>
									<FieldLabel htmlFor={field.name}>Archivo de firma</FieldLabel>
									<div className="flex flex-col gap-3 rounded-xl border px-4 py-4">
										<input
											id={field.name}
											type="file"
											accept="image/*"
											onBlur={field.handleBlur}
											onChange={(event) => {
												const file = event.target.files?.[0] ?? null;
												field.handleChange(file);
											}}
											disabled={isPending}
										/>

										{field.state.value ? (
											<div className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2 text-sm">
												<span className="truncate text-muted-foreground">
													{field.state.value.name}
												</span>
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={() => field.handleChange(null)}
												>
													Quitar
												</Button>
											</div>
										) : (
											<p className="text-sm text-muted-foreground">
												Acepta cualquier imagen. La convertimos a PNG antes de
												subirla.
											</p>
										)}
									</div>
								</Field>
							)}
						</form.Field>
					</FieldGroup>

					<div className="flex justify-end">
						<form.Subscribe
							selector={(state) => [state.canSubmit, state.isSubmitting]}
						>
							{([canSubmit, isSubmitting]) => (
								<Button
									type="submit"
									form={formId}
									disabled={!canSubmit || isPending}
								>
									{isSubmitting || isPending
										? mode === "create"
											? "Guardando..."
											: "Actualizando..."
										: mode === "create"
											? "Guardar perfil"
											: "Actualizar perfil"}
								</Button>
							)}
						</form.Subscribe>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}

function getDirtyValues(
	values: UserProfileFormValues,
	defaultValues: UserProfileFormValues,
): UserProfileDirtyValues {
	const dirtyValues: UserProfileDirtyValues = {};

	for (const field of trackedFields) {
		if (values[field] !== defaultValues[field]) {
			dirtyValues[field] = values[field];
		}
	}

	return dirtyValues;
}
