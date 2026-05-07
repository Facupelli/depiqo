import { RentalItemKind } from "@repo/types";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useCategories } from "@/features/catalog/product-categories/categories.queries";
import { ProductTypeForm } from "@/features/catalog/product-types/components/product-type-form";
import { useCreateProduct } from "@/features/catalog/product-types/product.mutations";
import {
	getProductTypeFormDefaults,
	toCreateProductTypeDto,
} from "@/features/catalog/product-types/schemas/product-type-form.schema";
import { tenantQueries } from "@/features/tenant/tenant.queries";

export const Route = createFileRoute("/_admin/dashboard/catalog/accessories/new")({
	component: CreateAccessoryPage,
});

const formId = "create-accessory-type";

function CreateAccessoryPage() {
	const navigate = useNavigate();
	const {
		data: { billingUnits },
	} = useSuspenseQuery(tenantQueries.me());
	const { data: categories = [] } = useCategories();
	const { mutateAsync: createProduct, isPending } = useCreateProduct();
	const defaultValues = getProductTypeFormDefaults(RentalItemKind.ACCESSORY);

	return (
		<div className="grid place-items-center py-10">
			<Card className="w-full sm:max-w-2xl">
				<CardHeader>
					<CardTitle>Crear accesorio</CardTitle>
					<CardDescription>
						Agrega un nuevo accesorio al catalogo de tu inventario.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ProductTypeForm
						formId={formId}
						defaultValues={defaultValues}
						categories={categories}
						billingUnits={billingUnits}
						onCancel={() => navigate({ to: "/dashboard/catalog/accessories" })}
						isPending={isPending}
						submitLabel="Crear accesorio"
						pendingLabel="Creando..."
						cancelLabel="Cancelar"
						copy={{
							nameLabel: "Nombre del accesorio",
							imageLabel: "Imagen del accesorio",
							newArrivalsDescription:
								"Excluye este accesorio de la seccion de nuevos ingresos en la tienda.",
						}}
						onSubmit={async ({ values }) => {
							const accessoryId = await createProduct(
								toCreateProductTypeDto(values),
							);
							navigate({
								to: "/dashboard/catalog/accessories/$accessoryId",
								params: { accessoryId },
							});
						}}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
