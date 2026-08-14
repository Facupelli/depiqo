import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCreateRentableEquipment } from "@/features/admin/offering-setup/create-rentable-equipment/create-rentable-equipment.mutation";
import { toCreateRentableEquipmentDto } from "@/features/admin/offering-setup/create-rentable-equipment/create-rentable-equipment.schema";
import { CreateRentableEquipmentForm } from "@/features/admin/offering-setup/create-rentable-equipment/create-rentable-equipment-form";
import { useOwners } from "@/features/asset-inventory/owners/owners.queries";
import { useBranches } from "@/modules/settings/branches/branches.queries";
import { useCategories } from "@/modules/settings/categories/categories.queries";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute("/_admin/dashboard/catalog/new")({
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar el formulario para crear el equipo."
				forbiddenMessage="No tienes permisos para crear equipos."
			/>
		);
	},
	component: CreateRentableEquipmentPage,
});

const formId = "create-rentable-equipment";

function CreateRentableEquipmentPage() {
	const navigate = useNavigate();
	const { data: categories = [] } = useCategories();
	const { data: branches = [] } = useBranches();
	const { data: owners = [] } = useOwners();
	const { mutateAsync: createRentableEquipment, isPending } =
		useCreateRentableEquipment();

	return (
		<div className="mx-auto w-full max-w-6xl px-6 py-10">
			<header className="mb-10 max-w-3xl">
				<p className="font-medium text-muted-foreground text-sm">
					Catálogo de alquiler
				</p>
				<h1 className="mt-2 font-semibold text-3xl tracking-tight">
					Crear equipo
				</h1>
				<p className="mt-3 text-muted-foreground">
					Define cómo se mostrará este equipo en el catálogo de alquiler.
				</p>
			</header>

			<CreateRentableEquipmentForm
				formId={formId}
				categories={categories.filter((category) => category.isActive)}
				branches={branches}
				owners={owners}
				isPending={isPending}
				submitLabel="Crear equipo"
				pendingLabel="Creando..."
				cancelLabel="Cancelar"
				onCancel={() => navigate({ to: "/dashboard/catalog" })}
				onSubmit={async (values) => {
					await createRentableEquipment(toCreateRentableEquipmentDto(values));
					navigate({ to: "/dashboard/catalog" });
				}}
			/>
		</div>
	);
}
