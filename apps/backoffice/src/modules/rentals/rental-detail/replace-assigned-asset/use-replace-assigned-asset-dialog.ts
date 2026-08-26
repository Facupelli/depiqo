import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRentalDetailContext } from "../rental-detail.context";
import { rentalDetailViewQueries } from "../rental-detail.queries";
import { toReplaceAssignedAssetUiError } from "./replace-assigned-asset.errors";
import { useReplaceAssignedAsset } from "./replace-assigned-asset.mutation";
import { replacementAssetCandidateQueries } from "./replacement-asset-candidates.queries";

interface UseReplaceAssignedAssetDialogInput {
	currentAssignedAssetId: string | null;
	onClose: () => void;
}

export function useReplaceAssignedAssetDialog({
	currentAssignedAssetId,
	onClose,
}: UseReplaceAssignedAssetDialogInput) {
	const { rental } = useRentalDetailContext();
	const queryClient = useQueryClient();
	const mutation = useReplaceAssignedAsset();
	const [selectedReplacementAssetId, setSelectedReplacementAssetId] = useState<
		string | null
	>(null);
	const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(
		null,
	);
	const target = currentAssignedAssetId
		? (rental.selections
				.flatMap((selection) => selection.demandLines)
				.flatMap((demandLine) => demandLine.assignedAssets)
				.find((assignment) => assignment.assetId === currentAssignedAssetId) ??
			null)
		: null;
	const targetLabel = target
		? target.asset?.serialNumber?.trim() || target.assetId
		: null;
	const candidateQuery = useQuery(
		replacementAssetCandidateQueries.forAssignment(
			{
				rentalId: rental.id,
				currentAssignedAssetId: currentAssignedAssetId ?? "",
				rentalVersion: rental.version,
			},
			currentAssignedAssetId !== null && target !== null,
		),
	);
	const verifiedItems = candidateQuery.isFetching
		? []
		: (candidateQuery.data?.items ?? []);
	const selectedCandidate = verifiedItems.find(
		(candidate) => candidate.assetId === selectedReplacementAssetId,
	);
	const selectedReplacementLabel = selectedCandidate
		? selectedCandidate.serialNumber?.trim() || selectedCandidate.assetId
		: null;

	const handleClose = useCallback(() => {
		if (mutation.isPending) return;
		setSelectedReplacementAssetId(null);
		setSubmitErrorMessage(null);
		mutation.reset();
		onClose();
	}, [mutation, onClose]);

	useEffect(() => {
		if (currentAssignedAssetId && !target) handleClose();
	}, [currentAssignedAssetId, handleClose, target]);

	useEffect(() => {
		if (
			candidateQuery.isFetching ||
			!selectedReplacementAssetId ||
			!candidateQuery.data
		) {
			return;
		}
		if (
			!candidateQuery.data.items.some(
				(candidate) => candidate.assetId === selectedReplacementAssetId,
			)
		) {
			setSelectedReplacementAssetId(null);
		}
	}, [
		candidateQuery.data,
		candidateQuery.isFetching,
		selectedReplacementAssetId,
	]);

	const candidateState = candidateQuery.isPending
		? ("loading" as const)
		: candidateQuery.isFetching
			? ("refreshing" as const)
			: candidateQuery.isError
				? ("error" as const)
				: verifiedItems.length === 0
					? ("empty" as const)
					: ("success" as const);
	const canSubmit = Boolean(
		target &&
			selectedCandidate &&
			!mutation.isPending &&
			!candidateQuery.isFetching,
	);

	function handleSelect(assetId: string) {
		if (mutation.isPending || candidateQuery.isFetching) return;
		setSelectedReplacementAssetId(assetId);
		setSubmitErrorMessage(null);
	}

	async function handleSubmit() {
		if (!canSubmit || !target || !selectedCandidate) return;
		setSubmitErrorMessage(null);

		try {
			await mutation.mutateAsync({
				rentalId: rental.id,
				expectedVersion: rental.version,
				currentAssignedAssetId: target.assetId,
				replacementAssetId: selectedCandidate.assetId,
			});
			toast.success("Equipo reemplazado");
			handleClose();
		} catch (error) {
			const uiError = toReplaceAssignedAssetUiError(error);
			setSubmitErrorMessage(uiError.message);

			if (uiError.refreshCandidates) {
				setSelectedReplacementAssetId(null);
				await candidateQuery.refetch().catch(() => undefined);
			}
			if (uiError.refreshDetail) {
				await queryClient
					.fetchQuery(rentalDetailViewQueries.detail(rental.id))
					.catch(() => undefined);
				if (uiError.closeAsStale) handleClose();
			}
		}
	}

	return {
		target: target
			? { currentAssignedAssetId: target.assetId, label: targetLabel }
			: null,
		candidates: {
			state: candidateState,
			items: verifiedItems,
			retry: () => void candidateQuery.refetch(),
		},
		selectedReplacementAssetId,
		selectedReplacementLabel,
		replacementSummary:
			targetLabel && selectedReplacementLabel
				? `${targetLabel} → ${selectedReplacementLabel}`
				: null,
		submitErrorMessage,
		isSubmitting: mutation.isPending,
		canSubmit,
		selectReplacement: handleSelect,
		submit: () => void handleSubmit(),
		requestClose: handleClose,
	};
}
