import { Skeleton } from "@repo/ui/components/skeleton";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";
import { DetailPageShell } from "@/components/detail-page-shell";
export function ComboDetailPageSkeleton() {
	return (
		<div aria-busy="true" className="pb-8">
			<DetailPageShell
				breadcrumb={
					<PageBreadcrumb
						parent={{ label: "Combos", to: "/dashboard/catalog/packages" }}
						current="Cargando combo..."
					/>
				}
				header={
					<header className="flex flex-col gap-5 border-b pb-6 sm:flex-row sm:justify-between">
						<div className="flex gap-4">
							<Skeleton className="size-20 rounded-xl sm:size-24" />
							<div className="space-y-2">
								<Skeleton className="h-8 w-56 max-w-[60vw]" />
								<Skeleton className="h-4 w-28" />
								<Skeleton className="h-5 w-52" />
								<Skeleton className="h-4 w-72 max-w-[60vw]" />
							</div>
						</div>
						<div className="flex gap-2">
							<Skeleton className="h-9 w-36" />
							<Skeleton className="size-9" />
						</div>
					</header>
				}
				navigation={<Skeleton className="h-12 w-full" />}
			>
				<section className="overflow-hidden rounded-xl border">
					<div className="space-y-2 border-b p-5">
						<Skeleton className="h-5 w-36" />
						<Skeleton className="h-4 w-80 max-w-full" />
					</div>
					{[1, 2, 3, 4].map((item) => (
						<div
							key={item}
							className="flex justify-between border-b px-5 py-3 last:border-b-0"
						>
							<Skeleton className="h-4 w-48" />
							<Skeleton className="h-4 w-20" />
						</div>
					))}
				</section>
			</DetailPageShell>
		</div>
	);
}
