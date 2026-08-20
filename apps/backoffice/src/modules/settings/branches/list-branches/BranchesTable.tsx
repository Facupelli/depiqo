import type { GetBranchesBranchDto } from "@repo/api-contracts";
import { Badge } from "@repo/ui/components/badge";
import { MapPin } from "lucide-react";

interface BranchesTableProps {
	branches: GetBranchesBranchDto[];
	onEditBranch: (branchId: string) => void;
}

export function BranchesTable({ branches, onEditBranch }: BranchesTableProps) {
	if (branches.length === 0) {
		return (
			<div className="rounded-xl border border-dashed px-5 py-10 text-center text-sm text-muted-foreground">
				Todavía no has creado ninguna sucursal.
			</div>
		);
	}

	return (
		<div className="divide-y overflow-hidden rounded-xl border bg-card">
			{branches.map((branch) => (
				<button
					key={branch.id}
					type="button"
					onClick={() => onEditBranch(branch.id)}
					className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/60"
				>
					<span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
						<MapPin className="size-5" />
					</span>
					<span className="min-w-0 flex-1">
						<span className="block text-sm font-semibold text-foreground">
							{branch.name}
						</span>
						<span className="mt-0.5 block truncate text-sm text-muted-foreground">
							{branch.address || "Sin dirección configurada"}
						</span>
					</span>
					{!branch.isActive ? (
						<Badge variant="outline" className="shrink-0 text-muted-foreground">
							Inactiva
						</Badge>
					) : null}
				</button>
			))}
		</div>
	);
}
