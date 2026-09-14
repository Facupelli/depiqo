import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { currentBusinessQueries } from "@/application/current-business/current-business.queries";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";
import { useBranches } from "@/modules/settings/branches/public";
import { GenericErrorPage } from "@/shared/components/generic-error-page";
import { ProblemDetailsError } from "@/shared/errors";
import { resolveOperationalTimezone } from "@/shared/timezone/operational-timezone";
import { DraftRentalComposer } from "../draft-rental-composer/draft-rental-composer";
import type { DraftRentalComposerFormValues } from "../draft-rental-composer/draft-rental-composer.schema";
import { rentalDetailViewQueries } from "../rental-detail/rental-detail.queries";
import { hydrateRentalDetailToComposer } from "./rental-detail-to-composer";
import { classifyUpdateDraftRentalError } from "./update-draft-rental.errors";
import { useUpdateDraftRental } from "./update-draft-rental.mutation";
import { toUpdateDraftRentalVariables } from "./update-draft-rental.schema";

type EditRentalPageProps = {
	orderId: string;
};

export function EditRentalPage({ orderId }: EditRentalPageProps) {
	const navigate = useNavigate();
	const { data: rental } = useSuspenseQuery(
		rentalDetailViewQueries.detail(orderId),
	);
	const { data: business } = useSuspenseQuery(currentBusinessQueries.current());
	const { data: branches = [] } = useBranches();
	const [baseline] = useState(() => {
		const operationalTimezone = resolveOperationalTimezone({
			branchTimezone: rental.retainedBranch.timezone,
			tenantTimezone: business.config.timezone,
		});

		return {
			rental,
			editor: hydrateRentalDetailToComposer(rental, operationalTimezone),
		};
	});
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [submissionBlocked, setSubmissionBlocked] = useState(false);
	const updateDraftRental = useUpdateDraftRental();

	if (baseline.rental.status !== "DRAFT") {
		return (
			<GenericErrorPage message="Este pedido no está disponible para edición como borrador." />
		);
	}

	const activeBranches = branches.filter((branch) => branch.isActive);

	async function handleSubmit(
		values: DraftRentalComposerFormValues,
		timezone: string,
	) {
		setSubmitError(null);

		try {
			await updateDraftRental.mutateAsync(
				toUpdateDraftRentalVariables(values, {
					rentalId: orderId,
					expectedVersion: baseline.editor.expectedVersion,
					timezone,
				}),
			);

			await navigate({
				to: "/dashboard/orders/$orderId",
				params: { orderId },
			});
		} catch (error) {
			const kind = classifyUpdateDraftRentalError(error);

			if (kind === "VERSION_CONFLICT") {
				setSubmissionBlocked(true);
				setSubmitError(
					"El pedido cambió mientras lo editabas. Tus cambios siguen en pantalla, pero la versión cargada ya no es válida. Revisá el pedido actual antes de volver a editarlo.",
				);
				return;
			}

			if (kind === "STATUS_CONFLICT") {
				setSubmissionBlocked(true);
				setSubmitError(
					"El pedido cambió de estado y ya no se puede guardar como borrador. Tus cambios siguen en pantalla. Volvé al pedido para revisar su estado actual.",
				);
				return;
			}

			setSubmitError(getUpdateErrorMessage(error));
		}
	}

	return (
		<div className="pb-10 text-neutral-950">
			<PageBreadcrumb
				parent={{ label: "Alquileres", to: "/dashboard/orders" }}
				current={`Editar #${baseline.rental.rentalNumber}`}
			/>

			<div className="space-y-1 pb-4">
				<h1 className="text-2xl font-semibold tracking-tight">
					Editar borrador
				</h1>
			</div>

			<DraftRentalComposer
				activeBranches={activeBranches}
				defaultValues={baseline.editor.defaultValues}
				initialBranch={baseline.editor.initialBranch}
				initialCustomer={baseline.editor.initialCustomer}
				onSubmit={handleSubmit}
				isSubmitting={updateDraftRental.isPending}
				submitDisabled={submissionBlocked}
				submitError={submitError}
				submitLabel="Guardar cambios"
				missingBranchMessage="La sucursal guardada ya no está disponible. Seleccioná una sucursal activa para poder guardar cambios."
			/>
		</div>
	);
}

function getUpdateErrorMessage(error: unknown): string {
	if (error instanceof ProblemDetailsError) {
		return (
			error.problemDetails.detail ||
			error.problemDetails.title ||
			"No pudimos guardar los cambios del pedido."
		);
	}

	return "No pudimos guardar los cambios del pedido. Intentá nuevamente.";
}
