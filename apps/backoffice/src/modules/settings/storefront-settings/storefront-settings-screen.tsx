import { useSuspenseQuery } from "@tanstack/react-query";
import { currentBusinessQueries } from "@/application/current-business/current-business.queries";
import { BrandingSection } from "@/modules/settings/branding/update-branding/BrandingSection";
import { SettingsConfigurationSection } from "@/modules/settings/business-configuration/SettingsConfigurationSection";
import { CustomDomainSection } from "@/modules/settings/domains/custom-domain/CustomDomainSection";
import { ReadOnlyRow } from "@/modules/settings/ui/read-only-row";

export function StorefrontSettingsScreen() {
	const { data: business } = useSuspenseQuery(currentBusinessQueries.current());

	return (
		<div className="space-y-8">
			<section className="space-y-4">
				<div>
					<h3 className="text-lg font-semibold">Identidad de la tienda</h3>
					<p className="text-sm text-muted-foreground">
						Personaliza la apariencia de tu tienda online.
					</p>
				</div>
				<BrandingSection />
			</section>
			<section className="space-y-4">
				<div>
					<h3 className="text-lg font-semibold">Presentación y contacto</h3>
					<p className="text-sm text-muted-foreground">
						Configura cómo se destacan tus productos y cómo se comunican los
						clientes contigo.
					</p>
				</div>
				<SettingsConfigurationSection section="storefront" />
			</section>
			<section className="space-y-4">
				<div>
					<h3 className="text-lg font-semibold">Dominio</h3>
					<p className="text-sm text-muted-foreground">
						Elige cómo encuentran los clientes tu tienda online.
					</p>
				</div>
				<div className="divide-y overflow-hidden rounded-xl border bg-card">
					<ReadOnlyRow
						label="URL de la tienda DEPIQO"
						value={`${business.slug}.depiqo.com`}
					/>
				</div>
				<CustomDomainSection />
			</section>
		</div>
	);
}
