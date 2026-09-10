import type { GetOwnersItemDto } from "@repo/api-contracts";
import type { ReactNode } from "react";
import { useTenantTimezone } from "@/shared/timezone/operational-timezone.hooks";
import { CreateOwnerWithContractDialog } from "../create-owner/components/create-owner-with-contract-dialog";
import { useOwnerOptions } from "../owner-options.queries";
import { createOwnerColumns } from "./owners-columns";
import { OwnersDataTable } from "./owners-table";

interface OwnersPageProps {
	onOwnerSelect: (owner: GetOwnersItemDto) => void;
}

interface OwnersTableProps extends OwnersPageProps {
	toolbarActions?: ReactNode;
}

export function OwnersPage({ onOwnerSelect }: OwnersPageProps) {
	return (
		<div className="space-y-4">
			<h1 className="sr-only">Propietarios de equipos</h1>

			<OwnersTable
				onOwnerSelect={onOwnerSelect}
				toolbarActions={
					<CreateOwnerWithContractDialog triggerLabel="Nuevo propietario" />
				}
			/>
		</div>
	);
}

function OwnersTable({ onOwnerSelect, toolbarActions }: OwnersTableProps) {
	const { data: owners = [], isPending, isError } = useOwnerOptions();
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
			noDataMessage="No se encontraron propietarios."
			itemLabel="propietarios"
			handleRowClick={onOwnerSelect}
			toolbarActions={toolbarActions}
		/>
	);
}
