import { createFileRoute, useNavigate } from "@tanstack/react-router";
import z from "zod";
import { EditPromotionPage } from "@/modules/pricing/promotions/edit-promotion/EditPromotionPage";
import { promotionQueries } from "@/modules/pricing/promotions/promotion.queries";

const promotionsSearchSchema = z.object({
	tab: z.enum(["coupons", "promotions"]).default("promotions"),
	search: z.string().optional(),
	activation: z.enum(["AUTOMATIC", "COUPON_REQUIRED"]).optional(),
});

export const Route = createFileRoute(
	"/_admin/dashboard/promotions/$promotionId/edit",
)({
	validateSearch: promotionsSearchSchema,
	loader: ({ context: { queryClient }, params: { promotionId } }) =>
		queryClient.ensureQueryData(promotionQueries.detail(promotionId)),
	component: RouteComponent,
});

function RouteComponent() {
	const { promotionId } = Route.useParams();
	const search = Route.useSearch();
	const navigate = useNavigate();
	function goBack() {
		navigate({
			to: "/dashboard/promotions",
			search,
		});
	}

	return (
		<div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
			<header className="max-w-3xl space-y-2">
				<h1 className="font-semibold text-3xl tracking-tight">
					Editar promoción
				</h1>
				<p className="text-muted-foreground">
					Actualizá la configuración de la promoción sin perder el contexto de
					tu listado.
				</p>
			</header>

			<EditPromotionPage
				promotionId={promotionId}
				onCancel={goBack}
				onSuccess={goBack}
			/>
		</div>
	);
}
