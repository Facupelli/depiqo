import { Button } from "@repo/ui/components/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function UnitAvailabilityPagination({
	page,
	totalPages,
	onPageChange,
}: {
	page: number;
	totalPages: number;
	onPageChange: (page: number) => void;
}) {
	return (
		<div className="flex items-center gap-2">
			<span className="text-xs text-neutral-600 tabular-nums">
				Página {page} de {totalPages}
			</span>
			<Button
				type="button"
				variant="outline"
				size="icon-sm"
				aria-label="Página anterior"
				disabled={page <= 1}
				onClick={() => onPageChange(page - 1)}
			>
				<ChevronLeft />
			</Button>
			<Button
				type="button"
				variant="outline"
				size="icon-sm"
				aria-label="Página siguiente"
				disabled={page >= totalPages}
				onClick={() => onPageChange(page + 1)}
			>
				<ChevronRight />
			</Button>
		</div>
	);
}
