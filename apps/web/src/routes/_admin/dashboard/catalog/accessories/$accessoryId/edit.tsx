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
import { useUpdateProductType } from "@/features/catalog/product-types/product.mutations";
import { productQueries } from "@/features/catalog/product-types/products.queries";
import {
	productTypeToFormValues,
	toUpdateProductTypeDto,
} from "@/features/catalog/product-types/schemas/product-type-form.schema";
import { tenantQueries } from "@/features/tenant/tenant.queries";

export const Route = createFileRoute(
	"/_admin/dashboard/catalog/accessories/$accessoryId/edit",
)({
	loader: ({ context: { queryClient }, params: { accessoryId } }) =>
		queryClient.ensureQueryData(productQueries.detail(accessoryId)),
	component: EditAccessoryRoute,
});

const formId = "edit-accessory-type";

function EditAccessoryRoute() {
	const { accessoryId } = Route.useParams();
	const { data: accessory } = useSuspenseQuery(
		productQueries.detail(accessoryId),
	);

	const navigate = useNavigate();
	const {
		data: { billingUnits },
	} = useSuspenseQuery(tenantQueries.me());
	const { data: categories = [] } = useCategories();
	const { mutateAsync: updateProductType, isPending } = useUpdateProductType();

	return (
		<div className="grid place-items-center py-10">
			<Card className="w-full sm:max-w-2xl">
				<CardHeader>
					<CardTitle>Editar accesorio</CardTitle>
					<CardDescription>
						Actualiza los datos del accesorio para mantener tu catalogo al dia.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ProductTypeForm
						key={accessory.id}
						formId={formId}
						defaultValues={productTypeToFormValues(accessory)}
						categories={categories}
						billingUnits={billingUnits}
						onCancel={() =>
							navigate({
								to: "/dashboard/catalog/accessories/$accessoryId",
								params: { accessoryId: accessory.id },
							})
						}
						isPending={isPending}
						submitLabel="Guardar cambios"
						pendingLabel="Guardando..."
						cancelLabel="Cancelar"
						copy={{
							nameLabel: "Nombre del accesorio",
							imageLabel: "Imagen del accesorio",
							newArrivalsDescription:
								"Excluye este accesorio de la seccion de nuevos ingresos en la tienda.",
						}}
						onSubmit={async ({ dirtyValues }) => {
							await updateProductType({
								productTypeId: accessory.id,
								dto: toUpdateProductTypeDto(dirtyValues),
							});

							navigate({
								to: "/dashboard/catalog/accessories/$accessoryId",
								params: { accessoryId: accessory.id },
							});
						}}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
