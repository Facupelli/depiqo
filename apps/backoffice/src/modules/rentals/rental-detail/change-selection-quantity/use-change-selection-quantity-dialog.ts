import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { rentalOfferAvailabilityQueries } from "../add-selection/rental-offer-availability.queries";
import { deriveConfirmedRentalEditAvailabilityPeriod } from "../confirmed-rental-edit-period";
import type { RentalDetailViewSelectionDto } from "../get-rental-detail-view/get-rental-detail-view.schema";
import { useRentalDetailContext } from "../rental-detail.context";
import { rentalDetailViewQueries } from "../rental-detail.queries";
import { toChangeSelectionQuantityUiError } from "./change-selection-quantity.errors";
import { useChangeSelectionQuantity } from "./change-selection-quantity.mutation";
import {
	canSubmitQuantityChange,
	deriveDemandLineReleaseRequirements,
	getAdditionalQuantity,
	getMaximumQuantity,
	getQuantityChangeMode,
} from "./change-selection-quantity.utils";

interface UseChangeSelectionQuantityDialogInput {
	selection: RentalDetailViewSelectionDto;
	onClose: () => void;
}

export function useChangeSelectionQuantityDialog({
	selection,
	onClose,
}: UseChangeSelectionQuantityDialogInput) {
	const { rental } = useRentalDetailContext();
	const queryClient = useQueryClient();
	const [capturedEditTime] = useState(() => new Date());
	const [quantity, setQuantity] = useState(selection.quantity);
	const [selectedReleaseAssetIds, setSelectedReleaseAssetIds] = useState<
		Set<string>
	>(() => new Set());
	const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(
		null,
	);
	const [sourceVersion, setSourceVersion] = useState(rental.version);
	const period = deriveConfirmedRentalEditAvailabilityPeriod(
		capturedEditTime,
		rental.period,
	);
	const availabilityQuery = useQuery(
		rentalOfferAvailabilityQueries.forInput({
			branchId: rental.branchId,
			...period,
			rentalOfferIds: [selection.rentalOfferId],
		}),
	);
	const availabilityItem = availabilityQuery.data?.find(
		(item) => item.rentalOfferId === selection.rentalOfferId,
	);
	const availabilityState = availabilityQuery.isError
		? ("error" as const)
		: availabilityItem
			? ("ready" as const)
			: ("checking" as const);
	const availableAdditionalUnits =
		availabilityState === "ready"
			? (availabilityItem?.availableCount ?? null)
			: null;
	const maximumQuantity =
		availabilityState === "ready"
			? getMaximumQuantity(selection.quantity, availableAdditionalUnits)
			: null;
	const mode = getQuantityChangeMode(selection.quantity, quantity);
	const releaseRequirements =
		mode === "decrease"
			? deriveDemandLineReleaseRequirements(selection, quantity)
			: [];
	const mutation = useChangeSelectionQuantity();

	useEffect(() => {
		if (rental.version === sourceVersion) return;
		setSourceVersion(rental.version);
		setQuantity(selection.quantity);
		setSelectedReleaseAssetIds(new Set());
		setSubmitErrorMessage(null);
	}, [rental.version, selection.quantity, sourceVersion]);

	useEffect(() => {
		if (
			mode === "increase" &&
			maximumQuantity !== null &&
			quantity > maximumQuantity
		) {
			setQuantity(maximumQuantity);
		}
	}, [maximumQuantity, mode, quantity]);

	function handleQuantityChange(nextQuantity: number) {
		if (mutation.isPending) return;
		const normalized = Math.max(1, Math.trunc(nextQuantity));
		const capped =
			normalized > selection.quantity && maximumQuantity !== null
				? Math.min(normalized, maximumQuantity)
				: normalized;
		setQuantity(capped);
		setSubmitErrorMessage(null);
		if (capped >= selection.quantity) {
			setSelectedReleaseAssetIds(new Set());
		}
	}

	function handleReleaseAssetToggle(assetId: string, checked: boolean) {
		if (mutation.isPending) return;
		setSubmitErrorMessage(null);
		setSelectedReleaseAssetIds((current) => {
			const next = new Set(current);
			if (checked) next.add(assetId);
			else next.delete(assetId);
			return next;
		});
	}

	const canSubmit = canSubmitQuantityChange({
		currentQuantity: selection.quantity,
		newQuantity: quantity,
		availableAdditionalUnits,
		availabilityState,
		releaseRequirements,
		selectedAssetIds: selectedReleaseAssetIds,
		isPending: mutation.isPending,
	});

	async function handleSubmit() {
		if (!canSubmit) return;
		try {
			await mutation.mutateAsync({
				rentalId: rental.id,
				selectionId: selection.id,
				expectedVersion: rental.version,
				quantity,
				...(mode === "decrease"
					? { releaseAssetIds: [...selectedReleaseAssetIds] }
					: {}),
			});
			toast.success("Cantidad actualizada");
			onClose();
		} catch (error) {
			const uiError = toChangeSelectionQuantityUiError(error);
			setSubmitErrorMessage(uiError.message);
			if (uiError.shouldRefreshDetail) {
				setQuantity(selection.quantity);
				setSelectedReleaseAssetIds(new Set());
				await queryClient
					.fetchQuery(rentalDetailViewQueries.detail(rental.id))
					.catch(() => undefined);
			}
			if (uiError.shouldRefreshAvailability) {
				await availabilityQuery.refetch().catch(() => undefined);
			}
		}
	}

	return {
		quantity,
		currentQuantity: selection.quantity,
		mode,
		additionalQuantity: getAdditionalQuantity(selection.quantity, quantity),
		maximumQuantity,
		availabilityState,
		availableAdditionalUnits,
		releaseRequirements,
		selectedReleaseAssetIds,
		onQuantityChange: handleQuantityChange,
		onReleaseAssetToggle: handleReleaseAssetToggle,
		submitErrorMessage,
		isSubmitting: mutation.isPending,
		isSubmitDisabled: !canSubmit,
		onSubmit: () => void handleSubmit(),
	};
}
