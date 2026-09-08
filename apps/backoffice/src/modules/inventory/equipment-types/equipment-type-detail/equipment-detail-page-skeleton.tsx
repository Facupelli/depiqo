import { Skeleton } from "@repo/ui/components/skeleton";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";

export function EquipmentDetailPageSkeleton() {
	return (
		<div aria-busy="true" className="px-4 pb-8 sm:px-6">
			<span aria-live="polite" className="sr-only">
				Cargando detalle del equipo
			</span>
			<PageBreadcrumb
				parent={{
					label: "Equipos",
					to: "/dashboard/inventory/equipment-types",
				}}
				current="Cargando equipo..."
			/>
			<div className="space-y-5">
				<header className="border-b border-neutral-200 pb-6">
					<div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
						<div className="flex items-center gap-4">
							<Skeleton className="size-20 shrink-0 rounded-xl sm:size-24" />
							<div className="space-y-2">
								<Skeleton className="h-8 w-56 max-w-[60vw]" />
								<Skeleton className="h-4 w-28" />
								<Skeleton className="h-4 w-36" />
							</div>
						</div>
						<div className="flex gap-2">
							<Skeleton className="h-9 w-36" />
							<Skeleton className="size-9" />
						</div>
					</div>
				</header>
				<div className="border-b pb-3">
					<Skeleton className="h-6 w-24" />
				</div>
				<section className="rounded-xl border bg-card">
					<div className="border-b px-5 py-4 sm:px-6">
						<Skeleton className="h-5 w-44" />
					</div>
					<div className="grid gap-x-8 gap-y-6 px-5 py-6 sm:grid-cols-2 sm:px-6">
						{["name", "category", "description", "units"].map((fact) => (
							<div key={fact} className="space-y-2">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-4 w-48" />
							</div>
						))}
					</div>
				</section>
			</div>
		</div>
	);
}
