import type {
	NewArrivalItemResponseDto,
	TenantPricingConfig,
} from "@repo/schemas";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { rentalQueries } from "@/features/rental/rental.queries";
import { usePortalTenantId } from "@/features/tenant-context/use-portal-tenant-id";
import { buildR2PublicUrl } from "@/lib/r2-public-url";
import { formatCurrency } from "@/shared/utils/price.utils";
import { useTenantPricingConfig } from "../../tenant/tenant.queries";

interface NewArrivalsProps {
	locationId?: string;
}

export function NewArrivals({ locationId }: NewArrivalsProps) {
	const tenantId = usePortalTenantId();
	const { data: items, isError } = useSuspenseQuery(
		rentalQueries.newArrivals(tenantId, { locationId }),
	);
	const { data: tenantPriceConfig } = useTenantPricingConfig();

	const scrollRef = useRef<HTMLDivElement>(null);

	function scroll(direction: "left" | "right") {
		if (!scrollRef.current) return;
		const amount = 320;
		scrollRef.current.scrollBy({
			left: direction === "left" ? -amount : amount,
			behavior: "smooth",
		});
	}

	if (isError) {
		return (
			<p className="text-sm text-destructive">
				Failed to load new arrivals. Please try again.
			</p>
		);
	}

	if (!items.length) {
		return null;
	}

	return (
		<div className="relative">
			<button
				type="button"
				onClick={() => scroll("left")}
				className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white border rounded-full p-1.5 shadow-sm hover:bg-gray-50 transition-colors"
				aria-label="Scroll left"
			>
				<ChevronLeft className="h-4 w-4" />
			</button>
			<button
				type="button"
				onClick={() => scroll("right")}
				className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white border rounded-full p-1.5 shadow-sm hover:bg-gray-50 transition-colors"
				aria-label="Scroll right"
			>
				<ChevronRight className="h-4 w-4" />
			</button>

			<div
				ref={scrollRef}
				className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
			>
				{items.map((item) => (
					<NewArrivalCard
						key={item.id}
						item={item}
						priceConfig={tenantPriceConfig}
					/>
				))}
			</div>
		</div>
	);
}

function NewArrivalCard({
	item,
	priceConfig,
}: {
	item: NewArrivalItemResponseDto;
	priceConfig: TenantPricingConfig;
}) {
	const price = item.pricingPreview;
	const productImage = buildR2PublicUrl(item.imageUrl, "catalog");

	return (
		<div className="w-40 shrink-0">
			<div className="aspect-square w-full bg-gray-100 rounded-xs overflow-hidden mb-2">
				{productImage ? (
					<img
						src={productImage}
						alt={item.name}
						loading="lazy"
						decoding="async"
						className="object-contain w-full h-full"
					/>
				) : (
					<div className="w-full h-full rounded-lg bg-muted shrink-0 flex items-center justify-center">
						<span className="text-sm text-muted-foreground">No image</span>
					</div>
				)}
			</div>

			<p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium truncate">
				{item.category?.name ?? "General"}
			</p>
			<p className="text-sm font-medium leading-tight line-clamp-2 mt-0.5">
				{item.name}
			</p>

			<div className="flex items-center justify-between mt-1 gap-2">
				{price ? (
					<p className="text-sm font-semibold shrink-0">
						{formatCurrency(
							price.pricePerUnit,
							priceConfig.currency,
							priceConfig.locale,
						)}
						<span className="text-xs font-normal text-muted-foreground">
							/{item.billingUnit.label}
						</span>
					</p>
				) : (
					<p className="text-xs text-muted-foreground">Contactanos</p>
				)}
			</div>
		</div>
	);
}

export function NewArrivalsSkeleton() {
	return (
		<div className="flex gap-4 overflow-hidden pb-2">
			{Array.from(
				{ length: 5 },
				(_, index) => `new-arrival-skeleton-${index}`,
			).map((key) => (
				<div key={key} className="shrink-0 w-44">
					<Skeleton className="aspect-square rounded-xs mb-2" />
					<Skeleton className="h-2.5 w-16 mb-1" />
					<Skeleton className="h-4 w-full mb-1" />
					<Skeleton className="h-4 w-3/4" />
				</div>
			))}
		</div>
	);
}
