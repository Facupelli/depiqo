import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { usePricePlans } from "@/modules/pricing/price-plans/public";
import { ProductDetailPage } from "@/modules/products/product-detail/ProductDetailPage";
import { isComboKind } from "@/modules/products/product-kind";
import { rentableItemDetailQueries } from "@/modules/products/rentable-item-detail/rentable-item-detail.queries";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute(
	"/_admin/dashboard/catalog/$rentableItemId/",
)({
	loader: async ({ context: { queryClient }, params: { rentableItemId } }) => {
		const item = await queryClient.ensureQueryData(
			rentableItemDetailQueries.detail(rentableItemId),
		);
		if (isComboKind(item.kind)) {
			throw redirect({
				to: "/dashboard/catalog/packages/$rentableItemId",
				params: { rentableItemId },
			});
		}
		return item;
	},
	errorComponent: ({ error }) => (
		<AdminRouteError
			error={error}
			genericMessage="No pudimos cargar el detalle del producto."
			forbiddenMessage="No tienes permisos para ver este producto."
		/>
	),
	component: ProductDetailRoute,
});

function ProductDetailRoute() {
	const { rentableItemId } = Route.useParams();
	const { data: product } = useSuspenseQuery(
		rentableItemDetailQueries.detail(rentableItemId),
	);
	const { data: ratePlans = [] } = usePricePlans({ isActive: true });
	const ratePlanOptions = ratePlans
		.filter((plan) => plan.tierCount > 0)
		.map((plan) => ({ id: plan.id, name: plan.name }));

	return (
		<ProductDetailPage product={product} ratePlanOptions={ratePlanOptions} />
	);
}
