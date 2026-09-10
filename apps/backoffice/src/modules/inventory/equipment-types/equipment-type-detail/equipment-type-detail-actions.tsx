import { createContext, type ReactNode, use } from "react";

type EquipmentTypeDetailActions = {
	openAddUnits: () => void;
};

const EquipmentTypeDetailActionsContext =
	createContext<EquipmentTypeDetailActions | null>(null);

export function EquipmentTypeDetailActionsProvider({
	value,
	children,
}: {
	value: EquipmentTypeDetailActions;
	children: ReactNode;
}) {
	return (
		<EquipmentTypeDetailActionsContext value={value}>
			{children}
		</EquipmentTypeDetailActionsContext>
	);
}

export function useEquipmentTypeDetailActions(): EquipmentTypeDetailActions {
	const actions = use(EquipmentTypeDetailActionsContext);
	if (!actions) {
		throw new Error(
			"useEquipmentTypeDetailActions must be used within EquipmentTypeDetailActionsProvider.",
		);
	}
	return actions;
}
