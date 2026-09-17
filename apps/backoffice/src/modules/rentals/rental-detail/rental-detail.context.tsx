import type {
	GetCustomerSummaryResponseDto,
	GetRentalContractSigningSummaryResponseDto,
	TenantPermission,
} from "@repo/api-contracts";
import { createContext, type ReactNode, useContext } from "react";
import type { GetRentalDetailViewResponseDto } from "./get-rental-detail-view/get-rental-detail-view.schema";

type RentalDetailContextValue = {
	rental: GetRentalDetailViewResponseDto;
	permissions: readonly TenantPermission[];
	customerSummary: GetCustomerSummaryResponseDto | null;
	isCustomerSummaryLoading: boolean;
	isCustomerSummaryError: boolean;
	contractSigningSummary: GetRentalContractSigningSummaryResponseDto | null;
	isContractSigningSummaryLoading: boolean;
	isContractSigningSummaryError: boolean;
};

const RentalDetailContext = createContext<RentalDetailContextValue | null>(
	null,
);

export function RentalDetailProvider({
	rental,
	permissions,
	customerSummary,
	isCustomerSummaryLoading = false,
	isCustomerSummaryError = false,
	contractSigningSummary,
	isContractSigningSummaryLoading = false,
	isContractSigningSummaryError = false,
	children,
}: {
	rental: GetRentalDetailViewResponseDto;
	permissions: readonly TenantPermission[];
	customerSummary: GetCustomerSummaryResponseDto | null;
	isCustomerSummaryLoading?: boolean;
	isCustomerSummaryError?: boolean;
	contractSigningSummary: GetRentalContractSigningSummaryResponseDto | null;
	isContractSigningSummaryLoading?: boolean;
	isContractSigningSummaryError?: boolean;
	children: ReactNode;
}) {
	return (
		<RentalDetailContext.Provider
			value={{
				rental,
				permissions,
				customerSummary,
				isCustomerSummaryLoading,
				isCustomerSummaryError,
				contractSigningSummary,
				isContractSigningSummaryLoading,
				isContractSigningSummaryError,
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
