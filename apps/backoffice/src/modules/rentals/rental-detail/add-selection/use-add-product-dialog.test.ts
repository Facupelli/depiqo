// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAddProductDialog } from "./use-add-product-dialog";

const testState = vi.hoisted(() => ({
	availableCount: 5,
	availabilityIsError: false,
	isAlreadyAdded: false,
	isOfferVisible: true,
}));

const offer = {
	id: "offer-1",
	name: "Sony",
	description: null,
	image: null,
	kind: "product",
};

vi.mock("@tanstack/react-query", async (importOriginal) => {
	const original =
		await importOriginal<typeof import("@tanstack/react-query")>();
	return {
		...original,
		useQueryClient: () => ({ fetchQuery: vi.fn() }),
		useQuery: (options: { queryKey: readonly unknown[] }) => {
			const key = JSON.stringify(options.queryKey);
			if (key.includes("rental-offer-search")) {
				return {
					data: {
						data: testState.isOfferVisible ? [offer] : [],
						pageSize: 10,
						total: testState.isOfferVisible ? 1 : 0,
					},
					isPending: false,
					isFetching: false,
					isError: false,
				};
			}
			if (key.includes("rental-offer-availability")) {
				return {
					data: testState.availabilityIsError
						? undefined
						: [
								{
									rentalOfferId: offer.id,
									availableCount: testState.availableCount,
								},
							],
					isPending: false,
					isError: testState.availabilityIsError,
					refetch: vi.fn(),
				};
			}
			return { data: { name: "Main" }, isPending: false, isError: false };
		},
	};
});

vi.mock("../rental-detail.context", () => ({
	useRentalDetailContext: () => ({
		rental: {
			id: "rental-1",
			branchId: "branch-1",
			version: 1,
			period: { start: "2026-01-01", end: "2026-01-02" },
			selections: testState.isAlreadyAdded ? [{ rentalOfferId: offer.id }] : [],
		},
	}),
}));

vi.mock("./add-selection.mutation", () => ({
	useAddRentalSelection: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

vi.mock("@/shared/hooks/use-debounce", () => ({
	useDebounce: (value: string) => value,
}));

vi.mock("@/lib/r2-public-url", () => ({ buildR2PublicUrl: () => null }));

function selectOfferAndSetQuantity(
	result: ReturnType<typeof renderDialogHook>["result"],
	quantity: number,
) {
	act(() => {
		result.current.onSelectOffer(offer.id);
	});
	act(() => {
		result.current.onQuantityChange(quantity);
	});
}

function renderDialogHook() {
	return renderHook(() => useAddProductDialog({ onClose: vi.fn() }));
}

beforeEach(() => {
	testState.availableCount = 5;
	testState.availabilityIsError = false;
	testState.isAlreadyAdded = false;
	testState.isOfferVisible = true;
});

describe("useAddProductDialog selection state", () => {
	it("lowers quantity when availability falls below it", async () => {
		const hook = renderDialogHook();
		selectOfferAndSetQuantity(hook.result, 5);

		testState.availableCount = 3;
		hook.rerender();

		await waitFor(() => expect(hook.result.current.quantity).toBe(3));
	});

	it("does not raise quantity when availability recovers", async () => {
		testState.availableCount = 3;
		const hook = renderDialogHook();
		selectOfferAndSetQuantity(hook.result, 3);

		testState.availableCount = 5;
		hook.rerender();

		await waitFor(() => expect(hook.result.current.quantity).toBe(3));
	});

	it("clears selection when the selected offer becomes unavailable", async () => {
		const hook = renderDialogHook();
		selectOfferAndSetQuantity(hook.result, 2);

		testState.availableCount = 0;
		hook.rerender();

		await waitFor(() => {
			expect(hook.result.current.offers[0]?.isSelected).toBe(false);
			expect(hook.result.current.quantity).toBe(1);
		});
	});

	it("clears selection when the selected offer becomes already added", async () => {
		const hook = renderDialogHook();
		selectOfferAndSetQuantity(hook.result, 2);

		testState.isAlreadyAdded = true;
		hook.rerender();

		await waitFor(() => {
			expect(hook.result.current.offers[0]?.isSelected).toBe(false);
			expect(hook.result.current.quantity).toBe(1);
		});
	});

	it("does not restore a cleared selection when availability recovers", async () => {
		const hook = renderDialogHook();
		selectOfferAndSetQuantity(hook.result, 2);

		testState.availableCount = 0;
		hook.rerender();
		await waitFor(() =>
			expect(hook.result.current.offers[0]?.isSelected).toBe(false),
		);

		testState.availableCount = 5;
		hook.rerender();

		expect(hook.result.current.offers[0]?.isSelected).toBe(false);
		expect(hook.result.current.quantity).toBe(1);
	});
});
