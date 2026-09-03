import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { GetRentalDetailViewResponseDto } from "../get-rental-detail-view/get-rental-detail-view.schema";
import { useRentalDetailContext } from "../rental-detail.context";
import { rentalDetailViewQueries } from "../rental-detail.queries";
import {
	decimalsEqual,
	normalizeDecimal,
	parsePlainDecimal,
	subtractDecimals,
} from "./decimal-string";
import { toEditPriceAdjustmentUiError } from "./edit-price-adjustment.errors";
import { useEditPriceAdjustment } from "./edit-price-adjustment.mutation";

type V2Pricing = Extract<
	NonNullable<GetRentalDetailViewResponseDto["pricing"]>,
	{ kind: "V2" }
>;

interface UseEditPriceAdjustmentDialogInput {
	onClose: () => void;
}

function acceptedCalculatedTotal(pricing: V2Pricing): string {
	return pricing.manualPricingAdjustment?.previousTotal ?? pricing.total;
}

function adjustmentSignature(pricing: V2Pricing): string {
	const adjustment = pricing.manualPricingAdjustment;
	const target = adjustment ? parsePlainDecimal(adjustment.targetTotal) : null;
	return adjustment
		? JSON.stringify([
				target ? normalizeDecimal(target) : adjustment.targetTotal,
				adjustment.reason?.trim() ?? "",
			])
		: "none";
}

function pricingBasisSignature(pricing: V2Pricing): string {
	const lines = pricing.lines
		.map((line) => ({
			rentalOfferId: line.rentalOfferId,
			rentableItemId: line.rentableItemId,
			quantity: line.quantity,
			chargedUnits: line.chargedUnits,
			billingUnit: line.billingUnit,
			ratePlanId: line.ratePlanId ?? null,
			appliedTierId: line.appliedTierId ?? null,
			pricePerUnit: line.pricePerUnit,
			subtotal: line.subtotal,
			discountTotal: line.discountTotal,
			appliedAdjustments: line.appliedAdjustments
				.map((adjustment) => ({
					type: adjustment.type,
					promotionId: adjustment.promotionId,
					couponId: adjustment.couponId ?? null,
					name: adjustment.name,
					amount: adjustment.amount,
				}))
				.sort((left, right) =>
					JSON.stringify(left).localeCompare(JSON.stringify(right)),
				),
		}))
		.sort((left, right) =>
			`${left.rentalOfferId}:${left.rentableItemId}`.localeCompare(
				`${right.rentalOfferId}:${right.rentableItemId}`,
			),
		);
	const promotions = pricing.appliedPromotions
		.map((promotion) => ({
			promotionId: promotion.promotionId,
			name: promotion.name,
			activation: promotion.activation,
			effectType: promotion.effectType,
			effectValue: promotion.effectValue,
			amount: promotion.amount,
		}))
		.sort((left, right) => left.promotionId.localeCompare(right.promotionId));

	return JSON.stringify({
		currency: pricing.currency,
		acceptedTotal: acceptedCalculatedTotal(pricing),
		subtotal: pricing.subtotal,
		discountTotal: pricing.discountTotal,
		chargedDays: pricing.chargedDays,
		durationPolicySnapshot: pricing.durationPolicySnapshot,
		lines,
		promotions,
		coupon: pricing.appliedCoupon
			? {
					couponId: pricing.appliedCoupon.couponId,
					code: pricing.appliedCoupon.code,
					promotionId: pricing.appliedCoupon.promotionId,
					amount: pricing.appliedCoupon.amount,
				}
			: null,
	});
}

function initialAmount(pricing: V2Pricing): string {
	return pricing.manualPricingAdjustment?.targetTotal ?? "";
}

