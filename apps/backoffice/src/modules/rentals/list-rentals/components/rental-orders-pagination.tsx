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
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useRentalOrdersList } from "./rental-orders-list.context";

export function RentalOrdersPagination() {
	const {
		search,
		meta,
		isLoading,
		isRefreshing,
		isPaused,
		isError,
		setPage,
		setLimit,
	} = useRentalOrdersList();
	const { page, limit } = search;
	const { total, totalPages } = meta;
	const disabled = isLoading || isRefreshing || isPaused;
	const outOfRange = !isLoading && !isError && page > totalPages;
	const pages = [...new Set([1, totalPages, page - 1, page, page + 1])]
		.filter((value) => value >= 1 && value <= totalPages)
		.sort((a, b) => a - b);
	const items = pages.flatMap((value, index) =>
		index > 0 && value - pages[index - 1] > 1
			? [`gap-${value}`, value]
			: [value],
	);
	const sizes = [...new Set([10, 20, 50, 100, limit])]
		.sort((a, b) => a - b)
		.map((value) => ({ value: String(value), label: `${value} por página` }));

	return (
		<div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t px-4 py-4">
			<output className="text-xs text-muted-foreground tabular-nums">
				{isPaused ? (
					"Sin conexión. Esperando para actualizar los alquileres..."
				) : isRefreshing ? (
					<>
						<Loader2 className="mr-2 inline-block size-3.5 animate-spin align-middle" />
						Actualizando alquileres...
					</>
				) : isLoading ? (
					"Cargando alquileres..."
				) : isError ? (
					"No se pudo actualizar el listado"
				) : outOfRange ? (
					`${total} alquileres`
				) : (
					<>
						Mostrando{" "}
						<span className="font-medium text-foreground">
							{total === 0 ? 0 : (page - 1) * limit + 1}-
							{Math.min(page * limit, total)}
						</span>{" "}
						de <span className="font-medium text-foreground">{total}</span>{" "}
						{total === 1 ? "alquiler" : "alquileres"}
					</>
				)}
			</output>
			<div className="flex min-w-0 flex-wrap items-center gap-3">
				{outOfRange ? (
					<Button
						variant="outline"
						size="sm"
						className="h-auto min-h-8 whitespace-normal text-xs shadow-none"
						disabled={disabled}
						onClick={() => setPage(totalPages)}
					>
						Ir a la última página disponible
					</Button>
				) : total > 0 ? (
					<Pagination
						aria-label="Paginación de alquileres"
						className="mx-0 w-auto"
					>
						<PaginationContent>
							<PaginationItem>
								<Button
									variant="outline"
									size="icon"
									aria-label="Página anterior"
									className="size-8 shadow-none pointer-coarse:size-11"
									disabled={disabled || page <= 1}
									onClick={() => setPage(page - 1)}
								>
									<ChevronLeft className="size-4" />
								</Button>
							</PaginationItem>
							<li className="px-2 text-xs text-muted-foreground tabular-nums @sm/rentals-index:hidden">
								{page} de {totalPages}
							</li>
							{items.map((item) => (
								<PaginationItem
									key={item}
									className="hidden @sm/rentals-index:block"
								>
									{typeof item === "string" ? (
										<PaginationEllipsis className="size-8" />
									) : (
										<Button
											variant="outline"
											size="icon"
											aria-label={`Página ${item}`}
											aria-current={item === page ? "page" : undefined}
											className={`size-8 text-xs shadow-none pointer-coarse:size-11 ${item === page ? "border-depiqo-blue-200 bg-depiqo-blue-50 text-depiqo-blue-700 disabled:opacity-100" : "text-foreground"}`}
											disabled={disabled || item === page}
											onClick={() => setPage(item)}
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
									className="size-8 shadow-none pointer-coarse:size-11"
									disabled={disabled || page >= totalPages}
									onClick={() => setPage(page + 1)}
								>
									<ChevronRight className="size-4" />
								</Button>
							</PaginationItem>
						</PaginationContent>
					</Pagination>
				) : null}
				<Select
					value={String(limit)}
					items={sizes}
					disabled={disabled}
					onValueChange={(value) => {
						if (value) setLimit(Number(value));
					}}
				>
					<SelectTrigger
						aria-label="Resultados por página"
						className="h-8 w-36 rounded-md text-xs shadow-none pointer-coarse:min-h-11"
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{sizes.map((item) => (
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
