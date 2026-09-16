import { createContext, type ReactNode, use } from "react";

type EquipmentTypeDetailContextValue = {
	actions: {
		openAddUnits: () => void;
	};
	capabilities: {
		manageInventory: boolean;
		manageOwnership: boolean;
		manageProducts: boolean;
		manageAvailability: boolean;
		managePricing: boolean;
		createProduct: boolean;
	};
};

const EquipmentTypeDetailContext =
	createContext<EquipmentTypeDetailContextValue | null>(null);

export function EquipmentTypeDetailProvider({
	value,
	children,
}: {
	value: EquipmentTypeDetailContextValue;
	children: ReactNode;
}) {
	return (
		<EquipmentTypeDetailContext value={value}>
			{children}
		</EquipmentTypeDetailContext>
	);
}

export function useEquipmentTypeDetail(): EquipmentTypeDetailContextValue {
	const context = use(EquipmentTypeDetailContext);
	if (!context) {
		throw new Error(
			"useEquipmentTypeDetail must be used within EquipmentTypeDetailProvider.",
		);
	}
	return context;
}
