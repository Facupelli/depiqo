import { TenantPermission } from "@repo/api-contracts";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { currentAuthQueries } from "@/auth/auth.queries";
import { can } from "@/auth/permissions";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";
import { useBranches } from "@/modules/settings/branches/public";
import {
	DraftRentalComposer,
	PriceAdjustableDraftRentalComposer,
} from "../draft-rental-composer/draft-rental-composer";
import {
	createDraftRentalComposerDefaultValues,
	type DraftRentalComposerFormValues,
} from "../draft-rental-composer/draft-rental-composer.schema";
import { useCreateDraftRental } from "./create-draft-rental.mutation";
import { toCreateDraftRentalDto } from "./create-draft-rental.schema";

export function CreateRentalPage() {
	const navigate = useNavigate();
	const { data: currentAuth } = useSuspenseQuery(currentAuthQueries.current());
	const { data: branches = [] } = useBranches();
	const activeBranches = branches.filter((branch) => branch.isActive);
	const workingBranchIsActive = activeBranches.some(
		(branch) => branch.id === currentAuth.workingBranchId,
	);
	const initialBranchId = workingBranchIsActive
		? (currentAuth.workingBranchId ?? "")
		: activeBranches.length === 1
			? activeBranches[0].id
			: "";
	const createDraftRental = useCreateDraftRental();
	const canManagePriceAdjustment =
		currentAuth.actorType === "TENANT_USER" &&
		can(currentAuth.permissions, TenantPermission.RentalsPriceAdjustmentManage);

	const Composer = canManagePriceAdjustment
		? PriceAdjustableDraftRentalComposer
		: DraftRentalComposer;

	async function handleSubmit(
		values: DraftRentalComposerFormValues,
		timezone: string,
	) {
		const body = toCreateDraftRentalDto(values, timezone);
		const response = await createDraftRental.mutateAsync({ body });

		navigate({
			to: "/dashboard/orders/$orderId",
			params: { orderId: response.id },
		});
	}

	return (
		<div className="pb-10 text-neutral-950">
			<PageBreadcrumb
				parent={{ label: "Alquileres", to: "/dashboard/orders" }}
				current="Nuevo borrador"
			/>

			<div className="space-y-1 pb-4">
				<h1 className="text-2xl font-semibold tracking-tight">
					Nuevo borrador
				</h1>
			</div>

			<Composer
				activeBranches={activeBranches}
				defaultValues={createDraftRentalComposerDefaultValues(initialBranchId)}
				onSubmit={handleSubmit}
				isSubmitting={createDraftRental.isPending}
				submitError={null}
				submitLabel="Crear borrador"
				missingBranchMessage="Seleccioná una sucursal para crear un nuevo borrador."
			/>
		</div>
	);
}
