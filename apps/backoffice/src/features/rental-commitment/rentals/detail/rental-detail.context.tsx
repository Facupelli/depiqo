import type { GetCustomerSummaryResponseDto } from "@repo/api-contracts";
import { createContext, type ReactNode, useContext } from "react";
import type { GetRentalDetailViewResponseDto } from "./get-rental-detail-view/get-rental-detail-view.schema";

type RentalDetailContextValue = {
	rental: GetRentalDetailViewResponseDto;
	customerSummary: GetCustomerSummaryResponseDto | null;
	isCustomerSummaryLoading: boolean;
	isCustomerSummaryError: boolean;
	tenantTimezone: string | undefined;
};

const RentalDetailContext = createContext<RentalDetailContextValue | null>(
	null,
);

export function RentalDetailProvider({
	rental,
	customerSummary,
	isCustomerSummaryLoading = false,
	isCustomerSummaryError = false,
	tenantTimezone,
	children,
}: {
	rental: GetRentalDetailViewResponseDto;
	customerSummary: GetCustomerSummaryResponseDto | null;
	isCustomerSummaryLoading?: boolean;
	isCustomerSummaryError?: boolean;
	tenantTimezone: string | undefined;
	children: ReactNode;
}) {
	return (
		<RentalDetailContext.Provider
			value={{
				rental,
				customerSummary,
				isCustomerSummaryLoading,
				isCustomerSummaryError,
				tenantTimezone,
			}}
		>
			{children}
		</RentalDetailContext.Provider>
	);
}

export function useRentalDetailContext() {
	const context = useContext(RentalDetailContext);
	if (!context) {
		throw new Error(
			"useRentalDetailContext must be used within RentalDetailProvider",
		);
	}
	return context;
}
