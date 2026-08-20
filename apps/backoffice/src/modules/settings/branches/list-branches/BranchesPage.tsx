import { Button } from "@repo/ui/components/button";
import { Plus } from "lucide-react";
import { useBranches } from "../branches.queries";
import { BranchesTable } from "./BranchesTable";

type BranchesPageProps = {
	compact?: boolean;
	onCreateBranch: () => void;
	onEditBranch: (branchId: string) => void;
};

export function BranchesPage({
	compact = false,
	onCreateBranch,
	onEditBranch,
}: BranchesPageProps) {
	return (
		<div className={compact ? "space-y-6" : "space-y-6 p-8"}>
			<div className="flex items-start justify-between">
				{compact ? null : (
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">
							Sucursales
						</h1>
						<p className="text-sm text-muted-foreground">
							Gestiona los puntos operativos donde administras tu inventario.
						</p>
					</div>
				)}
				<Button
					className={compact ? "ml-auto" : undefined}
					onClick={onCreateBranch}
				>
					<Plus className="mr-2 h-4 w-4" />
					Agregar sucursal
				</Button>
			</div>

			<BranchesList onEditBranch={onEditBranch} />
		</div>
	);
}

function BranchesList({
	onEditBranch,
}: {
	onEditBranch: (branchId: string) => void;
}) {
	const { data: branches = [], isPending, isError } = useBranches();

	if (isError) {
		return (
			<p className="text-sm text-destructive">
				No pudimos cargar las sucursales. Inténtalo nuevamente.
			</p>
		);
	}

	if (isPending) {
		return <p className="text-sm text-muted-foreground">Cargando...</p>;
	}

	return <BranchesTable branches={branches} onEditBranch={onEditBranch} />;
}
