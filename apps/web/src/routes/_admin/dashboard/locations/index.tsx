import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminRouteError } from "@/shared/components/admin-route-error";
import { useBranches } from "@/features/tenant-management/branch/branch.queries";
import { BranchesTable } from "@/features/tenant-management/branch/get-branches/components/branches-table";

export const Route = createFileRoute("/_admin/dashboard/locations/")({
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar el catálogo de sucursales."
				forbiddenMessage="No tienes permisos para ver las sucursales."
			/>
		);
	},
	component: BranchesPage,
});

function BranchesPage() {
	const navigate = useNavigate();

	return (
		<div className="space-y-6 p-8">
			<div className="flex items-start justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Sucursales</h1>
					<p className="text-sm text-muted-foreground">
						Gestiona los puntos operativos donde administras tu inventario.
					</p>
				</div>
				<Button onClick={() => navigate({ to: "/dashboard/locations/new" })}>
					<Plus className="mr-2 h-4 w-4" />
					Agregar sucursal
				</Button>
			</div>

			<BranchesList
				onEditBranch={(branchId) =>
					navigate({
						to: "/dashboard/locations/$branchId/edit",
						params: { branchId },
					})
				}
			/>
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
