import type { GetRentableItemDetailResponseDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { CircleDollarSign } from "lucide-react";
import { useId, useState } from "react";
import {
	CreatePricePlanForm,
	EditPricePlanDialog,
	toCreatePricePlanDto,
	useCreatePricePlan,
} from "@/modules/pricing/price-plans/public";
import { formatPriceSummary } from "../../product-detail/product-detail.utils";
import {
	type PricePlanOption,
	PricePlanSelectionForm,
} from "../price-plan-selection/PricePlanSelectionForm";
import { useAttachRatePlanToRentalOffer } from "./set-price-plan.mutation";
import { toAttachRatePlanToRentalOfferDto } from "./set-price-plan.schema";

type PriceAssignmentStep = "choose" | "existing" | "create";
type RentalOffer = GetRentableItemDetailResponseDto["offers"][number];

export function SetPricePlanAction({
	offer,
	ratePlanOptions,
}: {
	offer: RentalOffer;
	ratePlanOptions: PricePlanOption[];
}) {
	const attachFormId = useId();
	const createFormId = useId();
	const [open, setOpen] = useState(false);
	const [editingRatePlanId, setEditingRatePlanId] = useState<string | null>(
		null,
	);
	const [step, setStep] = useState<PriceAssignmentStep>("choose");
	const attachMutation = useAttachRatePlanToRentalOffer();
	const createRatePlanMutation = useCreatePricePlan();
	const branchLabel = offer.branchName ?? offer.branchId;
	const canAssign =
		offer.setupSummary.availableActions.includes("ASSIGN_PRICE");
	const canEdit = offer.setupSummary.availableActions.includes("EDIT_PRICING");
	if (!canAssign && !canEdit) return null;
	function handleOpenChange(nextOpen: boolean) {
		setOpen(nextOpen);
		if (!nextOpen) setStep("choose");
	}
	function handleEditCurrentPlan() {
		const ratePlanId = offer.setupSummary.priceSummary?.ratePlanId;
		if (!ratePlanId) return;
		handleOpenChange(false);
		setEditingRatePlanId(ratePlanId);
	}
	return (
		<>
			<Dialog open={open} onOpenChange={handleOpenChange}>
				<Button
					type="button"
					variant={canAssign ? "default" : "outline"}
					onClick={() => setOpen(true)}
				>
					<CircleDollarSign className="mr-2 size-4" />
					{canAssign ? "Asignar precio" : "Editar precio"}
				</Button>
				<DialogContent
					className={
						step === "create"
							? "max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-4xl"
							: undefined
					}
				>
					<DialogHeader>
						<DialogTitle>
							{step === "choose"
								? `${canAssign ? "Asignar" : "Editar"} precio a ${branchLabel}`
								: step === "existing"
									? "Usar plan existente"
									: "Crear nuevo plan"}
						</DialogTitle>
						<DialogDescription>
							{step === "choose"
								? "Selecciona un plan existente o crea uno nuevo para esta oferta."
								: `El plan quedará asignado a la oferta de ${branchLabel}.`}
						</DialogDescription>
					</DialogHeader>
					{step === "choose" ? (
						<div className="space-y-5">
							{offer.setupSummary.priceSummary ? (
								<section className="space-y-2">
									<p className="font-medium text-sm">Plan actual</p>
									<CurrentPricePlanButton
										name={offer.setupSummary.priceSummary.ratePlanName}
										price={formatPriceSummary(offer.setupSummary.priceSummary)}
										onClick={handleEditCurrentPlan}
									/>
								</section>
							) : null}
							<section className="space-y-2">
								<p className="font-medium text-sm">
									Cambiar la configuración de precio
								</p>
								<div className="grid gap-3 sm:grid-cols-2">
									<PricingChoiceButton
										title="Usar plan existente"
										description="Asigna a esta oferta un plan de precios reutilizable."
										disabled={ratePlanOptions.length === 0}
										onClick={() => setStep("existing")}
									/>
									<PricingChoiceButton
										title="Crear nuevo plan"
										description="Crea un plan de precios y asígnalo a esta oferta."
										onClick={() => setStep("create")}
									/>
								</div>
							</section>
						</div>
					) : null}
					{step === "existing" ? (
						<PricePlanSelectionForm
							formId={attachFormId}
							ratePlanOptions={ratePlanOptions}
							isPending={attachMutation.isPending}
							submitLabel="Asignar plan"
							pendingLabel="Asignando..."
							onSubmit={async (values) => {
								const body = toAttachRatePlanToRentalOfferDto(values, {
									catalogRentalOfferId: offer.rentalOfferId,
								});
								await attachMutation.mutateAsync({ body });
								handleOpenChange(false);
							}}
							onCancel={() => setStep("choose")}
						/>
					) : null}
					{step === "create" ? (
						<CreatePricePlanForm
							formId={createFormId}
							isPending={
								createRatePlanMutation.isPending || attachMutation.isPending
							}
							submitLabel="Crear y asignar plan"
							pendingLabel="Creando y asignando..."
							onSubmit={async (values) => {
								const ratePlan = await createRatePlanMutation.mutateAsync(
									toCreatePricePlanDto({ ...values, isActive: true }),
								);
								await attachMutation.mutateAsync({
									body: toAttachRatePlanToRentalOfferDto(
										{ ratePlanId: ratePlan.id },
										{
											catalogRentalOfferId: offer.rentalOfferId,
										},
									),
								});
								handleOpenChange(false);
							}}
							onCancel={() => setStep("choose")}
						/>
					) : null}
				</DialogContent>
			</Dialog>
			<EditPricePlanDialog
				ratePlanId={editingRatePlanId}
				open={editingRatePlanId !== null}
				onOpenChange={(nextOpen) => {
					if (!nextOpen) setEditingRatePlanId(null);
				}}
			/>
		</>
	);
}

function CurrentPricePlanButton({
	name,
	price,
	onClick,
}: {
	name: string;
	price: string;
	onClick: () => void;
}) {
	return (
		<div className="flex flex-col gap-3 rounded-xl border border-blue-700 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<p className="font-semibold text-sm">{name}</p>
				<p className="mt-1 text-lg">{price}</p>
			</div>
			<Button
				type="button"
				variant="outline"
				className="bg-blue-700 text-white hover:bg-blue-500 hover:text-white"
				onClick={onClick}
			>
				Editar plan actual
			</Button>
		</div>
	);
}

function PricingChoiceButton({
	title,
	description,
	disabled = false,
	onClick,
}: {
	title: string;
	description: string;
	disabled?: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			disabled={disabled}
			onClick={onClick}
			className="rounded-xl border bg-background p-4 text-left transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
		>
			<CircleDollarSign className="mb-3 size-5 text-primary" />
			<p className="font-semibold text-sm">{title}</p>
			<p className="mt-1 text-muted-foreground text-sm">{description}</p>
		</button>
	);
}
