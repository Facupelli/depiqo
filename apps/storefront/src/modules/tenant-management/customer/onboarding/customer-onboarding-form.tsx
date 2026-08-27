import { useUploadFile } from "@better-upload/client";
import { Button } from "@repo/ui/components/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { useForm } from "@tanstack/react-form";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { ProblemDetailsError } from "@/shared/errors";
import { useSubmitCustomerProfile } from "../customer-profile.queries";
import {
	type CustomerOnboardingFormValues,
	createCustomerOnboardingFormDefaults,
	customerOnboardingStepSchemas,
	toSubmitCustomerProfileDto,
} from "./customer-onboarding.schema";

function cn(...classes: Array<string | false | null | undefined>) {
	return classes.filter(Boolean).join(" ");
}

type StepNumber = 1 | 2 | 3 | 4 | 5;

const STEPS = [
	{ number: 1, label: "Personal" },
	{ number: 2, label: "Documento" },
	{ number: 3, label: "Trabajo" },
	{ number: 4, label: "Redes" },
	{ number: 5, label: "Contactos" },
] as const;

const stepFields: Record<StepNumber, (keyof CustomerOnboardingFormValues)[]> = {
	1: ["fullName", "phone", "birthDate", "documentNumber"],
	2: [
		"identityDocumentFile",
		"currentIdentityDocumentPath",
		"address",
		"city",
		"stateRegion",
		"country",
	],
	3: ["occupation", "company", "taxId", "businessName"],
	4: ["instagram", "knowsExistingCustomer", "knownCustomerName"],
	5: [
		"contact1Name",
		"contact1Phone",
		"contact1Relationship",
		"contact2Name",
		"contact2Phone",
		"contact2Relationship",
	],
};

export function CustomerOnboardingForm({
	customerId,
	tenantName,
	defaultValues,
	mode,
}: {
	customerId: string;
	tenantName: string;
	defaultValues?: CustomerOnboardingFormValues;
	mode: "submit" | "resubmit";
}) {
	const submitMutation = useSubmitCustomerProfile();
	const uploader = useUploadFile({
		api: "/api/customer-upload",
		route: "identityDocument",
	});
	const [currentStep, setCurrentStep] = useState<StepNumber>(1);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [stepErrors, setStepErrors] = useState<
		Partial<Record<keyof CustomerOnboardingFormValues, string[]>>
	>({});
	const liveValidationSteps = useRef(new Set<StepNumber>());

	const form = useForm({
		defaultValues: defaultValues ?? createCustomerOnboardingFormDefaults(),
		onSubmit: async ({ value }) => {
			setSubmitError(null);
			try {
				let identityDocumentPath = value.currentIdentityDocumentPath;
				if (value.identityDocumentFile) {
					const result = await uploader.uploadAsync(
						value.identityDocumentFile,
						{
							metadata: { customerId },
						},
					);
					identityDocumentPath = result.file.objectInfo.key;
				}

				if (!identityDocumentPath) {
					setSubmitError("Subí tu documento para enviar la solicitud.");
					return;
				}

				await submitMutation.mutateAsync({
					body: toSubmitCustomerProfileDto(value, identityDocumentPath),
				});
			} catch (error) {
				if (error instanceof ProblemDetailsError) {
					setSubmitError(error.problemDetails.detail);
				} else if (value.identityDocumentFile) {
					setSubmitError("No pudimos subir el documento. Intentá nuevamente.");
				} else {
					setSubmitError("No pudimos enviar tus datos. Intentá nuevamente.");
				}
			}
		},
	});

	function validateStep(
		step: StepNumber,
		values: CustomerOnboardingFormValues = form.state.values,
	) {
		const result = customerOnboardingStepSchemas[step].safeParse(values);
		const errors: Partial<
			Record<keyof CustomerOnboardingFormValues, string[]>
		> = {};
		if (!result.success) {
			liveValidationSteps.current.add(step);
			for (const issue of result.error.issues) {
				const fieldName = issue.path[0];
				if (typeof fieldName === "string") {
					const key = fieldName as keyof CustomerOnboardingFormValues;
					errors[key] = [...(errors[key] ?? []), issue.message];
				}
			}
		}
		setStepErrors((previous) => {
			const next = { ...previous };
			for (const fieldName of stepFields[step]) delete next[fieldName];
			return { ...next, ...errors };
		});
		return result.success;
	}

	function handleFieldChange<TField extends keyof CustomerOnboardingFormValues>(
		fieldName: TField,
		value: CustomerOnboardingFormValues[TField],
	) {
		if (!liveValidationSteps.current.has(currentStep)) return;

		validateStep(currentStep, {
			...form.state.values,
			[fieldName]: value,
		} as CustomerOnboardingFormValues);
	}

	async function handleNext() {
		setSubmitError(null);
		if (validateStep(currentStep)) {
			setCurrentStep((currentStep + 1) as StepNumber);
		}
	}

	async function handleSubmit() {
		setSubmitError(null);
		let firstInvalidStep: StepNumber | null = null;
		for (const step of STEPS) {
			if (!validateStep(step.number) && firstInvalidStep === null) {
				firstInvalidStep = step.number;
			}
		}
		if (firstInvalidStep !== null) {
			setCurrentStep(firstInvalidStep);
			return;
		}
		await form.handleSubmit();
	}

	const isBusy =
		uploader.isPending || submitMutation.isPending || form.state.isSubmitting;

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				void handleSubmit();
			}}
			noValidate
		>
			<div className="mx-auto w-full max-w-lg">
				<StepIndicator currentStep={currentStep} />
				<div className="min-h-105">
					{currentStep === 1 ? (
						<PersonalStep
							form={form as OnboardingForm}
							errors={stepErrors}
							onFieldChange={handleFieldChange}
						/>
					) : null}
					{currentStep === 2 ? (
						<DocumentStep
							form={form as OnboardingForm}
							errors={stepErrors}
							onFieldChange={handleFieldChange}
							uploader={uploader}
						/>
					) : null}
					{currentStep === 3 ? (
						<WorkStep
							form={form as OnboardingForm}
							errors={stepErrors}
							onFieldChange={handleFieldChange}
						/>
					) : null}
					{currentStep === 4 ? (
						<ReferenceStep
							form={form as OnboardingForm}
							errors={stepErrors}
							onFieldChange={handleFieldChange}
							tenantName={tenantName}
						/>
					) : null}
					{currentStep === 5 ? (
						<ContactsStep
							form={form as OnboardingForm}
							errors={stepErrors}
							onFieldChange={handleFieldChange}
						/>
					) : null}
				</div>
				{submitError ? (
					<p className="mt-4 text-sm text-destructive">{submitError}</p>
				) : null}
				<div className="mt-8 flex items-center justify-between border-t pt-4">
					<Button
						type="button"
						variant="ghost"
						disabled={currentStep === 1 || isBusy}
						onClick={() => setCurrentStep((currentStep - 1) as StepNumber)}
					>
						<ArrowLeft className="size-4" /> Atrás
					</Button>
					{currentStep < 5 ? (
						<Button
							type="button"
							disabled={isBusy}
							onClick={() => void handleNext()}
						>
							Siguiente <ArrowRight className="size-4" />
						</Button>
					) : (
						<Button type="submit" disabled={isBusy} className="min-w-30">
							{isBusy ? (
								<>
									<Loader2 className="size-4 animate-spin" />{" "}
									{uploader.isPending ? "Subiendo..." : "Enviando..."}
								</>
							) : mode === "resubmit" ? (
								"Reenviar"
							) : (
								"Enviar"
							)}
						</Button>
					)}
				</div>
			</div>
		</form>
	);
}

