import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	ProductTypeDetailPage,
	productTypeDetailSearchSchema,
} from "@/features/catalog/product-types/components/detail/product-type-detail-page";
import { productQueries } from "@/features/catalog/product-types/products.queries";

export const Route = createFileRoute(
	"/_admin/dashboard/catalog/products/$productId/",
)({
	validateSearch: productTypeDetailSearchSchema,
	loader: ({ context: { queryClient }, params: { productId } }) =>
		queryClient.ensureQueryData(productQueries.detail(productId)),
	component: RouteComponent,
});

function RouteComponent() {
	const { productId } = Route.useParams();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const { data: product } = useSuspenseQuery(productQueries.detail(productId));

	return (
		<ProductTypeDetailPage
			productId={productId}
			product={product}
			search={search}
			variant="products"
			copy={{
				parentLabel: "Productos",
				parentTo: "/dashboard/catalog/products",
				notFoundMessage: "Producto no encontrado.",
				physicalItemsTabLabel: "Items fisicos",
				editLabel: "Editar detalles",
			}}
			onSearchChange={(updates) => {
				navigate({
					search: (prev) => ({
						...prev,
						...updates,
					}),
				});
			}}
		/>
	);
}
