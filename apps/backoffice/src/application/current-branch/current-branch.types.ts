export const CURRENT_BRANCH_STORAGE_KEY = "selectedLocationId";

type CurrentBranchState = {
	currentBranchId: string;
};

type CurrentBranchActions = {
	actions: {
		setCurrentBranch: (id: string) => void;
	};
};

export type CurrentBranchStore = CurrentBranchState & CurrentBranchActions;
