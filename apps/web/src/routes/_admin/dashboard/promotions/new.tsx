import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CreatePromotionForm } from "@/features/pricing/promotions/components/create-promotion-form";

export const Route = createFileRoute("/_admin/dashboard/promotions/new")({
	component: CreatePromotionPage,
});

function CreatePromotionPage() {
	const navigate = useNavigate();

	function goBack() {
		navigate({
			to: "/dashboard/promotions",
			search: {
				tab: "promotions",
				search: undefined,
			},
		});
	}

	return (
		<div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
			<header className="max-w-3xl space-y-2">
				<h1 className="font-semibold text-3xl tracking-tight">
					Nueva promoción
				</h1>
				<p className="text-muted-foreground">
					Configurá un descuento automático o con cupón. Podés definir cuándo se
					aplica, qué ítems alcanza y si puede combinarse con otras promociones.
				</p>
			</header>

			<CreatePromotionForm onCancel={goBack} onSuccess={goBack} />
		</div>
	);
}
