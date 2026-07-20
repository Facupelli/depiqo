import type { GetRentableItemDetailResponseDto } from "@repo/api-contracts";
import { useForm } from "@tanstack/react-form";
import { ArrowLeft, CircleDollarSign, Plus } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { AttachRatePlanToRentalOfferRatePlanOption } from "@/features/pricing/rental-offer-pricings/attach-rate-plan-to-rental-offer/attach-rate-plan-to-rental-offer-form";
import { AttachRatePlanToRentalOfferForm } from "@/features/pricing/rental-offer-pricings/attach-rate-plan-to-rental-offer/attach-rate-plan-to-rental-offer-form";
import { useBranches } from "@/features/tenant-management/branch/branch.queries";
import { CreateRentalOfferWithCreatedRatePlanForm } from "./create-rental-offer-with-created-rate-plan-form";
import { useCreateRentalOfferWithPricing } from "./create-rental-offer-with-pricing.mutation";
import {
	createRentalOfferWithPricingBranchFormDefaultValues,
	createRentalOfferWithPricingBranchFormSchema,
	toCreateRentalOfferWithAttachedRatePlanDto,
	toCreateRentalOfferWithCreatedRatePlanDto,
} from "./create-rental-offer-with-pricing.schema";

type AddOfferDialogStep =
	| "choose-action"
	| "attach-rate-plan"
	| "create-rate-plan";

type BranchOption = {
	id: string;
	name: string;
};

type CreateRentalOfferWithPricingDialogProps = {
	item: GetRentableItemDetailResponseDto;
	ratePlanOptions: AttachRatePlanToRentalOfferRatePlanOption[];
};

