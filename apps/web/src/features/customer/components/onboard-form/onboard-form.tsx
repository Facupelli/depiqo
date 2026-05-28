import { useUploadFile } from "@better-upload/client";
import {
	ArrowLeft,
	ArrowRight,
	Check,
	CheckCircle2,
	Loader2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	useResubmitCustomerProfile,
	useSubmitCustomerProfile,
} from "@/features/rental/customer/customer.queries";
import { cn } from "@/lib/utils";
import { useAppForm } from "@/shared/contexts/form.context";
import { ProblemDetailsError } from "@/shared/errors";
import {
	customerFormFieldSchema,
	customerFormSubmitSchema,
	customerFormValues,
	type OnboardFormValues,
	type StepNumber,
	step1Schema,
	step2Schema,
	step3Schema,
	step4Schema,
	step5Schema,
	stepFields,
	toCustomerProfileDto,
} from "../../schemas/onboard-form.schema";
import { Step1Personal } from "./onboard-step-1";
import { Step2Document } from "./onboard-step-2";
import { Step3WorkFinance } from "./onboard-step-3";
import { Step4Acquisition } from "./onboard-step-4";
import { Step5Contacts } from "./onboard-step-5";

interface CustomerFormProps {
	customerId: string;
	tenantName: string;
	defaultValues?: Partial<OnboardFormValues>;
	mode?: "submit" | "resubmit";
}

type FieldErrorIssue = {
	message: string;
};

type ManualFieldErrors = Partial<
	Record<keyof OnboardFormValues, FieldErrorIssue[]>
>;

const STEP_NUMBERS = [1, 2, 3, 4, 5] as const satisfies readonly StepNumber[];

