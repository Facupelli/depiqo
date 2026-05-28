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
	"/_admin/dashboard/catalog/products/$productId/edit",
)({
	loader: ({ context: { queryClient }, params: { productId } }) =>
		queryClient.ensureQueryData(productQueries.detail(productId)),
	component: EditProductTypeRoute,
});

const formId = "edit-product-type";

function EditProductTypeRoute() {
	const { productId } = Route.useParams();
	const { data: product } = useSuspenseQuery(productQueries.detail(productId));

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
					<CardTitle>Editar producto</CardTitle>
					<CardDescription>
						Actualiza los datos del producto para mantener tu catalogo al dia.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ProductTypeForm
						key={product.id}
						formId={formId}
						defaultValues={productTypeToFormValues(product)}
						categories={categories}
						billingUnits={billingUnits}
						onCancel={() =>
							navigate({
								to: "/dashboard/catalog/products/$productId",
								params: { productId: product.id },
							})
						}
						isPending={isPending}
						submitLabel="Guardar cambios"
						pendingLabel="Guardando..."
						cancelLabel="Cancelar"
						onSubmit={async ({ dirtyValues }) => {
							await updateProductType({
								productTypeId: product.id,
								dto: toUpdateProductTypeDto(dirtyValues),
							});

							navigate({
								to: "/dashboard/catalog/products/$productId",
								params: { productId: product.id },
							});
						}}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
