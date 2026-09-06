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
		<div className="space-y-6 px-6 py-8 max-w-6xl mx-auto">
			{/* Header */}
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Promociones</h1>
					<p className="text-muted-foreground mt-1 text-sm">
						Gestiona incentivos de precios y códigos promocionales para tu flota
						de alquiler.
					</p>
				</div>
				<Link
					to="/dashboard/promotions/new"
					className={buttonVariants({ className: "shrink-0 gap-2" })}
				>
					Nueva promocion
				</Link>
				{/* TODO: Restore the coupon creation dialog after it is migrated to v2 promotion queries. */}
			</div>

			<PromotionsTab />
		</div>
	);
}
