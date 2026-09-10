import { buttonVariants } from "@repo/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import z from "zod";
import { PromotionsTab } from "@/modules/pricing/promotions/list-promotions/PromotionsTab";
import { AdminRouteError } from "@/shared/components/admin-route-error";

const promotionsSearchSchema = z.object({
	search: z.string().optional(),
	activation: z.enum(["AUTOMATIC", "COUPON_REQUIRED"]).optional(),
});

export const Route = createFileRoute("/_admin/dashboard/promotions/")({
	validateSearch: promotionsSearchSchema,
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar la página de promociones."
				forbiddenMessage="No tienes permisos para ver las promociones."
			/>
		);
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="w-full space-y-4">
			<h1 className="sr-only">Promociones</h1>

			<div className="@container/promotions-index">
				<PromotionsTab
					toolbarActions={
						<Link
							to="/dashboard/promotions/new"
							className={buttonVariants({ className: "shrink-0 gap-2" })}
						>
							Nueva promoción
						</Link>
					}
				/>
				{/* TODO: Restore the coupon creation dialog after it is migrated to v2 promotion queries. */}
			</div>
		</div>
	);
}
