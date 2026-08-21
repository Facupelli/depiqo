import { Button, buttonVariants } from "@repo/ui/components/button";
import { formOptions } from "@tanstack/react-form";
import { buildR2PublicUrl } from "@/lib/r2-public-url";
import { cn } from "@/lib/utils";
import {
	SettingsRow,
	useSettingsForm,
} from "@/modules/settings/business-configuration/settings-form";
import {
	type ContractSignerFormValues,
	contractSignerFormSchema,
	createContractSignerFormDefaultValues,
} from "./contract-signer-form.schema";

const contractSignerFormOptions = formOptions({
	defaultValues: createContractSignerFormDefaultValues(),
	validators: { onSubmit: contractSignerFormSchema },
});

interface ContractSignerFormProps {
	defaultValues?: ContractSignerFormValues;
	isPending: boolean;
	onSubmit: (values: ContractSignerFormValues) => Promise<void> | void;
}

export function ContractSignerForm({
	defaultValues,
	isPending,
	onSubmit,
}: ContractSignerFormProps) {
	const form = useSettingsForm({
		...contractSignerFormOptions,
		defaultValues,
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		},
	});

	return (
		<form.AppForm>
			<form.SettingsForm isPending={isPending} framed>
				<form.AppField name="fullName">
					{(field) => (
						<field.SettingsTextField
							label="Nombre completo"
							placeholder="Ej. Juan Perez"
						/>
					)}
				</form.AppField>
				<form.AppField name="documentNumber">
					{(field) => (
						<field.SettingsTextField
							label="Documento"
							placeholder="Ej. 30111222"
						/>
					)}
				</form.AppField>
				<form.AppField name="phone">
					{(field) => (
						<field.SettingsTextField
							label="Teléfono"
							placeholder="Ej. +54 9 388 123 4567"
						/>
					)}
				</form.AppField>
				<form.AppField name="address">
					{(field) => (
						<field.SettingsTextareaField
							label="Dirección"
							placeholder="Dirección legal o comercial usada en los contratos"
						/>
					)}
				</form.AppField>
				<form.AppField name="signatureUrl">
					{(field) => {
						const previewUrl = getSignaturePreviewUrl(field.state.value);

						return (
							<SettingsRow label="Vista previa de la firma">
								<div className="flex h-36 w-72 items-center justify-center rounded-xl border border-dashed bg-muted/30 px-4 py-6">
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
							</SettingsRow>
						);
					}}
				</form.AppField>
				<form.AppField name="signatureFile">
					{(field) => (
						<SettingsRow label="Archivo de firma">
							<div className="flex flex-col items-start gap-3">
								<label
									htmlFor={field.name}
									className={cn(
										buttonVariants({ variant: "outline" }),
										"cursor-pointer",
										isPending && "pointer-events-none opacity-50",
									)}
								>
									<input
										id={field.name}
										name={field.name}
										type="file"
										accept="image/*"
										className="sr-only"
										onBlur={field.handleBlur}
										onChange={(event) => {
											const file = event.target.files?.[0] ?? null;
											field.handleChange(file);
										}}
										disabled={isPending}
									/>
									{field.state.value ? "Cambiar archivo" : "Subir firma"}
								</label>

								{field.state.value ? (
									<div className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2 text-sm">
										<span className="max-w-48 truncate text-muted-foreground">
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
								) : null}
							</div>
						</SettingsRow>
					)}
				</form.AppField>
			</form.SettingsForm>
		</form.AppForm>
	);
}

function getSignaturePreviewUrl(value: string): string | null {
	const trimmedValue = value.trim();

	if (!trimmedValue) {
		return null;
	}

	if (
		trimmedValue.startsWith("http://") ||
		trimmedValue.startsWith("https://")
	) {
		return trimmedValue;
	}

	return buildR2PublicUrl(trimmedValue, "branding");
}
