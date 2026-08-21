import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { Suspense, useId, useState } from "react";
import { useAppForm } from "@/shared/contexts/form.context";
import { createPricePlanBaseFormSchema } from "../create-price-plan/create-price-plan.schema";
import { PricePlanFields } from "../create-price-plan/PricePlanFields";
import { useEditPricePlan } from "./edit-price-plan.mutation";
import { usePricePlanDetail } from "./edit-price-plan.queries";
import {
	fromPricePlanDetailToFormValues,
	toEditPricePlanDto,
} from "./edit-price-plan.schema";

export function EditPricePlanDialog({
	ratePlanId,
	open,
	onOpenChange,
}: {
	ratePlanId: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{ratePlanId && open ? (
				<Suspense
					fallback={
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Editar plan de precios</DialogTitle>
								<DialogDescription>Cargando plan...</DialogDescription>
							</DialogHeader>
						</DialogContent>
					}
				>
					<EditPricePlanDialogContent
						key={ratePlanId}
						ratePlanId={ratePlanId}
						onClose={() => onOpenChange(false)}
					/>
				</Suspense>
			) : null}
		</Dialog>
	);
}

function EditPricePlanDialogContent({
	ratePlanId,
	onClose,
}: {
	ratePlanId: string;
	onClose: () => void;
}) {
	const formId = useId();
	const impactAcknowledgementId = useId();
	const { data: pricePlan } = usePricePlanDetail(ratePlanId);
	const editPricePlanMutation = useEditPricePlan();
	const [impactAcknowledged, setImpactAcknowledged] = useState(false);
	const affectedOffers = pricePlan.assignments
		.map((assignment) => assignment.rentalOffer)
		.filter((offer) => offer !== null);
	const hasUnavailableAssignments =
		affectedOffers.length !== pricePlan.assignments.length;
	const requiresImpactAcknowledgement = affectedOffers.length > 1;
	const form = useAppForm({
		defaultValues: fromPricePlanDetailToFormValues(pricePlan),
		validators: { onSubmit: createPricePlanBaseFormSchema },
		onSubmit: async ({ value }) => {
			if (
				hasUnavailableAssignments ||
				(requiresImpactAcknowledgement && !impactAcknowledged)
			) {
				return;
			}

			await editPricePlanMutation.mutateAsync({
				ratePlanId,
				body: toEditPricePlanDto(
					value,
					affectedOffers.map((offer) => offer.id),
				),
			});
			onClose();
		},
	});

	return (
		<DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-4xl">
			<DialogHeader>
				<DialogTitle>Editar plan de precios</DialogTitle>
				<DialogDescription>
					Los cambios se aplicarán a todas las ofertas que usan este plan.
				</DialogDescription>
			</DialogHeader>
			<form
				id={formId}
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-8"
			>
				<PricePlanFields form={form} />
			</form>
			{hasUnavailableAssignments ? (
				<p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm">
					No podemos confirmar todas las ofertas afectadas por este plan.
					Recarga la página e inténtalo de nuevo.
				</p>
			) : null}
			{requiresImpactAcknowledgement ? (
				<section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
					<div>
						<p className="font-medium text-amber-950 text-sm">
							Este plan se usa en {affectedOffers.length} ofertas
						</p>
						<p className="mt-1 text-amber-900 text-sm">
							Editar sus precios afectará a todas estas ofertas.
						</p>
					</div>
					<ul className="list-inside list-disc text-amber-900 text-sm">
						{affectedOffers.map((offer) => (
							<li key={offer.id}>
								{offer.rentableItemName} - {offer.branchId}
							</li>
						))}
					</ul>
					<label
						htmlFor={impactAcknowledgementId}
						className="flex items-start gap-2 text-amber-950 text-sm"
					>
						<Checkbox
							id={impactAcknowledgementId}
							checked={impactAcknowledged}
							onCheckedChange={(checked) =>
								setImpactAcknowledged(checked === true)
							}
						/>
						<span>
							Entiendo que estos cambios afectarán a todas las ofertas.
						</span>
					</label>
				</section>
			) : null}
			<div className="flex justify-end gap-3 border-t pt-4">
				<Button
					type="button"
					variant="outline"
					onClick={onClose}
					disabled={editPricePlanMutation.isPending}
				>
					Cancelar
				</Button>
				<form.Subscribe
					selector={(state) => [
						state.canSubmit,
						state.isSubmitting,
						state.isDirty,
					]}
				>
					{([canSubmit, isSubmitting, isDirty]) => (
						<Button
							type="submit"
							form={formId}
							disabled={
								!canSubmit ||
								!isDirty ||
								isSubmitting ||
								editPricePlanMutation.isPending ||
								hasUnavailableAssignments ||
								(requiresImpactAcknowledgement && !impactAcknowledged)
							}
						>
							{isSubmitting || editPricePlanMutation.isPending
								? "Guardando..."
								: "Guardar cambios"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</DialogContent>
	);
}