export function CreateRentalOfferWithPricingDialog({
	item,
	ratePlanOptions,
}: CreateRentalOfferWithPricingDialogProps) {
	const attachFormId = useId();
	const createFormId = useId();
	const [open, setOpen] = useState(false);
	const [step, setStep] = useState<AddOfferDialogStep>("choose-action");
	const [selectedBranchId, setSelectedBranchId] = useState("");
	const branchesQuery = useBranches({ isActive: true });
	const mutation = useCreateRentalOfferWithPricing();
	const availableBranches = getAvailableBranches(
		branchesQuery.data ?? [],
		item.offers,
	);
	const selectedBranch = availableBranches.find(
		(branch) => branch.id === selectedBranchId,
	);
	const selectedBranchLabel =
		selectedBranch?.name ?? "la sucursal seleccionada";

	function handleOpenChange(nextOpen: boolean) {
		setOpen(nextOpen);
		if (!nextOpen) {
			setStep("choose-action");
			setSelectedBranchId("");
		}
	}

	function renderBackButton() {
		return (
			<Button
				type="button"
				variant="ghost"
				onClick={() => setStep("choose-action")}
				disabled={mutation.isPending}
				className="mr-auto"
			>
				<ArrowLeft className="mr-2 size-4" />
				Volver
			</Button>
		);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<Button type="button" onClick={() => setOpen(true)}>
				<Plus className="mr-2 size-4" />
				Ofrecer en otra sucursal
			</Button>

			<DialogContent className={getDialogContentClassName(step)}>
				{open ? (
					<>
						<DialogHeader>
							<DialogTitle>{getDialogTitle(step)}</DialogTitle>
							<DialogDescription>
								{getDialogDescription(step, selectedBranchLabel)}
							</DialogDescription>
						</DialogHeader>

						{step === "choose-action" ? (
							<ChooseBranchAndPricingActionForm
								branches={availableBranches}
								selectedBranchId={selectedBranchId}
								isLoadingBranches={branchesQuery.isPending}
								onBranchChange={setSelectedBranchId}
								onAttachRatePlan={() => setStep("attach-rate-plan")}
								onCreateRatePlan={() => setStep("create-rate-plan")}
								onCancel={() => handleOpenChange(false)}
							/>
						) : null}

						{step === "attach-rate-plan" ? (
							<AttachRatePlanToRentalOfferForm
								formId={attachFormId}
								ratePlanOptions={ratePlanOptions}
								isPending={mutation.isPending}
								submitLabel="Crear oferta y vincular plan"
								pendingLabel="Creando oferta..."
								secondaryAction={renderBackButton()}
								onSubmit={async (values) => {
									const body = toCreateRentalOfferWithAttachedRatePlanDto(
										values,
										{
											rentableItemId: item.id,
											branchId: selectedBranchId,
										},
									);

									await mutation.mutateAsync(body);
									handleOpenChange(false);
								}}
								onCancel={() => handleOpenChange(false)}
							/>
						) : null}

						{step === "create-rate-plan" ? (
							<CreateRentalOfferWithCreatedRatePlanForm
								formId={createFormId}
								isPending={mutation.isPending}
								submitLabel="Crear oferta y plan"
								pendingLabel="Creando oferta..."
								secondaryAction={renderBackButton()}
								onSubmit={async (values) => {
									const body = toCreateRentalOfferWithCreatedRatePlanDto(
										values,
										{
											rentableItemId: item.id,
											branchId: selectedBranchId,
										},
									);

									await mutation.mutateAsync(body);
									handleOpenChange(false);
								}}
								onCancel={() => handleOpenChange(false)}
							/>
						) : null}
					</>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

function ChooseBranchAndPricingActionForm({
	branches,
	selectedBranchId,
	isLoadingBranches,
	onBranchChange,
	onAttachRatePlan,
	onCreateRatePlan,
	onCancel,
}: {
	branches: BranchOption[];
	selectedBranchId: string;
	isLoadingBranches: boolean;
	onBranchChange: (branchId: string) => void;
	onAttachRatePlan: () => void;
	onCreateRatePlan: () => void;
	onCancel: () => void;
}) {
	const form = useForm({
		defaultValues: {
			...createRentalOfferWithPricingBranchFormDefaultValues(),
			branchId: selectedBranchId,
		},
		validators: {
			onSubmit: createRentalOfferWithPricingBranchFormSchema,
		},
	});
	const hasSelectedBranch = selectedBranchId.trim().length > 0;
	const hasBranches = branches.length > 0;

	return (
		<div className="space-y-5">
			<form
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
				}}
			>
				<FieldGroup>
					<form.Field name="branchId">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel>Sucursal</FieldLabel>
									<Select
										value={field.state.value}
										onValueChange={(value) => {
											if (value) {
												field.handleChange(value);
												onBranchChange(value);
											}
										}}
										disabled={isLoadingBranches || !hasBranches}
									>
										<SelectTrigger aria-invalid={isInvalid}>
											<SelectValue
												placeholder={
													isLoadingBranches
														? "Cargando sucursales..."
														: "Selecciona una sucursal"
												}
											/>
										</SelectTrigger>
										<SelectContent>
											{branches.map((branch) => (
												<SelectItem key={branch.id} value={branch.id}>
													{branch.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{!isLoadingBranches && !hasBranches ? (
										<p className="text-muted-foreground text-sm">
											No hay sucursales activas disponibles para agregar esta
											oferta.
										</p>
									) : null}
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>
				</FieldGroup>
			</form>

			<div className="grid gap-3 sm:grid-cols-2">
				<PricingActionCard
					title="Vincular plan existente"
					description="Crea la oferta en esta sucursal y asígnale un plan de precios ya creado."
					disabled={!hasSelectedBranch}
					onClick={onAttachRatePlan}
				/>
				<PricingActionCard
					title="Crear nuevo plan"
					description="Crea la oferta en esta sucursal con un nuevo plan de precios."
					disabled={!hasSelectedBranch}
					onClick={onCreateRatePlan}
				/>
			</div>

			<div className="flex justify-end border-t pt-4">
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancelar
				</Button>
			</div>
		</div>
	);
}

function PricingActionCard({
	title,
	description,
	disabled,
	onClick,
}: {
	title: string;
	description: string;
	disabled: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className="group rounded-xl border bg-background p-4 text-left transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-background"
		>
			<div className="mb-3 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary group-disabled:bg-muted group-disabled:text-muted-foreground">
				<CircleDollarSign className="size-5" />
			</div>
			<p className="font-semibold text-sm">{title}</p>
			<p className="mt-1 text-muted-foreground text-sm">{description}</p>
		</button>
	);
}

function getAvailableBranches(
	branches: BranchOption[],
	offers: GetRentableItemDetailResponseDto["offers"],
): BranchOption[] {
	const existingBranchIds = new Set(offers.map((offer) => offer.branchId));
	return branches.filter((branch) => !existingBranchIds.has(branch.id));
}

function getDialogTitle(step: AddOfferDialogStep) {
	if (step === "attach-rate-plan") return "Vincular plan existente";
	if (step === "create-rate-plan") return "Crear nuevo plan";
	return "Agregar oferta en sucursal";
}

function getDialogDescription(
	step: AddOfferDialogStep,
	branchLabel: string,
): string {
	if (step === "attach-rate-plan") {
		return `Crea la oferta en ${branchLabel} y asígnale un plan de precios existente.`;
	}
	if (step === "create-rate-plan") {
		return `Crea la oferta en ${branchLabel} junto con un nuevo plan de precios.`;
	}
	return "Selecciona una sucursal activa y elige cómo quieres configurar sus precios.";
}

function getDialogContentClassName(step: AddOfferDialogStep) {
	return step === "create-rate-plan"
		? "max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-4xl"
		: undefined;
}
