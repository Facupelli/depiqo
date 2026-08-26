import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useId, useRef } from "react";
import { useNewArrivals } from "@/modules/catalog/new-arrivals/new-arrivals.queries";
import { usePublicTenantConfig } from "@/modules/tenant-management/tenant/tenant.queries";
import { NewArrivalCard } from "./new-arrival-card";

interface NewArrivalsProps {
	branchId: string;
}

export function NewArrivals({ branchId }: NewArrivalsProps) {
	const headingId = useId();
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const { data: tenantPublicConfig } = usePublicTenantConfig();
	const { data: products } = useNewArrivals({
		branchId,
		windowDays: tenantPublicConfig.newArrivalsWindowDays,
	});

	if (products.length === 0) {
		return null;
	}

	const scroll = (direction: -1 | 1) => {
		scrollContainerRef.current?.scrollBy({
			left: direction * 440,
			behavior: "smooth",
		});
	};

	return (
		<section className="py-8" aria-labelledby={headingId}>
			<div className="mb-4 flex items-center justify-between gap-4">
				<div>
					<h2 id={headingId} className="text-xl font-semibold tracking-tight">
						Nuevos productos
					</h2>
				</div>
				<div className="hidden items-center gap-2 md:flex">
					<Button
						type="button"
						variant="outline"
						size="icon-sm"
						aria-label="Ver productos anteriores"
						onClick={() => scroll(-1)}
					>
						<ChevronLeft />
					</Button>
					<Button
						type="button"
						variant="outline"
						size="icon-sm"
						aria-label="Ver más productos nuevos"
						onClick={() => scroll(1)}
					>
						<ChevronRight />
					</Button>
				</div>
			</div>
			<div
				ref={scrollContainerRef}
				className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5"
			>
				{products.map((product) => (
					<NewArrivalCard
						key={product.id}
						product={product}
						locale={tenantPublicConfig.locale}
					/>
				))}
			</div>
		</section>
	);
}

export function NewArrivalsSkeleton() {
	return (
		<section className="border-b border-border/60 py-7" aria-hidden="true">
			<Skeleton className="mb-2 h-3 w-28" />
			<Skeleton className="mb-4 h-6 w-44" />
			<div className="flex gap-4 overflow-hidden">
				{Array.from({ length: 5 }, (_, index) => `new-arrival-${index}`).map(
					(key) => (
						<div key={key} className="w-40 shrink-0 sm:w-44 lg:w-48">
							<Skeleton className="aspect-square" />
							<Skeleton className="mt-3 h-3 w-14" />
							<Skeleton className="mt-2 h-4 w-4/5" />
							<Skeleton className="mt-2 h-4 w-1/2" />
						</div>
					),
				)}
			</div>
		</section>
	);
}
