import { PricingTiersTable } from "@/features/catalog/pricing-tier/components/pricing-tiers-table";
import type { PricingTierFormValues } from "@/features/catalog/pricing-tier/schemas/pricing-tier-form.schema";
import { useProduct } from "./product-detail.context";

export function PricingTab({
	pendingTiers,
}: {
	pendingTiers: PricingTierFormValues[];
}) {
	const { product } = useProduct();

	return (
		<div className="space-y-8">
			<section className="space-y-3">
				<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
					Pricing Tiers
				</h3>
				<PricingTiersTable
					tiers={product.pricingTiers.map((tier) => ({
						id: tier.id,
						fromUnit: tier.fromUnit,
						toUnit: tier.toUnit,
						pricePerUnit: tier.pricePerUnit.toString(),
						location: {
							name: tier.location?.name ?? "Global (Default)",
						},
					}))}
					pendingTiers={pendingTiers}
					billingUnitLabel={product.billingUnit.label}
				/>
			</section>
		</div>
	);
}
