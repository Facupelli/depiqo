import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@repo/ui/components/breadcrumb";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Link } from "@tanstack/react-router";

export function RentalDetailPageSkeleton() {
	return (
		<div aria-busy="true" className="@container/rental-detail text-neutral-950">
			<span aria-live="polite" className="sr-only">
				Cargando detalle del alquiler
			</span>

			<Breadcrumb className="pt-6 pb-4">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink
							render={<Link to="/dashboard/orders">Alquileres</Link>}
						/>
					</BreadcrumbItem>
					<BreadcrumbSeparator className="hidden @5xl/rental-detail:block" />
					<BreadcrumbItem className="hidden min-w-0 @5xl/rental-detail:block">
						<BreadcrumbPage>
							<Skeleton className="h-4 w-28" />
						</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<HeaderSkeleton />
			<OperationalSummarySkeleton />

			<div className="grid gap-6 pt-6 pb-8 @5xl/rental-detail:grid-cols-[minmax(0,1fr)_360px] @5xl/rental-detail:gap-8 @5xl/rental-detail:py-10">
				<EquipmentSectionSkeleton />
				<div className="min-w-0 @5xl/rental-detail:col-start-2 @5xl/rental-detail:row-span-2 @5xl/rental-detail:row-start-1">
					<ContextualDetailsSkeleton />
				</div>
				<ActivityLogSkeleton />
			</div>
		</div>
	);
}

function HeaderSkeleton() {
	return (
		<header className="border-b border-neutral-200 pb-5 @5xl/rental-detail:pb-8">
			<div className="flex min-w-0 flex-col gap-4 @sm/rental-detail:flex-row @sm/rental-detail:items-start @sm/rental-detail:justify-between">
				<div className="min-w-0">
					<div className="mb-1.5 flex min-w-0 flex-wrap items-center gap-3">
						<Skeleton className="h-8 w-36" />
						<Skeleton className="h-5 w-20" />
					</div>
					<Skeleton className="mt-2 h-4 w-48 max-w-full" />
				</div>
				<Skeleton className="h-9 w-36 shrink-0" />
			</div>
		</header>
	);
}

function OperationalSummarySkeleton() {
	return (
		<section className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50/60 px-4 py-4 @5xl/rental-detail:hidden">
			<div className="grid grid-cols-1 gap-x-6 gap-y-4 @sm/rental-detail:grid-cols-2">
				<SummaryItemSkeleton
					className="@sm/rental-detail:col-span-2"
					width="w-44"
				/>
				<SummaryItemSkeleton width="w-32" />
				<SummaryItemSkeleton width="w-36" />
				<SummaryItemSkeleton width="w-28" />
				<SummaryItemSkeleton width="w-24" />
			</div>
		</section>
	);
}

function SummaryItemSkeleton({
	className = "",
	width,
}: {
	className?: string;
	width: string;
}) {
	return (
		<div className={`min-w-0 ${className}`}>
			<Skeleton className="h-2.5 w-16" />
			<Skeleton className={`mt-2 h-4 max-w-full ${width}`} />
		</div>
	);
}

function EquipmentSectionSkeleton() {
	return (
		<section className="min-w-0">
			<div className="mb-5 flex min-w-0 flex-col gap-3 @3xl/rental-detail:flex-row @3xl/rental-detail:items-center @3xl/rental-detail:justify-between">
				<h2 className="text-sm font-semibold text-neutral-950">
					Equipos y accesorios
				</h2>
				<div className="flex flex-wrap gap-2">
					<Skeleton className="h-9 w-32" />
					<Skeleton className="h-9 w-40" />
				</div>
			</div>
			<div className="space-y-3">
				<EquipmentCardSkeleton />
				<EquipmentCardSkeleton />
			</div>
		</section>
	);
}

