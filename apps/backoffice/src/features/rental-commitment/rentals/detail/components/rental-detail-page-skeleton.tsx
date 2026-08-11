import { Skeleton } from "@repo/ui/components/skeleton";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";

export function RentalDetailPageSkeleton() {
	return (
		<div
			aria-busy="true"
			className="min-h-screen bg-neutral-50 px-8 text-neutral-950"
		>
			<span aria-live="polite" className="sr-only">
				Cargando detalle del pedido
			</span>
			<PageBreadcrumb
				parent={{ label: "Pedidos", to: "/dashboard/orders" }}
				current="Cargando pedido..."
			/>

			<header className="border-neutral-200 border-b pb-8">
				<div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
					<div>
						<div className="mb-1.5 flex items-center gap-3">
							<Skeleton className="h-8 w-36" />
							<Skeleton className="h-5 w-20" />
						</div>
						<Skeleton className="mt-2 h-4 w-48" />
					</div>
					<Skeleton className="h-9 w-36" />
				</div>
			</header>

			<div className="grid grid-cols-1 gap-20 py-10 lg:grid-cols-[1fr_380px]">
				<div className="space-y-8">
					<section>
						<div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<h2 className="text-sm font-semibold text-neutral-950">
								Equipos y accesorios
							</h2>
							<Skeleton className="h-9 w-40" />
						</div>
						<div className="space-y-3">
							<EquipmentCardSkeleton />
							<EquipmentCardSkeleton />
						</div>
					</section>

					<ActivityLogSkeleton />
				</div>

				<aside className="space-y-4">
					<SidebarCardSkeleton
						title="Información del cliente"
						variant="customer"
					/>
					<SidebarCardSkeleton title="Firma del contrato" />
					<SidebarCardSkeleton title="Logística" variant="logistics" />
					<SidebarCardSkeleton
						title="Resumen financiero"
						variant="financials"
					/>
				</aside>
			</div>
		</div>
	);
}

function EquipmentCardSkeleton() {
	return (
		<div className="rounded-xl border border-neutral-200 bg-white p-4">
			<div className="grid gap-4 sm:grid-cols-[1fr_auto]">
				<div className="flex gap-4">
					<Skeleton className="size-18 shrink-0 rounded-lg" />
					<div className="min-w-0 flex-1 space-y-2">
						<Skeleton className="h-4 w-3/5" />
						<Skeleton className="h-3 w-20" />
						<Skeleton className="h-3 w-32" />
						<div className="flex gap-1.5 pt-1">
							<Skeleton className="h-5 w-20" />
							<Skeleton className="h-5 w-16" />
						</div>
					</div>
				</div>
				<Skeleton className="h-5 w-16" />
			</div>
		</div>
	);
}

function ActivityLogSkeleton() {
	return (
		<section>
			<div className="mb-5 flex items-center gap-2">
				<Skeleton className="size-4 rounded-full" />
				<span className="text-sm font-semibold text-neutral-950">
					Activity Log
				</span>
			</div>
			<div className="flex items-start gap-4">
				<Skeleton className="size-8 shrink-0 rounded-full" />
				<div className="space-y-2 pb-6">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-3 w-48" />
				</div>
			</div>
		</section>
	);
}

type SidebarCardSkeletonProps = {
	title: string;
	variant?: "customer" | "logistics" | "financials";
};

function SidebarCardSkeleton({ title, variant }: SidebarCardSkeletonProps) {
	return (
		<section className="rounded-lg border border-neutral-200 bg-white p-5">
			<div className="mb-3 flex items-center gap-2 border-neutral-100 border-b pb-1">
				<Skeleton className="size-8 rounded-full" />
				<h2 className="text-sm font-bold text-neutral-950">{title}</h2>
			</div>
			<SidebarCardBodySkeleton variant={variant} />
		</section>
	);
}

function SidebarCardBodySkeleton({
	variant,
}: Pick<SidebarCardSkeletonProps, "variant">) {
	if (variant === "customer") {
		return (
			<>
				<div className="mb-4 flex items-center gap-3">
					<Skeleton className="size-10 shrink-0 rounded-full" />
					<Skeleton className="h-4 w-36" />
				</div>
				<div className="space-y-2.5">
					<Skeleton className="h-3 w-48" />
					<Skeleton className="h-3 w-32" />
				</div>
			</>
		);
	}

	if (variant === "logistics") {
		return (
			<>
				<div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1">
					<div className="space-y-2">
						<Skeleton className="h-3 w-24" />
						<Skeleton className="h-4 w-32" />
					</div>
					<div className="space-y-2">
						<Skeleton className="h-3 w-28" />
						<Skeleton className="h-4 w-32" />
					</div>
				</div>
				<div className="space-y-2 border-neutral-100 border-t pt-3">
					<Skeleton className="h-3 w-36" />
					<Skeleton className="h-4 w-44" />
				</div>
			</>
		);
	}

	if (variant === "financials") {
		return (
			<>
				<div className="flex items-baseline justify-between py-3">
					<Skeleton className="h-4 w-12" />
					<Skeleton className="h-6 w-28" />
				</div>
				<div className="space-y-2 border-neutral-200 border-t border-dashed pt-3">
					<div className="flex justify-between">
						<Skeleton className="h-3 w-20" />
						<Skeleton className="h-3 w-20" />
					</div>
					<div className="flex justify-between">
						<Skeleton className="h-3 w-24" />
						<Skeleton className="h-3 w-16" />
					</div>
				</div>
			</>
		);
	}

	return (
		<div className="flex items-center gap-3">
			<Skeleton className="size-10 shrink-0 rounded-full" />
			<div className="flex-1 space-y-2">
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-3 w-44" />
			</div>
		</div>
	);
}
