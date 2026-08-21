import { Button } from "@repo/ui/components/button";
import { useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { currentBusinessQueries } from "@/application/current-business/current-business.queries";
import { SettingsConfigurationSection } from "@/modules/settings/business-configuration/SettingsConfigurationSection";
import { ReadOnlyRow } from "@/modules/settings/ui/read-only-row";

export function BusinessSettingsScreen() {
	const { data: business } = useSuspenseQuery(currentBusinessQueries.current());
	const storeUrl = `${business.slug}.depiqo.com`;

	return (
		<div className="space-y-8">
			<section className="space-y-4">
				<div>
					<h3 className="text-lg font-semibold">Información del negocio</h3>
					<p className="text-sm text-muted-foreground">
						Datos básicos que identifican tu negocio.
					</p>
				</div>
				<div className="divide-y overflow-hidden rounded-xl border bg-card">
					<ReadOnlyRow label="Nombre" value={business.name} align="start" />
					<ReadOnlyRow
						label="URL de la tienda"
						value={storeUrl}
						align="start"
						action={
							<Button
								variant="link"
								size="sm"
								className="h-auto p-0"
								onClick={() => {
									void navigator.clipboard
										.writeText(storeUrl)
										.then(() => toast.success("URL copiada al portapapeles"));
								}}
							>
								Copiar
							</Button>
						}
					/>
				</div>
			</section>
			<section className="space-y-4">
				<div>
					<h3 className="text-lg font-semibold">Configuración regional</h3>
					<p className="text-sm text-muted-foreground">
						Define cómo se muestran precios, idioma y fechas.
					</p>
				</div>
				<SettingsConfigurationSection section="business" />
			</section>
		</div>
	);
}
