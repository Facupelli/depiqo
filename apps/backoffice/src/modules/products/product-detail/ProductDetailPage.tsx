import type { GetRentableItemDetailResponseDto } from "@repo/api-contracts";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@repo/ui/components/tabs";
import { Building2, PackageOpen, Pencil } from "lucide-react";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";
import { CreateRentalOfferWithPricingDialog } from "@/features/admin/offering-setup/create-rental-offer-with-pricing/create-rental-offer-with-pricing-dialog";
import { buildR2PublicUrl } from "@/lib/r2-public-url";
import { ActivateProductAction } from "@/modules/products/activate-product/ActivateProductAction";
import {
	ProductAvailabilitySection,
	ProductAvailabilityStatusSummary,
	type RatePlanOption,
} from "./ProductAvailabilitySection";
import { ProductOverview } from "./ProductOverview";
import { getOfferMetrics, getStartingPrice } from "./product-detail.utils";
import { RequiredEquipmentSection } from "./RequiredEquipmentSection";

type ProductDetailPageProps = {
	product: GetRentableItemDetailResponseDto;
	ratePlanOptions: RatePlanOption[];
};

const statusPresentation = {
	DRAFT: {
		label: "Borrador",
		description: "Los clientes no pueden verlo ni solicitarlo.",
		variant: "secondary",
		className: "",
	},
	ACTIVE: {
		label: "Activo",
		description: "Los clientes pueden verlo y solicitarlo.",
		variant: "default",
		className: "bg-emerald-600 text-white",
	},
	ARCHIVED: {
		label: "Archivado",
		description: "Los clientes no pueden verlo ni solicitarlo.",
		variant: "outline",
		className: "",
	},
} satisfies Record<
	GetRentableItemDetailResponseDto["status"],
	{
		label: string;
		description: string;
		variant: "default" | "secondary" | "outline";
		className: string;
	}
>;

export function ProductDetailPage({
	product,
	ratePlanOptions,
}: ProductDetailPageProps) {
	const imageUrl = buildR2PublicUrl(product.imageUrl, "catalog");
	const metrics = getOfferMetrics(product.offers);
	const startingPrice = getStartingPrice(product);

	return (
		<div className="px-6 pb-8">
			<PageBreadcrumb
				parent={{ label: "Productos", to: "/dashboard/catalog" }}
				current={`Producto / ${product.name}`}
			/>
			<div className="space-y-5">
				<header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
					<div className="min-w-0 space-y-2">
						<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
							<h1 className="truncate text-4xl font-semibold tracking-tight">
								{product.name}
							</h1>
							<ProductStatus status={product.status} />
						</div>
					</div>
					<div className="flex shrink-0 flex-wrap items-center gap-2">
						{product.status === "DRAFT" ? (
							<ActivateProductAction product={product} />
						) : null}
						<Button size="lg" onClick={() => undefined}>
							<Pencil className="mr-2 size-4" />
							Editar producto
						</Button>
					</div>
				</header>
				<ProductOverview
					product={product}
					imageUrl={imageUrl}
					startingPrice={startingPrice}
					readyOfferCount={metrics.ready}
				/>
				<ProductAvailabilityStatusSummary
					metrics={metrics}
					action={
						<CreateRentalOfferWithPricingDialog
							item={product}
							ratePlanOptions={ratePlanOptions}
						/>
					}
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

function ProductStatus({
	status,
}: {
	status: GetRentableItemDetailResponseDto["status"];
}) {
	const presentation = statusPresentation[status];
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Badge variant={presentation.variant} className={presentation.className}>
				{presentation.label}
			</Badge>
			<p className="text-sm text-muted-foreground">
				{presentation.description}
			</p>
		</div>
	);
}