type OnboardingForm = ReturnType<typeof useCustomerOnboardingForm>;
type OnboardingFieldChange = <
	TField extends keyof CustomerOnboardingFormValues,
>(
	fieldName: TField,
	value: CustomerOnboardingFormValues[TField],
) => void;
type StepProps = {
	form: OnboardingForm;
	errors: Partial<Record<keyof CustomerOnboardingFormValues, string[]>>;
	onFieldChange: OnboardingFieldChange;
};

function useCustomerOnboardingForm() {
	return useForm({
		defaultValues: createCustomerOnboardingFormDefaults(),
	});
}

function TextField({
	form,
	errors,
	onFieldChange,
	name,
	label,
	description,
	type = "text",
	placeholder,
}: StepProps & {
	name: Exclude<
		keyof CustomerOnboardingFormValues,
		| "identityDocumentFile"
		| "currentIdentityDocumentPath"
		| "knowsExistingCustomer"
	>;
	label: string;
	description?: string;
	type?: string;
	placeholder?: string;
}) {
	return (
		<form.Field name={name}>
			{(field) => {
				const fieldErrors = errors[name] ?? [];
				const isInvalid = fieldErrors.length > 0;
				return (
					<Field data-invalid={isInvalid}>
						<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
						<Input
							id={field.name}
							name={field.name}
							type={type}
							placeholder={placeholder}
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(event) => {
								const value = event.target.value;
								field.handleChange(value);
								onFieldChange(name, value);
							}}
							aria-invalid={isInvalid}
						/>
						{description ? (
							<FieldDescription>{description}</FieldDescription>
						) : null}
						{isInvalid ? (
							<FieldError
								errors={fieldErrors.map((message) => ({ message }))}
							/>
						) : null}
					</Field>
				);
			}}
		</form.Field>
	);
}

