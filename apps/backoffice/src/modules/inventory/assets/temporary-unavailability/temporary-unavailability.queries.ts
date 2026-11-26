import {
	queryOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { draftRentalOfferKeys } from "@/modules/rentals/draft-rental-composer/draft-rental-offers.queries";
import { rentalOfferSearchKeys } from "@/modules/rentals/rental-detail/add-selection/rental-offer-search.queries";
import { rentalAccessoryDefaultKeys } from "@/modules/rentals/rental-detail/preparation/accessories/rental-accessory-defaults.queries";
import { replacementAssetCandidateKeys } from "@/modules/rentals/rental-detail/replace-assigned-asset/replacement-asset-candidates.queries";
import { rentalOfferAvailabilityKeys } from "@/modules/rentals/shared/rental-offers/rental-offer-availability.queries";
import { ProblemDetailsError } from "@/shared/errors";
import {
	changeUnavailability,
	listUnavailability,
	type UnavailabilityChange,
} from "./temporary-unavailability.api";

export function unavailabilityQuery(assetId: string) {
	return queryOptions({
		queryKey: [
			"v2",
			"asset-inventory",
			"assets",
			assetId,
			"unavailability-periods",
		] as const,
		queryFn: ({ signal }) => listUnavailability(assetId, signal),
		staleTime: 0,
	});
}

const replacementPrefix = replacementAssetCandidateKeys.all("");

export function isPeriodNoLongerEditable(error: unknown) {
	return (
		error instanceof ProblemDetailsError &&
		error.problemDetails.code === "asset_unavailability.not_editable"
	);
}

export function unavailabilityErrorMessage(error: unknown) {
	const code =
		error instanceof ProblemDetailsError
			? error.problemDetails.code
			: undefined;
	switch (code) {
		case "asset_unavailability.overlap":
			return "La unidad ya tiene una reserva u otro bloqueo en ese horario. Elegí otro horario.";
		case "asset_unavailability.invalid_window":
			return "Revisá las fechas. El fin debe quedar en el futuro y ser posterior al inicio.";
		case "asset_unavailability.not_editable":
			return "El bloqueo cambió y ya no admite esa acción. Revisá su estado actual antes de continuar.";
		default:
			return "No pudimos guardar el cambio. Intentá nuevamente.";
	}
}

export function useChangeUnavailability(assetId: string) {
	const client = useQueryClient();
	const queryKey = unavailabilityQuery(assetId).queryKey;
	return useMutation({
		mutationFn: (change: UnavailabilityChange) =>
			changeUnavailability(assetId, change),
		meta: {
			invalidates: [
				queryKey,
				rentalOfferAvailabilityKeys.availability(),
				draftRentalOfferKeys.searches(),
				rentalOfferSearchKeys.searches(),
				rentalAccessoryDefaultKeys.all(),
			],
		},
		onSuccess: () =>
			client.invalidateQueries({
				predicate: ({ queryKey }) =>
					replacementPrefix.every(
						(part, index) => part === "" || queryKey[index] === part,
					),
			}),
		onError: async (error) => {
			if (isPeriodNoLongerEditable(error))
				await client.invalidateQueries({ queryKey });
		},
	});
}