export function CustomerForm({
	customerId,
	tenantName,
	defaultValues,
	mode = "submit",
}: CustomerFormProps) {
	const submitMutation = useSubmitCustomerProfile();
	const resubmitMutation = useResubmitCustomerProfile();
	const [currentStep, setCurrentStep] = useState<StepNumber>(1);
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [manualErrors, setManualErrors] = useState<ManualFieldErrors>({});

	const uploader = useUploadFile({
		api: "/api/customer-upload",
		route: "identityDocument",
	});

	const form = useAppForm({
		defaultValues: {
			...customerFormValues,
			...defaultValues,
		},
		validators: {
			onChange: customerFormFieldSchema,
		},
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
					setSubmitError(
						mode === "resubmit"
							? "Subí un documento para reenviar la solicitud."
							: "Subí tu documento.",
					);
					return;
				}

				const payload = toCustomerProfileDto(value, identityDocumentPath);

				if (mode === "resubmit") {
					await resubmitMutation.mutateAsync(payload);
				} else {
					await submitMutation.mutateAsync(payload);
				}

				setIsSubmitted(true);
			} catch (error) {
				if (error instanceof ProblemDetailsError) {
					setSubmitError(error.problemDetails.detail);
					return;
				}

				if (value.identityDocumentFile) {
					setSubmitError("No pudimos subir el documento. Intentá nuevamente.");
					return;
				}

				setSubmitError(
					error instanceof Error
						? error.message
						: "No pudimos enviar tus datos. Intentá nuevamente.",
				);
			}
		},
	});

	const stepSchemas = {
		1: step1Schema,
		2: step2Schema,
		3: step3Schema,
		4: step4Schema,
		5: step5Schema,
	} as const;

	const setStepTouched = (step: StepNumber) => {
		stepFields[step].forEach((name) => {
			form.setFieldMeta(name as keyof OnboardFormValues, (prev) => ({
				...prev,
				isTouched: true,
			}));
		});
	};

	const clearManualError = (fieldName: keyof OnboardFormValues | string) => {
		setManualErrors((prev) => {
			if (!(fieldName in prev)) {
				return prev;
			}

			const next = { ...prev };
			delete next[fieldName as keyof OnboardFormValues];
			return next;
		});
	};

	const getFieldIssues = (
		fieldName: keyof OnboardFormValues | string,
		fieldErrors: unknown[] | undefined,
	) => {
		const nextErrors = [
			...normalizeFieldErrors(fieldErrors),
			...(manualErrors[fieldName as keyof OnboardFormValues] ?? []),
		];

		return dedupeIssues(nextErrors);
	};

	const applyManualErrors = (
		issues: { message: string; path: PropertyKey[] }[],
	) => {
		setManualErrors((prev) => {
			const next = { ...prev };

			for (const issue of issues) {
				const fieldName = getFieldName(issue.path);
				if (!fieldName) {
					continue;
				}

				next[fieldName] = dedupeIssues([
					...(next[fieldName] ?? []),
					{ message: issue.message },
				]);
			}

			return next;
		});
	};

	const goToIssueStep = (issues: { path: PropertyKey[] }[]) => {
		const invalidField = issues
			.map((issue) => getFieldName(issue.path))
			.find((fieldName): fieldName is keyof OnboardFormValues =>
				Boolean(fieldName),
			);

		if (!invalidField) {
			return;
		}

		const step = getStepForField(invalidField);
		if (!step) {
			return;
		}

		setCurrentStep(step);
		setStepTouched(step);
	};

	// ---------------------------------------------------------------------------
	// Per-step validation — validates only the active step's fields, then touches
	// them so errors become visible in the UI.
	// ---------------------------------------------------------------------------
	const validateCurrentStep = async (): Promise<boolean> => {
		const fields = stepFields[currentStep];
		const stepSchema = stepSchemas[currentStep];

		fields.forEach((fieldName) => {
			clearManualError(fieldName);
		});

		const results = await Promise.all(
			fields.map((name) =>
				form.validateField(name as keyof OnboardFormValues, "change"),
			),
		);

		setStepTouched(currentStep);

		const stepValidation = stepSchema.safeParse(
			pickStepValues(form.state.values, currentStep),
		);
		const stepIssues = stepValidation.success
			? []
			: normalizeIssues(stepValidation.error.issues);

		if (stepIssues.length > 0) {
			applyManualErrors(stepIssues);
		}

		return (
			results.every((errors) => !errors || errors.length === 0) &&
			stepIssues.length === 0
		);
	};

	const findFirstInvalidStep = async () => {
		for (const step of STEP_NUMBERS) {
			const fields = stepFields[step];
			const results = await Promise.all(
				fields.map((name) =>
					form.validateField(name as keyof OnboardFormValues, "change"),
				),
			);

			if (results.some((errors) => errors && errors.length > 0)) {
				setCurrentStep(step);
				setStepTouched(step);
				return true;
			}
		}

		return false;
	};

	const handleFinalSubmit = async () => {
		setSubmitError(null);

		const submitValidation = customerFormSubmitSchema.safeParse({
			identityDocumentFile: form.state.values.identityDocumentFile,
			currentIdentityDocumentPath:
				form.state.values.currentIdentityDocumentPath,
			instagram: form.state.values.instagram,
			knowsExistingCustomer: form.state.values.knowsExistingCustomer,
			knownCustomerName: form.state.values.knownCustomerName,
			heardAboutUs: form.state.values.heardAboutUs,
			heardAboutUsOther: form.state.values.heardAboutUsOther,
			contact2Name: form.state.values.contact2Name,
			contact2Phone: form.state.values.contact2Phone,
			contact2Relationship: form.state.values.contact2Relationship,
		});

		if (!submitValidation.success) {
			const issues = normalizeIssues(submitValidation.error.issues);
			applyManualErrors(issues);
			goToIssueStep(issues);
			setSubmitError("Revisá los campos marcados.");
			return;
		}

		const hasInvalidStep = await findFirstInvalidStep();
		if (hasInvalidStep) {
			setSubmitError("Revisá los campos marcados.");
			return;
		}

		await form.handleSubmit();
	};

	const handleNext = async () => {
		setSubmitError(null);
		const valid = await validateCurrentStep();
		if (!valid) {
			return;
		}
		setCurrentStep((s) => Math.min(s + 1, 5) as StepNumber);
	};

	const handleBack = () => {
		setCurrentStep((s) => Math.max(s - 1, 1) as StepNumber);
	};

	if (isSubmitted) {
		return <Confirmation />;
	}

	const isBusy =
		form.state.isSubmitting ||
		uploader.isPending ||
		submitMutation.isPending ||
		resubmitMutation.isPending;

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				void handleFinalSubmit();
			}}
		>
			<div className="w-full max-w-lg mx-auto">
				<StepIndicator currentStep={currentStep} />

				<div className="min-h-105">
					{currentStep === 1 && <Step1Personal form={form} />}
					{currentStep === 2 && (
						<Step2Document
							clearManualError={clearManualError}
							form={form}
							getFieldErrors={getFieldIssues}
							uploader={uploader}
							isUploading={uploader.isPending}
						/>
					)}
					{currentStep === 3 && <Step3WorkFinance form={form} />}
					{currentStep === 4 && (
						<Step4Acquisition form={form} tenantName={tenantName} />
					)}
					{currentStep === 5 && (
						<Step5Contacts
							clearManualError={clearManualError}
							form={form}
							getFieldErrors={getFieldIssues}
						/>
					)}
				</div>

				{submitError ? (
					<p className="mt-4 text-sm text-destructive">{submitError}</p>
				) : null}

				<div className="flex items-center justify-between mt-8 pt-4 border-t">
					<Button
						type="button"
						variant="ghost"
						onClick={handleBack}
						disabled={currentStep === 1 || isBusy}
						className="gap-2"
					>
						<ArrowLeft className="w-4 h-4" />
						Atrás
					</Button>

					{currentStep < 5 ? (
						<Button
							type="button"
							onClick={handleNext}
							disabled={isBusy}
							className="gap-2"
						>
							Siguiente
							<ArrowRight className="w-4 h-4" />
						</Button>
					) : (
						<Button type="submit" disabled={isBusy} className="gap-2 min-w-30">
							{isBusy ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin" />
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

function normalizeIssues(issues: { message: string; path: PropertyKey[] }[]) {
	return issues.map((issue) => ({
		message: issue.message,
		path: issue.path,
	}));
}

function normalizeFieldErrors(
	fieldErrors: unknown[] | undefined,
): FieldErrorIssue[] {
	if (!fieldErrors) {
		return [];
	}

	return fieldErrors.flatMap((error) => {
		if (typeof error === "string") {
			return [{ message: error }];
		}

		if (
			typeof error === "object" &&
			error !== null &&
			"message" in error &&
			typeof error.message === "string"
		) {
			return [{ message: error.message }];
		}

		return [];
	});
}

function dedupeIssues(issues: FieldErrorIssue[]) {
	const seen = new Set<string>();

	return issues.filter((issue) => {
		if (seen.has(issue.message)) {
			return false;
		}

		seen.add(issue.message);
		return true;
	});
}

function getFieldName(path: PropertyKey[]) {
	const fieldName = path[0];

	if (typeof fieldName !== "string") {
		return null;
	}

	return fieldName in customerFormValues
		? (fieldName as keyof OnboardFormValues)
		: null;
}

function getStepForField(fieldName: keyof OnboardFormValues) {
	for (const step of STEP_NUMBERS) {
		if (stepFields[step].includes(fieldName)) {
			return step;
		}
	}

	return null;
}

function pickStepValues(values: OnboardFormValues, step: StepNumber) {
	const stepValues: Partial<OnboardFormValues> = {};

	for (const fieldName of stepFields[step]) {
		stepValues[fieldName] = values[fieldName];
	}

	return stepValues;
}

const STEPS = [
	{ number: 1, label: "Personal" },
	{ number: 2, label: "Documento" },
	{ number: 3, label: "Trabajo" },
	{ number: 4, label: "Redes" },
	{ number: 5, label: "Contactos" },
];

interface StepIndicatorProps {
	currentStep: number;
}

function StepIndicator({ currentStep }: StepIndicatorProps) {
	return (
		<div className="flex items-center justify-center gap-0 w-full mb-8">
			{STEPS.map((step, idx) => {
				const isCompleted = currentStep > step.number;
				const isActive = currentStep === step.number;

				return (
					<div key={step.number} className="flex items-center">
						{/* Step circle + label */}
						<div className="flex flex-col items-center gap-1.5">
							<div
								className={cn(
									"w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-300",
									isCompleted &&
										"bg-primary border-primary text-primary-foreground",
									isActive && "border-primary text-primary bg-primary/10",
									!isCompleted &&
										!isActive &&
										"border-muted-foreground/30 text-muted-foreground/50",
								)}
							>
								{isCompleted ? (
									<Check className="w-4 h-4" />
								) : (
									<span>{step.number}</span>
								)}
							</div>
							<span
								className={cn(
									"text-xs font-medium transition-colors duration-300 hidden sm:block",
									isActive && "text-primary",
									isCompleted && "text-primary/70",
									!isActive && !isCompleted && "text-muted-foreground/40",
								)}
							>
								{step.label}
							</span>
						</div>

						{/* Connector line — skip after last step */}
						{idx < STEPS.length - 1 && (
							<div
								className={cn(
									"h-0.5 w-12 sm:w-20 mx-1 mb-5 rounded-full transition-all duration-500",
									currentStep > step.number
										? "bg-primary"
										: "bg-muted-foreground/20",
								)}
							/>
						)}
					</div>
				);
			})}
		</div>
	);
}

function Confirmation() {
	return (
		<div className="flex flex-col items-center justify-center text-center py-10 space-y-4">
			<div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
				<CheckCircle2 className="w-9 h-9 text-primary" />
			</div>
			<h2 className="text-2xl font-semibold tracking-tight">¡Todo listo!</h2>
			<p className="text-muted-foreground max-w-sm">
				Tus datos fueron enviados correctamente. Nos pondremos en contacto con
				vos a la brevedad para confirmar tu solicitud.
			</p>
		</div>
	);
}
