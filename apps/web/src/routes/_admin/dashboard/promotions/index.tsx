import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import z from "zod";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CouponsTab } from "@/features/pricing/coupons/components/coupons-tab";

import { PromotionsTab } from "@/features/pricing/promotions/components/promotions-tab";
import { AdminRouteError } from "@/shared/components/admin-route-error";

const promotionsSearchSchema = z.object({
	tab: z.enum(["coupons", "promotions"]).default("promotions"),
	search: z.string().optional(),
	activation: z.enum(["AUTOMATIC", "COUPON_REQUIRED"]).optional(),
});

type Tab = "coupons" | "promotions";

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
	const navigate = useNavigate({ from: Route.fullPath });
	const { tab } = Route.useSearch();

	function handleTabChange(value: string) {
		navigate({
			search: () => ({
				tab: value as Tab,
				search: undefined,
				activation: undefined,
			}),
		});
	}

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
				{tab === "promotions" && (
					<Button
						className="shrink-0 gap-2"
						render={<Link to="/dashboard/promotions/new">Nueva promocion</Link>}
					/>
				)}
				{/* TODO: Restore the coupon creation dialog after it is migrated to v2 promotion queries. */}
			</div>

			{/* Tabs */}
			<Tabs
				value={tab}
				onValueChange={handleTabChange}
				className="flex flex-col gap-y-10"
			>
				<TabsList>
					<TabsTrigger value="promotions">Promociones</TabsTrigger>
					<TabsTrigger value="coupons">Cupones</TabsTrigger>
				</TabsList>

				<TabsContent value="promotions" hidden={tab !== "promotions"}>
					<PromotionsTab />
				</TabsContent>

				<TabsContent value="coupons" hidden={tab !== "coupons"}>
					<CouponsTab />
				</TabsContent>
			</Tabs>
		</div>
	);
}
