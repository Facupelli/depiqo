import useCurrentBranchStore from "./current-branch.context";

export const useCurrentBranchId = () =>
	useCurrentBranchStore((state) => state.currentBranchId);

export function useSelectedBranch<T extends { id: string }>(branches: T[]) {
	const currentBranchId = useCurrentBranchId();

	return branches.find((branch) => branch.id === currentBranchId);
}

export const useCurrentBranchActions = () =>
	useCurrentBranchStore((state) => state.actions);