function PersonalStep({ form, errors, onFieldChange }: StepProps) {
	return (
		<Step
			title="Información personal"
			description="Completá tus datos básicos para comenzar."
		>
			<TextField
				form={form}
				errors={errors}
				onFieldChange={onFieldChange}
				name="fullName"
				label="Nombre completo"
				placeholder="Juan Pérez"
			/>
			<TextField
				form={form}
				errors={errors}
				onFieldChange={onFieldChange}
				name="phone"
				label="Número de teléfono"
				type="tel"
				placeholder="+34 612 345 678"
				description="Incluí el código de país y el prefijo."
			/>
			<TextField
				form={form}
				errors={errors}
				onFieldChange={onFieldChange}
				name="birthDate"
				label="Fecha de nacimiento"
				type="date"
			/>
			<TextField
				form={form}
				errors={errors}
				onFieldChange={onFieldChange}
				name="documentNumber"
				label="DNI o NIE"
				placeholder="12345678Z"
				description="Ingresá tu documento sin espacios."
			/>
		</Step>
	);
}

function DocumentStep({
	form,
	errors,
	onFieldChange,
	uploader,
}: StepProps & { uploader: ReturnType<typeof useUploadFile> }) {
	return (
		<Step
			title="Documento y domicilio"
			description="Subí una foto de tu documento y completá tu dirección."
		>
			<FieldGroup>
				<form.Field name="currentIdentityDocumentPath">
					{(field) =>
						field.state.value ? (
							<div className="rounded-md border px-3 py-2 text-sm">
								<div className="flex items-center justify-between gap-3">
									<div>
										<p className="font-medium">Documento actual cargado</p>
										<p className="break-all text-muted-foreground">
											{field.state.value}
										</p>
									</div>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => {
											field.handleChange(null);
											onFieldChange("currentIdentityDocumentPath", null);
										}}
									>
										Quitar
									</Button>
								</div>
								<p className="mt-2 text-xs text-muted-foreground">
									Si no subís un archivo nuevo, conservaremos este documento.
								</p>
							</div>
						) : null
					}
				</form.Field>
				<form.Field name="identityDocumentFile">
					{(field) => {
						const fieldErrors = errors.identityDocumentFile ?? [];
						return (
							<Field data-invalid={fieldErrors.length > 0}>
								<FieldLabel htmlFor={field.name}>Documento</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									type="file"
									accept=".pdf,image/jpeg,image/png,image/webp"
									onChange={(event) => {
										const file = event.target.files?.[0] ?? null;
										field.handleChange(file);
										onFieldChange("identityDocumentFile", file);
									}}
									disabled={uploader.isPending}
								/>
								<FieldDescription>
									PDF, JPEG, PNG o WEBP. Máximo 3 MB.
								</FieldDescription>
								{field.state.value ? (
									<p className="text-sm text-muted-foreground">
										{field.state.value.name}
									</p>
								) : null}
								{fieldErrors.length > 0 ? (
									<FieldError
										errors={fieldErrors.map((message) => ({ message }))}
									/>
								) : null}
							</Field>
						);
					}}
				</form.Field>
				<TextField
					form={form}
					errors={errors}
					onFieldChange={onFieldChange}
					name="address"
					label="Domicilio real"
					placeholder="Av. Corrientes 1234, Piso 2"
				/>
				<TextField
					form={form}
					errors={errors}
					onFieldChange={onFieldChange}
					name="city"
					label="Localidad"
					placeholder="Madrid"
				/>
				<TextField
					form={form}
					errors={errors}
					onFieldChange={onFieldChange}
					name="stateRegion"
					label="Provincia / Región"
					placeholder="Comunidad de Madrid"
				/>
				<TextField
					form={form}
					errors={errors}
					onFieldChange={onFieldChange}
					name="country"
					label="País"
					placeholder="España"
				/>
			</FieldGroup>
		</Step>
	);
}

function WorkStep({ form, errors, onFieldChange }: StepProps) {
	return (
		<Step
			title="Trabajo y finanzas"
			description="Esta información es opcional pero nos ayuda a conocerte mejor."
		>
			<Section title="Empleo">
				<TextField
					form={form}
					errors={errors}
					onFieldChange={onFieldChange}
					name="occupation"
					label="Ocupación (opcional)"
					placeholder="Empleado, comerciante, estudiante..."
				/>
				<TextField
					form={form}
					errors={errors}
					onFieldChange={onFieldChange}
					name="company"
					label="Empresa (opcional)"
				/>
			</Section>
			<Section title="Información fiscal">
				<TextField
					form={form}
					errors={errors}
					onFieldChange={onFieldChange}
					name="taxId"
					label="Identificación fiscal (opcional)"
					placeholder="NIF / CIF"
				/>
				<TextField
					form={form}
					errors={errors}
					onFieldChange={onFieldChange}
					name="businessName"
					label="Razón social (opcional)"
				/>
			</Section>
		</Step>
	);
}

