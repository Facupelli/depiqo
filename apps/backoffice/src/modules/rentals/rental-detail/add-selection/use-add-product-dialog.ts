import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { buildR2PublicUrl } from "@/lib/r2-public-url";
import { branchQueries } from "@/modules/settings/branches/public";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { deriveConfirmedRentalEditAvailabilityPeriod } from "../confirmed-rental-edit-period";
import { useRentalDetailContext } from "../rental-detail.context";
import { rentalDetailViewQueries } from "../rental-detail.queries";
import { toAddSelectionUiError } from "./add-selection.errors";
import { useAddRentalSelection } from "./add-selection.mutation";
import {
	type AddProductOfferAvailability,
	type AddProductOfferOption,
	isOfferSelectable,
	isSelectedOfferSubmittable,
} from "./add-selection.utils";
import { rentalOfferAvailabilityQueries } from "./rental-offer-availability.queries";
import { rentalOfferSearchQueries } from "./rental-offer-search.queries";

const SEARCH_DEBOUNCE_MS = 250;

interface UseAddProductDialogInput {
	onClose: () => void;
}

export function useAddProductDialog({ onClose }: UseAddProductDialogInput) {
	const { rental } = useRentalDetailContext();
	const queryClient = useQueryClient();
	const [capturedEditTime] = useState(() => new Date());
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
	const [quantity, setQuantity] = useState(1);
	const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(
		null,
	);
	const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS).trim();

	const branchQuery = useQuery(branchQueries.detail(rental.branchId));

	const offersQuery = useQuery(
		rentalOfferSearchQueries.search({
			branchId: rental.branchId,
			search: debouncedSearch || undefined,
			page,
		}),
	);

	const offers = offersQuery.data?.data ?? [];
	const totalPageCount =
		offersQuery.data && offersQuery.data.pageSize > 0
			? Math.max(
					Math.ceil(offersQuery.data.total / offersQuery.data.pageSize),
					1,
				)
			: 0;

	const addedRentalOfferIds = new Set(
		rental.selections.map((selection) => selection.rentalOfferId),
	);

	const editAvailabilityPeriod = deriveConfirmedRentalEditAvailabilityPeriod(
		capturedEditTime,
		rental.period,
	);
	const availabilityQuery = useQuery(
		rentalOfferAvailabilityQueries.forInput({
			branchId: rental.branchId,
			...editAvailabilityPeriod,
			rentalOfferIds: offers.map((offer) => offer.id),
		}),
	);
	const availableCountByRentalOfferId = new Map(
		(availabilityQuery.data ?? []).map((item) => [
			item.rentalOfferId,
			item.availableCount,
		]),
	);

	function getOfferAvailability(
		rentalOfferId: string,
	): AddProductOfferAvailability {
		if (availabilityQuery.isError) {
			return "error";
		}
		if (availabilityQuery.isPending) {
			return "checking";
		}
		const availableCount = availableCountByRentalOfferId.get(rentalOfferId);
		if (availableCount === undefined) {
			return "error";
		}
		return availableCount > 0 ? "available" : "unavailable";
	}

	const offerOptions: AddProductOfferOption[] = offers.map((offer) => {
		const availability = getOfferAvailability(offer.id);
		const availableCount = availableCountByRentalOfferId.get(offer.id) ?? null;
		const isAdded = addedRentalOfferIds.has(offer.id);
		const isSelected =
			selectedOfferId === offer.id &&
			isOfferSelectable({ isAdded, availability });

		return {
			offer,
			imageUrl: buildR2PublicUrl(offer.image, "catalog"),
			isAdded,
			isSelected,
			availability,
			availableCount,
		};
	});

	const selectedOfferOption = selectedOfferId
		? (offerOptions.find((option) => option.offer.id === selectedOfferId) ??
			null)
		: null;
	const selectedOption = selectedOfferOption?.isSelected
		? selectedOfferOption
		: null;
	const selectedOfferExists = selectedOfferOption !== null;
	const selectedOfferIsAdded = selectedOfferOption?.isAdded ?? false;
	const selectedOfferAvailability = selectedOfferOption?.availability ?? null;
	const selectedOfferAvailableCount =
		selectedOfferOption?.availableCount ?? null;

	useEffect(() => {
		if (!selectedOfferId) {
			return;
		}

		if (
			!selectedOfferExists ||
			!isOfferSelectable({
				isAdded: selectedOfferIsAdded,
				availability: selectedOfferAvailability ?? "error",
			})
		) {
			setSelectedOfferId(null);
			setQuantity(1);
			return;
		}

		if (
			selectedOfferAvailableCount !== null &&
			quantity > selectedOfferAvailableCount
		) {
			setQuantity(selectedOfferAvailableCount);
		}
	}, [
		quantity,
		selectedOfferAvailableCount,
		selectedOfferAvailability,
		selectedOfferExists,
		selectedOfferId,
		selectedOfferIsAdded,
	]);

	const addSelection = useAddRentalSelection();

	function handleSearchChange(value: string) {
		setSearch(value);
		setPage(1);
		setSelectedOfferId(null);
		setQuantity(1);
		setSubmitErrorMessage(null);
	}

	function handlePageChange(nextPage: number) {
		setPage(nextPage);
		setSelectedOfferId(null);
		setQuantity(1);
		setSubmitErrorMessage(null);
	}

	function handleSelectOffer(offerId: string) {
		setSubmitErrorMessage(null);
		if (selectedOfferId === offerId) {
			setSelectedOfferId(null);
			setQuantity(1);
			return;
		}
		setSelectedOfferId(offerId);
		setQuantity(1);
	}

	function handleQuantityChange(nextQuantity: number) {
		setQuantity(nextQuantity);
		setSubmitErrorMessage(null);
	}

	async function handleSubmit() {
		if (
			!selectedOption ||
			!isSelectedOfferSubmittable(selectedOption, quantity)
		) {
			return;
		}

		try {
			await addSelection.mutateAsync({
				rentalId: rental.id,
				expectedVersion: rental.version,
				rentalOfferId: selectedOption.offer.id,
				quantity,
			});
			toast.success("Producto agregado al pedido");
			onClose();
		} catch (error) {
			const uiError = toAddSelectionUiError(error);
			setSubmitErrorMessage(uiError.message);

			if (uiError.shouldRefreshDetail) {
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
		branchName: branchQuery.data?.name ?? null,
		branchState: branchQuery.isPending
			? ("loading" as const)
			: branchQuery.isError
				? ("error" as const)
				: ("ready" as const),

		search,
		onSearchChange: handleSearchChange,

		offers: offerOptions,
		areOffersPending: offersQuery.isPending,
		areOffersFetching: offersQuery.isFetching,
		areOffersErrored: offersQuery.isError,

		page,
		totalPageCount,
		onPageChange: handlePageChange,

		quantity,
		onSelectOffer: handleSelectOffer,
		onQuantityChange: handleQuantityChange,

		submitErrorMessage,
		isSubmitting: addSelection.isPending,
		isSubmitDisabled:
			!isSelectedOfferSubmittable(selectedOption, quantity) ||
			addSelection.isPending,
		onSubmit: () => {
			void handleSubmit();
		},
	};
}
