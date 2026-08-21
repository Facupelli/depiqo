import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { EditProductPage } from "@/modules/products/edit-product/EditProductPage";
import { productDetailQueries } from "@/modules/products/product-detail/product-detail.queries";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute(
	"/_admin/dashboard/catalog/$rentableItemId/edit",
)({
	loader: ({ context: { queryClient }, params: { rentableItemId } }) =>
		queryClient.ensureQueryData(productDetailQueries.detail(rentableItemId)),
	errorComponent: ({ error }) => (
		<AdminRouteError
			error={error}
			genericMessage="No pudimos cargar el formulario para editar el producto."
			forbiddenMessage="No tienes permisos para editar este producto."
		/>
	),
	component: EditProductRoute,
});

function EditProductRoute() {
	const { rentableItemId } = Route.useParams();
	const { data: product } = useSuspenseQuery(
		productDetailQueries.detail(rentableItemId),
	);

	return <EditProductPage product={product} />;
}
