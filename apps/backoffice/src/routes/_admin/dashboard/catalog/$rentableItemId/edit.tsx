import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { EditProductPage } from "@/modules/products/edit-product/EditProductPage";
import { isComboKind } from "@/modules/products/product-kind";
import { rentableItemDetailQueries } from "@/modules/products/rentable-item-detail/rentable-item-detail.queries";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute(
	"/_admin/dashboard/catalog/$rentableItemId/edit",
)({
	loader: async ({ context: { queryClient }, params: { rentableItemId } }) => {
		const item = await queryClient.ensureQueryData(
			rentableItemDetailQueries.detail(rentableItemId),
		);
		if (isComboKind(item.kind)) {
			throw redirect({
				to: "/dashboard/catalog/packages/$rentableItemId/edit",
				params: { rentableItemId },
			});
		}
		return item;
	},
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
		rentableItemDetailQueries.detail(rentableItemId),
	);

	return <EditProductPage product={product} />;
}
