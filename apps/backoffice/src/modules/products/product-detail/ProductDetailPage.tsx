import type { GetRentableItemDetailResponseDto } from "@repo/api-contracts";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@repo/ui/components/tabs";
import { Building2, PackageOpen } from "lucide-react";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";
import { buildR2PublicUrl } from "@/lib/r2-public-url";
import type { PricePlanOption } from "@/modules/products/product-pricing/price-plan-selection/PricePlanSelectionForm";
import { ProductAvailabilitySection } from "./ProductAvailabilitySection";
import { ProductOverview } from "./ProductOverview";
import {
	getStartingPrice,
	getTotalPhysicalStockCapacity,
} from "./product-detail.utils";
import { RequiredEquipmentSection } from "./RequiredEquipmentSection";

type ProductDetailPageProps = {
	product: GetRentableItemDetailResponseDto;
	ratePlanOptions: PricePlanOption[];
};

export function ProductDetailPage({
	product,
	ratePlanOptions,
}: ProductDetailPageProps) {
	const imageUrl = buildR2PublicUrl(product.imageUrl, "catalog");
	const startingPrice = getStartingPrice(product);
	const physicalStockCapacity = getTotalPhysicalStockCapacity(product.offers);

	return (
		<div className="px-6 pb-8">
			<PageBreadcrumb
				parent={{ label: "Productos", to: "/dashboard/catalog" }}
				current={`Producto / ${product.name}`}
			/>
			<div className="space-y-5">
				<ProductOverview
					product={product}
					imageUrl={imageUrl}
					startingPrice={startingPrice}
					physicalStockCapacity={physicalStockCapacity}
					ratePlanOptions={ratePlanOptions}
				/>
				<Tabs defaultValue="branches" className="flex flex-col gap-y-4">
					<TabsList
						variant="line"
						className="h-auto justify-start rounded-none border-b bg-transparent p-0"
					>
						<TabsTrigger
							value="branches"
							className="gap-2 rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-medium text-muted-foreground shadow-none transition-none focus-visible:ring-0 [&::after]:hidden data-active:border-b-primary data-active:bg-transparent data-active:font-semibold data-active:text-primary data-active:shadow-none"
						>
							<Building2 className="size-4" />
							Disponibilidad por sucursal
						</TabsTrigger>
						<TabsTrigger
							value="equipment"
							className="gap-2 rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-medium text-muted-foreground shadow-none transition-none focus-visible:ring-0 [&::after]:hidden data-active:border-b-primary data-active:bg-transparent data-active:font-semibold data-active:text-primary data-active:shadow-none"
						>
							<PackageOpen className="size-4" />
							Equipo
						</TabsTrigger>
					</TabsList>
					<TabsContent value="branches" className="mt-0">
						<ProductAvailabilitySection
							product={product}
							ratePlanOptions={ratePlanOptions}
						/>
					</TabsContent>
					<TabsContent value="equipment" className="mt-0">
						<RequiredEquipmentSection product={product} />
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