function EquipmentCardSkeleton() {
	return (
		<div className="@container/equipment-card min-w-0 rounded-xl border border-neutral-200 bg-white p-3 @sm/equipment-card:p-4">
			<div className="flex min-w-0 items-start gap-3 @md/equipment-card:gap-4">
				<Skeleton className="size-14 shrink-0 rounded-lg @md/equipment-card:size-18" />
				<div className="min-w-0 flex-1 space-y-2">
					<div className="flex min-w-0 items-center justify-between gap-3">
						<Skeleton className="h-4 w-3/5" />
						<Skeleton className="size-6 shrink-0" />
					</div>
					<div className="flex flex-wrap gap-2">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-5 w-16 rounded-full" />
					</div>
					<Skeleton className="h-3 w-32 max-w-full" />
					<div className="space-y-1.5">
						<Skeleton className="h-3 w-16" />
						<Skeleton className="h-6 w-28 max-w-full" />
					</div>
				</div>
			</div>
			<div className="mt-4 border-neutral-100 border-t pt-3">
				<Skeleton className="mb-2 h-3 w-28" />
				<div className="flex min-w-0 items-center gap-3 rounded-lg border border-neutral-100 bg-neutral-50 px-2.5 py-2">
					<Skeleton className="size-10 shrink-0 rounded-md" />
					<div className="min-w-0 flex-1 space-y-1.5">
						<Skeleton className="h-3.5 w-2/5" />
						<Skeleton className="h-3 w-24" />
					</div>
				</div>
			</div>
		</div>
	);
}

function ContextualDetailsSkeleton() {
	return (
		<aside className="space-y-2 @5xl/rental-detail:space-y-4">
			<ContextualCardSkeleton body="customer" />
			<ContextualCardSkeleton />
			<ContextualCardSkeleton body="logistics" />
			<ContextualCardSkeleton body="financials" />
		</aside>
	);
}

type ContextualCardSkeletonProps = {
	body?: "customer" | "logistics" | "financials";
};

function ContextualCardSkeleton({ body }: ContextualCardSkeletonProps) {
	return (
		<section className="rounded-lg border border-neutral-200 bg-white p-4 @5xl/rental-detail:p-5">
			<div className="flex min-w-0 items-center justify-between gap-3 @5xl/rental-detail:hidden">
				<div className="min-w-0 flex-1 space-y-2">
					<Skeleton className="h-4 w-36 max-w-full" />
					<Skeleton className="h-3.5 w-4/5" />
				</div>
				<Skeleton className="size-4 shrink-0" />
			</div>
			<div className="hidden @5xl/rental-detail:block">
				<div className="mb-3 flex items-center gap-2 border-neutral-100 border-b pb-1">
					<Skeleton className="size-8 rounded-full" />
					<Skeleton className="h-4 w-36" />
				</div>
				<ContextualCardBodySkeleton body={body} />
			</div>
		</section>
	);
}

function ContextualCardBodySkeleton({ body }: ContextualCardSkeletonProps) {
	if (body === "customer") {
		return (
			<div className="space-y-3">
				<div className="flex items-center gap-3">
					<Skeleton className="size-10 shrink-0 rounded-full" />
					<Skeleton className="h-4 w-36" />
				</div>
				<Skeleton className="h-3 w-48" />
				<Skeleton className="h-3 w-32" />
			</div>
		);
	}

	if (body === "logistics") {
		return (
			<div className="grid grid-cols-2 gap-6">
				<div className="space-y-2">
					<Skeleton className="h-3 w-20" />
					<Skeleton className="h-4 w-28" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-3 w-20" />
					<Skeleton className="h-4 w-28" />
				</div>
			</div>
		);
	}

	if (body === "financials") {
		return (
			<div className="space-y-3">
				<div className="flex justify-between gap-4">
					<Skeleton className="h-4 w-12" />
					<Skeleton className="h-6 w-28" />
				</div>
				<div className="flex justify-between gap-4 border-neutral-200 border-t border-dashed pt-3">
					<Skeleton className="h-3 w-20" />
					<Skeleton className="h-3 w-16" />
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-3">
			<Skeleton className="size-10 shrink-0 rounded-full" />
			<div className="min-w-0 flex-1 space-y-2">
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-3 w-44 max-w-full" />
			</div>
		</div>
	);
}

function ActivityLogSkeleton() {
	return (
		<section className="min-w-0">
			<div className="mb-5 flex items-center gap-2">
				<Skeleton className="size-4 rounded-full" />
				<span className="text-sm font-semibold text-neutral-950">
					Activity Log
				</span>
			</div>
			<div className="flex min-w-0 items-start gap-4">
				<Skeleton className="size-8 shrink-0 rounded-full" />
				<div className="min-w-0 flex-1 space-y-2 pb-6">
					<Skeleton className="h-4 w-32 max-w-full" />
					<Skeleton className="h-3 w-48 max-w-full" />
				</div>
			</div>
		</section>
	);
}
