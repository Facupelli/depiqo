import { useNavigate } from "@tanstack/react-router";
import { BranchesPage } from "@/modules/settings/branches/list-branches/BranchesPage";

export function BranchesSettingsScreen() {
	const navigate = useNavigate();

	return (
		<BranchesPage
			compact
			onCreateBranch={() => navigate({ to: "/dashboard/branches/new" })}
			onEditBranch={(branchId) =>
				navigate({
					to: "/dashboard/branches/$branchId/edit",
					params: { branchId },
				})
			}
		/>
	);
}
