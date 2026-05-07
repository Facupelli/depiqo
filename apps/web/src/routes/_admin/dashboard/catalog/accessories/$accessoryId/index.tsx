import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	ProductTypeDetailPage,
	productTypeDetailSearchSchema,
} from "@/features/catalog/product-types/components/detail/product-type-detail-page";
import { productQueries } from "@/features/catalog/product-types/products.queries";

export const Route = createFileRoute(
	"/_admin/dashboard/catalog/accessories/$accessoryId/",
)({
	validateSearch: productTypeDetailSearchSchema,
	loader: ({ context: { queryClient }, params: { accessoryId } }) =>
		queryClient.ensureQueryData(productQueries.detail(accessoryId)),
	component: RouteComponent,
});

function RouteComponent() {
	const { accessoryId } = Route.useParams();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const { data: accessory } = useSuspenseQuery(
		productQueries.detail(accessoryId),
	);

	return (
		<ProductTypeDetailPage
			productId={accessoryId}
			product={accessory}
			search={search}
			variant="accessories"
			copy={{
				parentLabel: "Accesorios",
				parentTo: "/dashboard/catalog/accessories",
				notFoundMessage: "Accesorio no encontrado.",
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