export function useEditPriceAdjustmentDialog({
	onClose,
}: UseEditPriceAdjustmentDialogInput) {
	const { rental } = useRentalDetailContext();
	if (!rental.pricing || rental.pricing.kind !== "V2") {
		throw new Error("Price adjustment requires V2 rental pricing.");
	}

	const pricing = rental.pricing;
	const queryClient = useQueryClient();
	const mutation = useEditPriceAdjustment();
	const remoteBasis = acceptedCalculatedTotal(pricing);
	const remoteBasisSignature = pricingBasisSignature(pricing);
	const remoteAdjustmentSignature = adjustmentSignature(pricing);
	const [sourceBasisSignature, setSourceBasisSignature] =
		useState(remoteBasisSignature);
	const [sourceAdjustmentSignature, setSourceAdjustmentSignature] = useState(
		remoteAdjustmentSignature,
	);
	const [targetTotal, setTargetTotal] = useState(() => initialAmount(pricing));
	const [reason, setReason] = useState(
		() => pricing.manualPricingAdjustment?.reason ?? "",
	);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [reconciliationMessage, setReconciliationMessage] = useState<
		string | null
	>(null);

	useEffect(() => {
		if (
			remoteBasisSignature === sourceBasisSignature &&
			remoteAdjustmentSignature === sourceAdjustmentSignature
		) {
			return;
		}

		setSourceBasisSignature(remoteBasisSignature);
		setSourceAdjustmentSignature(remoteAdjustmentSignature);
		setTargetTotal(initialAmount(pricing));
		setReason(pricing.manualPricingAdjustment?.reason ?? "");
		setReconciliationMessage(
			"El precio del pedido cambió. Restablecimos el ajuste con la información más reciente.",
		);
	}, [
		pricing,
		remoteAdjustmentSignature,
		remoteBasisSignature,
		sourceAdjustmentSignature,
		sourceBasisSignature,
	]);

	const parsedTarget = parsePlainDecimal(targetTotal);
	const parsedBasis = parsePlainDecimal(remoteBasis);
	const isTargetValid = parsedTarget !== null && parsedTarget.units > 0n;
	const currentAdjustment = pricing.manualPricingAdjustment;
	const parsedCurrentTarget = currentAdjustment
		? parsePlainDecimal(currentAdjustment.targetTotal)
		: null;
	const isSemanticallyUnchanged = currentAdjustment
		? parsedTarget !== null &&
			parsedCurrentTarget !== null &&
			decimalsEqual(parsedCurrentTarget, parsedTarget) &&
			(currentAdjustment.reason?.trim() ?? "") === reason.trim()
		: false;
	const difference =
		isTargetValid && parsedTarget && parsedBasis
			? subtractDecimals(parsedTarget, parsedBasis)
			: null;
	const canSubmit =
		isTargetValid && !isSemanticallyUnchanged && !mutation.isPending;

	function handleTargetTotalChange(value: string) {
		if (mutation.isPending) return;
		setTargetTotal(value);
		setErrorMessage(null);
		setReconciliationMessage(null);
	}

	function handleReasonChange(value: string) {
		if (mutation.isPending) return;
		setReason(value);
		setErrorMessage(null);
		setReconciliationMessage(null);
	}

	async function refreshAfterError() {
		await queryClient
			.fetchQuery(rentalDetailViewQueries.detail(rental.id))
			.catch(() => undefined);
	}

	async function handleSubmit() {
		if (!canSubmit || !parsedTarget) return;
		try {
			await mutation.mutateAsync({
				rentalId: rental.id,
				expectedVersion: rental.version,
				manualPricingAdjustment: {
					mode: "TARGET_TOTAL",
					targetTotal: normalizeDecimal(parsedTarget),
					...(reason.trim() ? { reason: reason.trim() } : {}),
				},
			});
			toast.success("Precio ajustado");
			onClose();
		} catch (error) {
			const uiError = toEditPriceAdjustmentUiError(error);
			setErrorMessage(uiError.message);
			if (uiError.shouldRefreshDetail) await refreshAfterError();
		}
	}

	async function handleRemove() {
		if (!currentAdjustment || mutation.isPending) return;
		try {
			await mutation.mutateAsync({
				rentalId: rental.id,
				expectedVersion: rental.version,
				manualPricingAdjustment: null,
			});
			toast.success("Ajuste de precio eliminado");
			onClose();
		} catch (error) {
			const uiError = toEditPriceAdjustmentUiError(error);
			setErrorMessage(uiError.message);
			if (uiError.shouldRefreshDetail) await refreshAfterError();
		}
	}

	return {
		currency: pricing.currency,
		acceptedCalculatedTotal: remoteBasis,
		targetTotal,
		reason,
		difference,
		hasAdjustment: currentAdjustment != null,
		isPending: mutation.isPending,
		isSaveDisabled: !canSubmit,
		errorMessage,
		reconciliationMessage,
		onTargetTotalChange: handleTargetTotalChange,
		onReasonChange: handleReasonChange,
		onSubmit: () => void handleSubmit(),
		onRemove: () => void handleRemove(),
	};
}
