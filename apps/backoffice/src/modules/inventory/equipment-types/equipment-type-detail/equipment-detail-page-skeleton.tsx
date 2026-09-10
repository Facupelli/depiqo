import { Skeleton } from "@repo/ui/components/skeleton";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";
import { DetailPageShell } from "@/components/detail-page-shell";

export function EquipmentDetailPageSkeleton() {
	return (
		<div aria-busy="true" className="pb-8">
			<span aria-live="polite" className="sr-only">
				Cargando detalle del equipo
			</span>
			<DetailPageShell
				breadcrumb={
					<PageBreadcrumb
						parent={{
							label: "Equipos",
							to: "/dashboard/inventory/equipment-types",
						}}
						current="Cargando equipo..."
					/>
				}
				header={
					<header className="border-b border-neutral-200 pb-6">
						<div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
							<div className="flex items-center gap-4">
								<Skeleton className="size-20 shrink-0 rounded-xl sm:size-24" />
								<div className="min-w-0 space-y-2">
									<Skeleton className="h-8 w-56 max-w-[60vw]" />
									<Skeleton className="h-4 w-28" />
									<Skeleton className="h-4 w-36" />
									<Skeleton className="h-4 w-72 max-w-[60vw]" />
								</div>
							</div>
							<div className="flex flex-wrap gap-2">
								<Skeleton className="h-9 w-36" />
								<Skeleton className="h-9 w-32" />
							</div>
						</div>
					</header>
				}
				navigation={
					<div className="flex h-12 items-center gap-8 overflow-hidden border-b px-4">
						<Skeleton className="h-4 w-20 shrink-0" />
						<Skeleton className="h-4 w-24 shrink-0" />
						<Skeleton className="h-4 w-24 shrink-0" />
					</div>
				}
			>
				<section className="rounded-xl border bg-card p-5 sm:p-6">
					<div className="space-y-3">
						<Skeleton className="h-6 w-40" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				</section>
			</DetailPageShell>
		</div>
	);
}
