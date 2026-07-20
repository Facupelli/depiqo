import type { GetPromotionsPromotionDto } from "@repo/api-contracts";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Input } from "@repo/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Route } from "@/routes/_admin/dashboard/promotions";
import { usePromotionsTab } from "../hooks/use-promotions-tab";
import { PromotionsList } from "./promotions-list";

const TABLE_SKELETON_KEYS = [
	"promotion-skeleton-1",
	"promotion-skeleton-2",
	"promotion-skeleton-3",
	"promotion-skeleton-4",
	"promotion-skeleton-5",
] as const;

export function PromotionsTab() {
	const navigate = useNavigate({ from: Route.fullPath });
	const search = Route.useSearch();
	const {
		inputValue,
		setInputValue,
		query,
		activation,
		handleActivationChange,
	} = usePromotionsTab();

	function handleEdit(promotion: GetPromotionsPromotionDto) {
		navigate({
			to: "/dashboard/promotions/$promotionId/edit",
			params: { promotionId: promotion.id },
			search,
		});
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<div className="relative max-w-sm flex-1">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						className="pl-9"
						placeholder="Buscar promociones..."
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
					/>
				</div>

				<Select
					value={activation ?? "ALL"}
					onValueChange={(value) =>
						handleActivationChange(
							value === "ALL"
								? undefined
								: (value as "AUTOMATIC" | "COUPON_REQUIRED"),
						)
					}
					items={
						[
							{ value: "ALL", label: "Todas las activaciones" },
							{ value: "AUTOMATIC", label: "Automaticas" },
							{ value: "COUPON_REQUIRED", label: "Con cupon" },
						] as const
					}
				>
					<SelectTrigger className="w-full sm:w-52">
						<SelectValue placeholder="Todas las activaciones" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">Todas las activaciones</SelectItem>
						<SelectItem value="AUTOMATIC">Automaticas</SelectItem>
						<SelectItem value="COUPON_REQUIRED">Con cupon</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div>
				<div className="px-2">
					{query.isLoading ? (
						<TableSkeleton />
					) : query.isError ? (
						<p className="py-10 text-center text-sm text-destructive">
							No se pudieron cargar las promociones.
						</p>
					) : query.data?.length === 0 ? (
						<p className="py-10 text-center text-sm text-muted-foreground">
							No se encontraron promociones.
						</p>
					) : (
						<PromotionsList promotions={query.data ?? []} onEdit={handleEdit} />
					)}
				</div>
			</div>
		</div>
	);
}

function TableSkeleton() {
	return (
		<div className="space-y-3 px-1 pt-2">
			{TABLE_SKELETON_KEYS.map((key) => (
				<Skeleton key={key} className="h-12 w-full rounded-md" />
			))}
		</div>
	);
}
