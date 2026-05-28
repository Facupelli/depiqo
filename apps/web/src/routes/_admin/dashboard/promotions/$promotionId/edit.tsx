import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import z from "zod";
import { PromotionForm } from "@/features/pricing/promotions/components/create-promotion-form";
import {
	promotionToFormValues,
	toUpdatePromotionDto,
} from "@/features/pricing/promotions/schemas/promotion-form.schema";
import { promotionQueries } from "@/v2/features/pricing/promotions/promotions.queries";
import { useUpdatePromotion } from "@/v2/features/pricing/promotions/update-promotion/update-promotion.mutation";

const promotionsSearchSchema = z.object({
	tab: z.enum(["coupons", "promotions"]).default("promotions"),
	search: z.string().optional(),
	activation: z.enum(["AUTOMATIC", "COUPON_REQUIRED"]).optional(),
});

const formId = "edit-promotion";

export const Route = createFileRoute(
	"/_admin/dashboard/promotions/$promotionId/edit",
)({
	validateSearch: promotionsSearchSchema,
	loader: ({ context: { queryClient }, params: { promotionId } }) =>
		queryClient.ensureQueryData(promotionQueries.detail(promotionId)),
	component: EditPromotionPage,
});

function EditPromotionPage() {
	const { promotionId } = Route.useParams();
	const search = Route.useSearch();
	const navigate = useNavigate();
	const { data: promotion } = useSuspenseQuery(
		promotionQueries.detail(promotionId),
	);
	const { mutateAsync: updatePromotion, isPending } = useUpdatePromotion();

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

			<PromotionForm
				key={promotion.id}
				formId={formId}
				defaultValues={promotionToFormValues(promotion)}
				onCancel={goBack}
				onSubmit={async (values) => {
					await updatePromotion({
						params: { promotionId: promotion.id },
						body: toUpdatePromotionDto(values),
					});
					goBack();
				}}
				isPending={isPending}
				submitLabel="Guardar cambios"
				pendingLabel="Guardando..."
			/>
		</div>
	);
}
