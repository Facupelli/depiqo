import type { RentalOperationSummaryDto } from "@repo/api-contracts";
import { Skeleton } from "@repo/ui/components/skeleton";
import { RentalOperationRow } from "./rental-operation-row";

type RentalOperationsSectionProps = {
	title: "Salidas" | "Devoluciones";
	operations: RentalOperationSummaryDto[];
	emptyMessage: string;
	timezone: string;
	isSingleDay: boolean;
	isLoading: boolean;
};

export function RentalOperationsSection({
	title,
	operations,
	emptyMessage,
	timezone,
	isSingleDay,
	isLoading,
}: RentalOperationsSectionProps) {
	return (
		<section className="overflow-hidden rounded-lg border bg-card">
			<header className="border-b px-4 py-3">
				<h2 className="font-semibold text-foreground">{title}</h2>
			</header>
			{isLoading ? (
				<OperationsSkeleton title={title} />
			) : operations.length === 0 ? (
				<p className="px-4 py-12 text-center text-sm text-muted-foreground">
					{emptyMessage}
				</p>
			) : (
				<ul className="divide-y">
					{operations.map((operation) => (
						<RentalOperationRow
							key={operation.id}
							operation={operation}
							timezone={timezone}
							isSingleDay={isSingleDay}
						/>
					))}
				</ul>
			)}
		</section>
	);
}

function OperationsSkeleton({ title }: { title: string }) {
	return (
		<ul className="divide-y" aria-label={`Cargando ${title.toLowerCase()}`}>
			{["first", "second", "third", "fourth"].map((row) => (
				<li
					key={row}
					className="grid grid-cols-[5rem_1fr_auto] gap-3 px-4 py-3"
				>
					<Skeleton className="h-5 w-20" />
					<div className="space-y-2">
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-3 w-16" />
					</div>
					<Skeleton className="h-4 w-12" />
				</li>
			))}
		</ul>
	);
}
