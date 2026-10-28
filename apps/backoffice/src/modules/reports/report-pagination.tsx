import { Button } from "@repo/ui/components/button";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
} from "@repo/ui/components/pagination";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function ReportPagination({
	page,
	pageSize,
	total,
	noun,
	disabled,
	onPageChange,
	onPageSizeChange,
}: {
	page: number;
	pageSize: number;
	total: number;
	noun: "alquileres" | "tipos de equipo";
	disabled: boolean;
	onPageChange: (page: number) => void;
	onPageSizeChange: (pageSize: number) => void;
}) {
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const isOutOfRange = page > totalPages;
	const pages = [
		...new Set([
			1,
			totalPages,
			page - 1,
			page,
			page + 1,
			...(page <= 2 ? [2, 3] : []),
			...(page >= totalPages - 1 ? [totalPages - 2, totalPages - 1] : []),
		]),
	]
		.filter((value) => value >= 1 && value <= totalPages)
		.sort((a, b) => a - b);
	const pageItems = pages.flatMap((value, index) =>
		index > 0 && value - pages[index - 1] > 1
			? [`gap-${value}`, value]
			: [value],
	);
	const from = Math.min((page - 1) * pageSize + 1, total);
	const until = Math.min(page * pageSize, total);
	const resultNoun =
		total === 1
			? noun === "alquileres"
				? "alquiler"
				: "tipo de equipo"
			: noun;
	const pageSizeItems = [...new Set([10, 20, 50, 100, pageSize])]
		.sort((a, b) => a - b)
		.map((value) => ({ value: String(value), label: `${value} por página` }));
	return (
		<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 pt-4">
			<p
				className="text-xs text-muted-foreground tabular-nums"
				aria-live="polite"
			>
				{total > 0 && isOutOfRange
					? `${total} ${resultNoun}`
					: `Mostrando ${total === 0 ? 0 : from}-${until} de ${total} ${resultNoun}`}
			</p>
			<div className="flex flex-wrap items-center gap-3">
				{total > 0 && isOutOfRange ? (
					<Button
						variant="outline"
						size="sm"
						className="h-auto min-h-8 whitespace-normal text-xs shadow-none pointer-coarse:min-h-11"
						disabled={disabled}
						onClick={() => onPageChange(totalPages)}
					>
						Ir a la última página disponible
					</Button>
				) : null}
				{total > 0 && !isOutOfRange ? (
					<Pagination
						aria-label="Paginación del reporte"
						className="mx-0 min-w-0 max-w-full w-auto"
					>
						<PaginationContent className="flex-wrap">
							<PaginationItem>
								<Button
									variant="outline"
									size="icon"
									aria-label="Página anterior"
									className="size-8 rounded-md shadow-none pointer-coarse:size-11"
									disabled={disabled || page <= 1}
									onClick={() => onPageChange(Math.max(1, page - 1))}
								>
									<ChevronLeft className="size-4" />
								</Button>
							</PaginationItem>
							{pageItems.map((item) => (
								<PaginationItem key={item}>
									{typeof item === "string" ? (
										<PaginationEllipsis className="size-8" />
									) : (
										<Button
											variant="outline"
											size="icon"
											aria-label={`Página ${item}`}
											aria-current={item === page ? "page" : undefined}
											className={`size-8 rounded-md text-xs shadow-none pointer-coarse:size-11 ${item === page ? "border-depiqo-blue-600 bg-depiqo-blue-600 text-white hover:bg-depiqo-blue-700 hover:text-white disabled:opacity-100" : "text-foreground"}`}
											disabled={disabled || item === page}
											onClick={() => onPageChange(item)}
										>
											{item}
										</Button>
									)}
								</PaginationItem>
							))}
							<PaginationItem>
								<Button
									variant="outline"
									size="icon"
									aria-label="Página siguiente"
									className="size-8 rounded-md shadow-none pointer-coarse:size-11"
									disabled={disabled || page >= totalPages}
									onClick={() => onPageChange(page + 1)}
								>
									<ChevronRight className="size-4" />
								</Button>
							</PaginationItem>
						</PaginationContent>
					</Pagination>
				) : null}
				<Select
					value={String(pageSize)}
					items={pageSizeItems}
					disabled={disabled}
					onValueChange={(value) => {
						if (value) onPageSizeChange(Number(value));
					}}
				>
					<SelectTrigger
						aria-label="Resultados por página"
						className="h-8 w-36 rounded-md border-input text-xs shadow-none pointer-coarse:min-h-11"
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{pageSizeItems.map((item) => (
							<SelectItem key={item.value} value={item.value}>
								{item.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
