import { TenantPermission } from "@repo/api-contracts";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import { currentAuthQueries } from "@/auth/auth.queries";
import { can } from "@/auth/permissions";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";
import { useBranches } from "@/modules/settings/branches/public";
import { GenericErrorPage } from "@/shared/components/generic-error-page";
import {
	DraftRentalComposer,
	PriceAdjustableDraftRentalComposer,
} from "../draft-rental-composer/draft-rental-composer";
import {
	createDraftRentalComposerDefaultValues,
	type DraftRentalComposerFormValues,
} from "../draft-rental-composer/draft-rental-composer.schema";
import { getDeliveryErrorMessage } from "../shared/delivery-error-messages";
import { useCreateDraftRental } from "./create-draft-rental.mutation";
import { toCreateDraftRentalDto } from "./create-draft-rental.schema";

export function CreateRentalPage() {
	const navigate = useNavigate();
	const { data: currentAuth } = useSuspenseQuery(currentAuthQueries.current());
	const { data: branches = [], isPending, isLoadingError } = useBranches();
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
	const creationAttempt = useRef<{
		body: string;
		idempotencyKey: string;
	} | null>(null);
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
		const serializedBody = JSON.stringify(body);
		// A lost response must not turn a retry of the same submission into a new draft.
		if (creationAttempt.current?.body !== serializedBody) {
			creationAttempt.current = {
				body: serializedBody,
				idempotencyKey: crypto.randomUUID(),
			};
		}
		const response = await createDraftRental.mutateAsync({
			body,
			idempotencyKey: creationAttempt.current.idempotencyKey,
		});

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

			{isPending ? (
				<output className="text-sm text-muted-foreground">
					Cargando sucursales...
				</output>
			) : isLoadingError ? (
				<GenericErrorPage message="No pudimos cargar las sucursales. Intentá nuevamente." />
			) : (
				<Composer
					activeBranches={activeBranches}
					canManageDelivery={
						currentAuth.actorType === "TENANT_USER" &&
						can(currentAuth.permissions, TenantPermission.RentalsDeliveryManage)
					}
					defaultValues={createDraftRentalComposerDefaultValues(
						initialBranchId,
					)}
					onSubmit={handleSubmit}
					isSubmitting={createDraftRental.isPending}
					submitError={
						createDraftRental.error
							? (getDeliveryErrorMessage(createDraftRental.error) ??
								"No pudimos crear el borrador. Revisá los datos e intentá nuevamente.")
							: null
					}
					submitLabel="Crear borrador"
					missingBranchMessage="Seleccioná una sucursal para crear un nuevo borrador."
				/>
			)}
		</div>
	);
}
