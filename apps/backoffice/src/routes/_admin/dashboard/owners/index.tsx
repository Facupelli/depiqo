import type { GetOwnersItemDto } from "@repo/api-contracts";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CreateOwnerWithContractDialog } from "@/features/asset-inventory/owners/create-owner-with-contract/components/create-owner-with-contract-dialog";
import { createOwnerColumns } from "@/features/asset-inventory/owners/get-owners/components/owners-columns";
import { OwnersDataTable } from "@/features/asset-inventory/owners/get-owners/components/owners-table";
import { useOwners } from "@/features/asset-inventory/owners/owners.queries";
import { AdminRouteError } from "@/shared/components/admin-route-error";
import { useTenantTimezone } from "@/shared/timezone/operational-timezone.hooks";

export const Route = createFileRoute("/_admin/dashboard/owners/")({
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar los propietarios."
				forbiddenMessage="No tienes permisos para ver los propietarios."
			/>
		);
	},
	component: OwnersPage,
});

function OwnersPage() {
	const navigate = useNavigate();

	function handleRowClick(owner: GetOwnersItemDto) {
		navigate({
			to: "/dashboard/owners/$ownerId",
			params: { ownerId: owner.id },
		});
	}

	return (
		<div className="space-y-6 p-8">
			<div className="flex items-start justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Propietarios de Activos
					</h1>
					<p className="text-sm text-muted-foreground">
						Gestiona las entidades externas propietarias del inventario de
						alquiler.
					</p>
				</div>
				<CreateOwnerWithContractDialog triggerLabel="Agregar Propietario" />
			</div>

			<OwnersTable handleRowClick={handleRowClick} />
		</div>
	);
}

function OwnersTable({
	handleRowClick,
}: {
	handleRowClick: (owner: GetOwnersItemDto) => void;
}) {
	const { data: owners = [], isPending, isError } = useOwners();
	const timezone = useTenantTimezone();

	if (isError) {
		return (
			<p className="text-sm text-destructive">
				No pudimos cargar los propietarios. Intenta nuevamente.
			</p>
		);
	}

	if (isPending) {
		return <p className="text-sm text-muted-foreground">Cargando...</p>;
	}

	return (
		<OwnersDataTable
			columns={createOwnerColumns(timezone)}
			data={owners}
			searchColumn="name"
			searchPlaceholder="Buscar propietarios..."
			handleRowClick={handleRowClick}
		/>
	);
}
