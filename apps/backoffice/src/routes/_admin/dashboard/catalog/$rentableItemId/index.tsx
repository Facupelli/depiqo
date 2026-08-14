import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { usePricePlans } from "@/modules/pricing/price-plans/public";
import { ProductDetailPage } from "@/modules/products/product-detail/ProductDetailPage";
import { productDetailQueries } from "@/modules/products/product-detail/product-detail.queries";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute(
	"/_admin/dashboard/catalog/$rentableItemId/",
)({
	loader: ({ context: { queryClient }, params: { rentableItemId } }) =>
		queryClient.ensureQueryData(productDetailQueries.detail(rentableItemId)),
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
		productDetailQueries.detail(rentableItemId),
	);
	const { data: ratePlans = [] } = usePricePlans({ isActive: true });
	const ratePlanOptions = ratePlans
		.filter((plan) => plan.tierCount > 0)
		.map((plan) => ({ id: plan.id, name: plan.name }));

	return (
		<ProductDetailPage product={product} ratePlanOptions={ratePlanOptions} />
	);
}
