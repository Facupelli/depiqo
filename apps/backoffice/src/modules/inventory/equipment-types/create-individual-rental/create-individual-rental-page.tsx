import { Button } from "@repo/ui/components/button";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useBranches } from "@/modules/settings/branches/public";
import { useCategories } from "@/modules/settings/categories/public";
import { equipmentTypeSummaryQueries } from "../equipment-type-detail/equipment-type-summary.queries";
import { mapCreateIndividualRentalError } from "./create-individual-rental.errors";
import { useCreateIndividualRental } from "./create-individual-rental.mutation";
import {
	createIndividualRentalFormDefaultValues,
	toCreateIndividualRentalDto,
} from "./create-individual-rental.schema";
import { CreateIndividualRentalForm } from "./create-individual-rental-form";

export function CreateIndividualRentalPage({
	equipmentTypeId,
}: {
	equipmentTypeId: string;
}) {
	const navigate = useNavigate();
	const { data: equipmentType } = useSuspenseQuery(
		equipmentTypeSummaryQueries.summary(equipmentTypeId),
	);
	const categoriesQuery = useCategories();
	const branchesQuery = useBranches({ isActive: true });
	const { mutateAsync: createRental, isPending } = useCreateIndividualRental();
	const [submitError, setSubmitError] = useState<string | null>(null);
	const rentalsPath =
		"/dashboard/inventory/equipment-types/$equipmentTypeId/rentals" as const;
	const activeCategories =
		categoriesQuery.data?.filter((category) => category.isActive) ?? [];
	const isOptionsPending = branchesQuery.isPending || categoriesQuery.isPending;
	const isOptionsError = branchesQuery.isError || categoriesQuery.isError;

	return (
		<div className="mx-auto w-full max-w-5xl py-4">
			<header className="mb-8 max-w-3xl">
				<p className="font-medium text-muted-foreground text-sm">
					Alquileres individuales
				</p>
				<h1 className="mt-2 font-semibold text-3xl tracking-tight">
					Nuevo alquiler individual
				</h1>
				<p className="mt-3 text-muted-foreground">
					Crea una nueva presentación comercial de {equipmentType.name} y elige
					las sucursales donde estará disponible.
				</p>
			</header>

			{isOptionsPending ? (
				<p className="text-sm text-muted-foreground">Cargando...</p>
			) : isOptionsError ? (
				<div className="space-y-3">
					<p className="text-sm text-destructive">
						No pudimos cargar las opciones del alquiler. Intenta nuevamente.
					</p>
					<Button
						type="button"
						variant="outline"
						onClick={() => {
							if (branchesQuery.isError) void branchesQuery.refetch();
							if (categoriesQuery.isError) void categoriesQuery.refetch();
						}}
					>
						Reintentar
					</Button>
				</div>
			) : (
				<CreateIndividualRentalForm
					key={equipmentType.id}
					defaultValues={createIndividualRentalFormDefaultValues(
						equipmentType,
						activeCategories,
					)}
					categories={activeCategories}
					branches={branchesQuery.data}
					isPending={isPending}
					submitError={submitError}
					onCancel={() =>
						navigate({
							to: rentalsPath,
							params: { equipmentTypeId },
						})
					}
					onSubmit={async (values) => {
						setSubmitError(null);
						try {
							await createRental(
								toCreateIndividualRentalDto(equipmentTypeId, values),
							);
							toast.success("Alquiler individual creado correctamente");
							await navigate({
								to: rentalsPath,
								params: { equipmentTypeId },
							});
						} catch (error) {
							setSubmitError(mapCreateIndividualRentalError(error));
						}
					}}
				/>
			)}
		</div>
	);
}
