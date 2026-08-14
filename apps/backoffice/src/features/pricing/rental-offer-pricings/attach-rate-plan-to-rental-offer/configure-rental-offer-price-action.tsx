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
	toCreatePricePlanDto,
	useCreatePricePlan,
} from "@/modules/pricing/price-plans/public";
import { useAttachRatePlanToRentalOffer } from "./attach-rate-plan-to-rental-offer.mutation";
import { toAttachRatePlanToRentalOfferDto } from "./attach-rate-plan-to-rental-offer.schema";
import {
	AttachRatePlanToRentalOfferForm,
	type AttachRatePlanToRentalOfferRatePlanOption,
} from "./attach-rate-plan-to-rental-offer-form";

type PriceAssignmentStep = "choose" | "existing" | "create";
type RentalOffer = GetRentableItemDetailResponseDto["offers"][number];

export function ConfigureRentalOfferPriceAction({
	offer,
	ratePlanOptions,
}: {
	offer: RentalOffer;
	ratePlanOptions: AttachRatePlanToRentalOfferRatePlanOption[];
}) {
	const attachFormId = useId();
	const createFormId = useId();
	const [open, setOpen] = useState(false);
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
	return (
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
				) : null}
				{step === "existing" ? (
					<AttachRatePlanToRentalOfferForm
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
