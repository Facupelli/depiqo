import { useSuspenseQuery } from "@tanstack/react-query";
import { currentBusinessQueries } from "@/application/current-business/current-business.queries";
import { SettingsConfigurationSection } from "@/modules/settings/business-configuration/SettingsConfigurationSection";
import { ReadOnlyRow } from "@/modules/settings/ui/read-only-row";

export function BusinessSettingsScreen() {
	const { data: business } = useSuspenseQuery(currentBusinessQueries.current());

	return (
		<div className="space-y-8">
			<section className="space-y-4">
				<div>
					<h3 className="text-lg font-semibold">Información del negocio</h3>
					<p className="text-sm text-muted-foreground">
						Estos datos identifican tu negocio en DEPIQO.
					</p>
				</div>
				<div className="divide-y overflow-hidden rounded-xl border bg-card">
					<ReadOnlyRow label="Nombre" value={business.name} />
					<ReadOnlyRow
						label="Dirección de DEPIQO"
						value={`${business.slug}.depiqo.com`}
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
