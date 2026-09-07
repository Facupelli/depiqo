import type { GetOwnersItemDto } from "@repo/api-contracts";
import { useTenantTimezone } from "@/shared/timezone/operational-timezone.hooks";
import { CreateOwnerWithContractDialog } from "../create-owner/components/create-owner-with-contract-dialog";
import { useOwnerOptions } from "../owner-options.queries";
import { createOwnerColumns } from "./owners-columns";
import { OwnersDataTable } from "./owners-table";

interface OwnersPageProps {
	onOwnerSelect: (owner: GetOwnersItemDto) => void;
}

export function OwnersPage({ onOwnerSelect }: OwnersPageProps) {
	return (
		<div className="space-y-4">
			<div className="flex items-start justify-between">
				<h1 className="sr-only">Propietarios de equipos</h1>
				<div className="ml-auto">
					<CreateOwnerWithContractDialog triggerLabel="Agregar Propietario" />
				</div>
			</div>

			<OwnersTable onOwnerSelect={onOwnerSelect} />
		</div>
	);
}

function OwnersTable({ onOwnerSelect }: OwnersPageProps) {
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
			handleRowClick={onOwnerSelect}
		/>
	);
}