function ReferenceStep({
	form,
	errors,
	onFieldChange,
	tenantName,
}: StepProps & { tenantName: string }) {
	return (
		<Step
			title="Redes y referencia"
			description="Queremos entender mejor tu perfil antes de aprobar la cuenta."
		>
			<TextField
				form={form}
				errors={errors}
				onFieldChange={onFieldChange}
				name="instagram"
				label="Instagram"
				placeholder="tuusuario"
				description="Ingresá tu usuario o el link a tu perfil."
			/>
			<form.Field name="knowsExistingCustomer">
				{(field) => (
					<Field>
						<FieldLabel>¿Conocés a algún cliente de {tenantName}?</FieldLabel>
						<Select
							value={field.state.value ? "yes" : "no"}
							onValueChange={(value) => {
								const knowsExistingCustomer = value === "yes";
								field.handleChange(knowsExistingCustomer);
								onFieldChange("knowsExistingCustomer", knowsExistingCustomer);
							}}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="no">No</SelectItem>
								<SelectItem value="yes">Sí</SelectItem>
							</SelectContent>
						</Select>
					</Field>
				)}
			</form.Field>
			<form.Subscribe selector={(state) => state.values.knowsExistingCustomer}>
				{(knowsExistingCustomer) =>
					knowsExistingCustomer ? (
						<TextField
							form={form}
							errors={errors}
							onFieldChange={onFieldChange}
							name="knownCustomerName"
							label="Nombre del cliente"
							placeholder="Nombre y apellido"
						/>
					) : null
				}
			</form.Subscribe>
		</Step>
	);
}

function ContactsStep({ form, errors, onFieldChange }: StepProps) {
	return (
		<Step
			title="Contactos de referencia"
			description="Necesitamos al menos un contacto de referencia."
		>
			<Section title="Contacto 1">
				<TextField
					form={form}
					errors={errors}
					onFieldChange={onFieldChange}
					name="contact1Name"
					label="Nombre completo"
				/>
				<TextField
					form={form}
					errors={errors}
					onFieldChange={onFieldChange}
					name="contact1Phone"
					label="Teléfono"
					type="tel"
				/>
				<TextField
					form={form}
					errors={errors}
					onFieldChange={onFieldChange}
					name="contact1Relationship"
					label="Vínculo"
				/>
			</Section>
			<Section title="Contacto 2 (opcional)">
				<TextField
					form={form}
					errors={errors}
					onFieldChange={onFieldChange}
					name="contact2Name"
					label="Nombre completo"
				/>
				<TextField
					form={form}
					errors={errors}
					onFieldChange={onFieldChange}
					name="contact2Phone"
					label="Teléfono"
					type="tel"
				/>
				<TextField
					form={form}
					errors={errors}
					onFieldChange={onFieldChange}
					name="contact2Relationship"
					label="Vínculo"
				/>
			</Section>
		</Step>
	);
}

function Step({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-5">
			<div>
				<h2 className="text-xl font-semibold tracking-tight">{title}</h2>
				<p className="mt-1 text-sm text-muted-foreground">{description}</p>
			</div>
			<FieldGroup>{children}</FieldGroup>
		</div>
	);
}
function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-4">
			<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				{title}
			</p>
			<FieldGroup>{children}</FieldGroup>
		</div>
	);
}
function StepIndicator({ currentStep }: { currentStep: StepNumber }) {
	return (
		<div className="mb-8 flex w-full items-center justify-center">
			{STEPS.map((step, index) => (
				<div key={step.number} className="flex items-center">
					<div className="flex flex-col items-center gap-1.5">
						<div
							className={cn(
								"flex size-8 items-center justify-center rounded-full border-2 text-sm font-semibold",
								currentStep > step.number &&
									"border-primary bg-primary text-primary-foreground",
								currentStep === step.number &&
									"border-primary bg-primary/10 text-primary",
								currentStep < step.number &&
									"border-muted-foreground/30 text-muted-foreground/50",
							)}
						>
							{currentStep > step.number ? (
								<Check className="size-4" />
							) : (
								step.number
							)}
						</div>
						<span className="hidden text-xs font-medium sm:block">
							{step.label}
						</span>
					</div>
					{index < STEPS.length - 1 ? (
						<div
							className={cn(
								"mx-1 mb-5 h-0.5 w-12 rounded-full sm:w-20",
								currentStep > step.number
									? "bg-primary"
									: "bg-muted-foreground/20",
							)}
						/>
					) : null}
				</div>
			))}
		</div>
	);
}
