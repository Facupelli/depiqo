import { revalidateLogic, useFormGroup } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useOwnerOptions } from "@/modules/inventory/ownership/public";
import { useBranches } from "@/modules/settings/branches/public";
import { useCategories } from "@/modules/settings/categories/public";
import { useAppForm } from "@/shared/contexts/form.context";
import { AssetsStep } from "./assets-step";
import {
	type CreateEquipmentSubmissionError,
	mapCreateEquipmentError,
} from "./create-equipment.errors";
import { useCreateEquipment } from "./create-equipment.mutation";
import {
	assetsFormSchema,
	createEquipmentFormDefaultValues,
	createEquipmentFormSchema,
	equipmentFormSchema,
	standaloneRentalFormSchema,
	toCreateEquipmentDto,
} from "./create-equipment.schema";
import { CreateEquipmentWizardShell } from "./create-equipment-wizard-shell";
import { EquipmentStep } from "./equipment-step";
import { ReviewStep } from "./review-step";
import { StandaloneRentalStep } from "./standalone-rental-step";

const finalStep = 3;

function focusFirstInvalidControl() {
	document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
}

export function CreateEquipmentPage() {
	const navigate = useNavigate();
	const [currentStep, setCurrentStep] = useState(0);
	const [standaloneRentalInitialized, setStandaloneRentalInitialized] =
		useState(false);
	const [submitError, setSubmitError] =
		useState<CreateEquipmentSubmissionError | null>(null);
	const { data: categories = [] } = useCategories();
	const { data: branches = [] } = useBranches({ isActive: true });
	const { data: owners = [] } = useOwnerOptions();
	const activeCategories = categories.filter((category) => category.isActive);
	const { mutateAsync: createEquipment, isPending } = useCreateEquipment();

	const form = useAppForm({
		defaultValues: createEquipmentFormDefaultValues(),
		validationLogic: revalidateLogic(),
		validators: { onSubmit: createEquipmentFormSchema },
		onSubmit: async ({ value }) => {
			setSubmitError(null);
			try {
				const response = await createEquipment(toCreateEquipmentDto(value));
				toast.success("Equipo creado correctamente");
				await navigate({
					to: "/dashboard/inventory/equipment-types/$equipmentTypeId",
					params: { equipmentTypeId: response.equipmentTypeId },
				});
			} catch (error) {
				const mappedError = mapCreateEquipmentError(error);
				setSubmitError(mappedError);
				if (mappedError.kind === "field") setCurrentStep(0);
			}
		},
	});

	const equipmentValidationGroup = useFormGroup({
		form,
		name: "equipment",
		validationLogic: revalidateLogic(),
		validators: { onDynamic: equipmentFormSchema },
		onGroupSubmit: () => setCurrentStep(1),
		onGroupSubmitInvalid: focusFirstInvalidControl,
	});
	const assetsValidationGroup = useFormGroup({
		form,
		name: "assets",
		validationLogic: revalidateLogic(),
		validators: { onDynamic: assetsFormSchema },
		onGroupSubmit: () => setCurrentStep(2),
		onGroupSubmitInvalid: focusFirstInvalidControl,
	});
	const rentalValidationGroup = useFormGroup({
		form,
		name: "standaloneRental",
		validationLogic: revalidateLogic(),
		validators: { onDynamic: standaloneRentalFormSchema },
		onGroupSubmit: () => setCurrentStep(3),
		onGroupSubmitInvalid: focusFirstInvalidControl,
	});

	function handleContinue() {
		if (currentStep === 0) return equipmentValidationGroup.handleSubmit();
		if (currentStep === 1) return assetsValidationGroup.handleSubmit();
		return rentalValidationGroup.handleSubmit();
	}

	function handleStandaloneRentalEnabledChange(checked: boolean) {
		if (!checked || standaloneRentalInitialized) return;

		form.setFieldValue(
			"standaloneRental.name",
			form.getFieldValue("equipment.name"),
		);
		form.setFieldValue(
			"standaloneRental.description",
			form.getFieldValue("equipment.description"),
		);
		form.setFieldValue(
			"standaloneRental.imageUrl",
			form.getFieldValue("equipment.imageUrl"),
		);
		form.setFieldValue(
			"standaloneRental.categoryId",
			form.getFieldValue("equipment.categoryId"),
		);
		setStandaloneRentalInitialized(true);
	}

	const categoryItems = activeCategories.map((category) => ({
		value: category.id,
		label: category.name,
	}));
	const branchItems = branches.map((branch) => ({
		value: branch.id,
		label: branch.name,
	}));
	const ownerItems = owners.map((owner) => ({
		value: owner.id,
		label: owner.name,
	}));

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				form.handleSubmit();
			}}
		>
			<form.Subscribe selector={(state) => state.isSubmitting}>
				{(isSubmitting) => (
					<CreateEquipmentWizardShell
						currentStep={currentStep}
						isFinalStep={currentStep === finalStep}
						isSubmitting={isSubmitting || isPending}
						onBack={() => setCurrentStep((step) => Math.max(0, step - 1))}
						onCancel={() =>
							navigate({ to: "/dashboard/inventory/equipment-types" })
						}
						onContinue={handleContinue}
					>
						{currentStep === 0 && (
							<EquipmentStep
								form={form}
								categoryItems={categoryItems}
								submitError={submitError}
								onClearSubmitError={() => setSubmitError(null)}
							/>
						)}
						{currentStep === 1 && (
							<AssetsStep
								form={form}
								branchItems={branchItems}
								ownerItems={ownerItems}
							/>
						)}
						{currentStep === 2 && (
							<StandaloneRentalStep
								form={form}
								categoryItems={categoryItems}
								branchItems={branchItems}
								onEnabledChange={handleStandaloneRentalEnabledChange}
							/>
						)}
						{currentStep === 3 && (
							<ReviewStep
								form={form}
								categories={activeCategories}
								branches={branches}
								onEdit={setCurrentStep}
							/>
						)}
						{currentStep === 3 && submitError?.kind === "form" ? (
							<p
								role="alert"
								className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm"
							>
								{submitError.message}
							</p>
						) : null}
					</CreateEquipmentWizardShell>
				)}
			</form.Subscribe>
		</form>
	);
}
