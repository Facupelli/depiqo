import type { GetPromotionsPromotionDto } from "@repo/api-contracts";
import { Input } from "@repo/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Route } from "@/routes/_admin/dashboard/promotions";
import { PromotionsList } from "./PromotionsList";
import { usePromotionsTab } from "./use-promotions-tab";

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
			<div className="flex flex-col gap-3 @lg/promotions-index:flex-row @lg/promotions-index:items-center">
				<div className="relative w-full @lg/promotions-index:max-w-sm @lg/promotions-index:flex-1">
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
							{ value: "AUTOMATIC", label: "Automáticas" },
							{ value: "COUPON_REQUIRED", label: "Con cupón" },
						] as const
					}
				>
					<SelectTrigger className="w-full @lg/promotions-index:w-52">
						<SelectValue placeholder="Todas las activaciones" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">Todas las activaciones</SelectItem>
						<SelectItem value="AUTOMATIC">Automáticas</SelectItem>
						<SelectItem value="COUPON_REQUIRED">Con cupón</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div>
				{query.isError ? (
					<p className="py-10 text-center text-sm text-destructive">
						No se pudieron cargar las promociones.
					</p>
				) : !query.isLoading && query.data?.length === 0 ? (
					<p className="py-10 text-center text-sm text-muted-foreground">
						No se encontraron promociones.
					</p>
				) : (
					<PromotionsList
						promotions={query.data ?? []}
						onEdit={handleEdit}
						isLoading={query.isLoading}
					/>
				)}
			</div>
		</div>
	);
}
