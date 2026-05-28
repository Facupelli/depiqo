import type { GetRentalDetailResponseDto } from "@repo/api-contracts";
import { createContext, type ReactNode, useContext } from "react";

type RentalDetailContextValue = { rental: GetRentalDetailResponseDto };

const RentalDetailContext = createContext<RentalDetailContextValue | null>(
	null,
);

export function RentalDetailProvider({
	rental,
	children,
}: {
	rental: GetRentalDetailResponseDto;
	children: ReactNode;
}) {
	return (
		<RentalDetailContext.Provider value={{ rental }}>
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
