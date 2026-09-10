import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CreatePromotionForm } from "@/modules/pricing/promotions/create-promotion/CreatePromotionForm";

export const Route = createFileRoute("/_admin/dashboard/promotions/new")({
	component: CreatePromotionPage,
});

function CreatePromotionPage() {
	const navigate = useNavigate();

	function goBack() {
		navigate({
			to: "/dashboard/promotions",
			search: {
				search: undefined,
				activation: undefined,
			},
		});
	}

	return (
		<div className="mx-auto w-full max-w-6xl space-y-6 py-4 sm:py-6 lg:space-y-8 lg:py-8">
			<header className="max-w-3xl">
				<h1 className="font-semibold text-3xl tracking-tight">
					Nueva promoción
				</h1>
				<p className="mt-1 text-muted-foreground">
					Configurá un descuento automático o con cupón. Podés definir cuándo se
					aplica, qué ítems alcanza y si puede combinarse con otras promociones.
				</p>
			</header>

			<CreatePromotionForm onCancel={goBack} onSuccess={goBack} />
		</div>
	);
}
