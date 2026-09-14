import { useSuspenseQuery } from "@tanstack/react-query";
import { currentBusinessQueries } from "@/application/current-business/current-business.queries";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";
import { useBranches } from "@/modules/settings/branches/public";
import { GenericErrorPage } from "@/shared/components/generic-error-page";
import { resolveOperationalTimezone } from "@/shared/timezone/operational-timezone";
import { DraftRentalComposer } from "../draft-rental-composer/draft-rental-composer";
import { rentalDetailViewQueries } from "../rental-detail/rental-detail.queries";
import { hydrateRentalDetailToComposer } from "./rental-detail-to-composer";

type EditRentalPageProps = {
	orderId: string;
};

export function EditRentalPage({ orderId }: EditRentalPageProps) {
	const { data: rental } = useSuspenseQuery(
		rentalDetailViewQueries.detail(orderId),
	);
	const { data: business } = useSuspenseQuery(currentBusinessQueries.current());
	const { data: branches = [] } = useBranches();

	if (rental.status !== "DRAFT") {
		return (
			<GenericErrorPage message="Este pedido no está disponible para edición como borrador." />
		);
	}

	const operationalTimezone = resolveOperationalTimezone({
		branchTimezone: rental.retainedBranch.timezone,
		tenantTimezone: business.config.timezone,
	});
	const editor = hydrateRentalDetailToComposer(rental, operationalTimezone);
	const activeBranches = branches.filter((branch) => branch.isActive);

	return (
		<div className="pb-10 text-neutral-950">
			<PageBreadcrumb
				parent={{ label: "Alquileres", to: "/dashboard/orders" }}
				current={`Editar #${rental.rentalNumber}`}
			/>

			<div className="space-y-1 pb-4">
				<h1 className="text-2xl font-semibold tracking-tight">
					Editar borrador
				</h1>
			</div>

			<DraftRentalComposer
				activeBranches={activeBranches}
				defaultValues={editor.defaultValues}
				initialBranch={editor.initialBranch}
				initialCustomer={editor.initialCustomer}
				onSubmit={async () => {}}
				isSubmitting={false}
				submitDisabled
				submitError={null}
				submitLabel="Guardar cambios"
				missingBranchMessage="La sucursal guardada ya no está disponible. Seleccioná una sucursal activa para poder guardar cambios."
			/>
		</div>
	);
}
