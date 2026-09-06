export type BranchScopeFilter =
	| { type: "inherit" }
	| { type: "all" }
	| { type: "branch"; branchId: string };
