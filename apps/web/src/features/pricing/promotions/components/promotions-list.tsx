import type { GetPromotionsPromotionDto } from "@repo/api-contracts";
import {
	CalendarDays,
	Layers,
	MoreHorizontal,
	Pencil,
	ShoppingCart,
	Tag,
	Trash2,
	Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PromotionsListProps {
	promotions: GetPromotionsPromotionDto[];
	onEdit: (promotion: GetPromotionsPromotionDto) => void;
	onDelete: (promotion: GetPromotionsPromotionDto) => void;
}

const ACTIVATION_LABELS: Record<
	GetPromotionsPromotionDto["activation"],
	string
> = {
	AUTOMATIC: "Automática",
	COUPON_REQUIRED: "Con cupón",
};

const TARGET_LABELS: Record<GetPromotionsPromotionDto["target"], string> = {
	ORDER: "Toda la orden",
	ELIGIBLE_LINES: "Líneas elegibles",
};

export function PromotionsList({
	promotions,
	onDelete,
	onEdit,
}: PromotionsListProps) {
	return (
		<div className="space-y-4">
			{promotions.map((promotion) => (
				<PromotionCard
					key={promotion.id}
					promotion={promotion}
					onEdit={() => onEdit(promotion)}
					onDelete={() => onDelete(promotion)}
				/>
			))}
		</div>
	);
}

function PromotionCard({
	promotion,
	onDelete,
	onEdit,
}: {
	promotion: GetPromotionsPromotionDto;
	onDelete: () => void;
	onEdit: () => void;
}) {
	return (
		<Card className="px-0 py-0">
			<CardContent className="relative p-6">
				<div className="grid gap-6 pr-12 md:grid-cols-[1.1fr_1.7fr_auto_auto] md:items-start md:pr-0">
					<div className="space-y-4">
						<div>
							<h3 className="text-base font-semibold text-foreground">
								{promotion.name}
							</h3>

							<div className="mt-1 flex items-center gap-1.5 text-muted-foreground text-sm">
								<CalendarDays className="h-3.5 w-3.5" />
								<span>{formatValidity(promotion)}</span>
							</div>
						</div>

						<div className="flex flex-wrap gap-2">
							<Badge variant="outline" className="gap-1.5">
								{promotion.activation === "AUTOMATIC" ? (
									<Zap className="h-3.5 w-3.5" />
								) : (
									<Tag className="h-3.5 w-3.5" />
								)}
								{ACTIVATION_LABELS[promotion.activation]}
							</Badge>

							<Badge variant="outline" className="gap-1.5">
								<ShoppingCart className="h-3.5 w-3.5" />
								{TARGET_LABELS[promotion.target]}
							</Badge>
						</div>
					</div>

					<div className="space-y-3">
						<p className="text-muted-foreground text-sm leading-relaxed md:text-base">
							{buildRowSummary(promotion)}
						</p>

						<div className="space-y-1 text-muted-foreground text-sm">
							<p className="flex items-center gap-1.5">
								<Layers className="h-3.5 w-3.5" />
								<span>{formatScopes(promotion.scopes)}</span>
							</p>

							{isMixedScope(promotion.scopes) && (
								<p className="pl-5 text-xs">
									{formatScopeDetail(promotion.scopes)}
								</p>
							)}

							{promotion.exclusions.length > 0 && (
								<p className="pl-5 text-xs">
									{promotion.exclusions.length}{" "}
									{promotion.exclusions.length === 1
										? "exclusión"
										: "exclusiones"}
								</p>
							)}
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4 md:min-w-24 md:grid-cols-1 md:text-right">
						<MetaItem label="Prioridad" value={promotion.priority} />

						<MetaItem
							label="Acumulable"
							value={
								<Badge variant={promotion.stackable ? "secondary" : "outline"}>
									{promotion.stackable ? "Sí" : "No"}
								</Badge>
							}
						/>

						<MetaItem
							label="Estado"
							value={
								<Badge variant={promotion.isActive ? "default" : "secondary"}>
									{promotion.isActive ? "Activa" : "Inactiva"}
								</Badge>
							}
						/>
					</div>

					<div className="absolute right-4 top-4 md:static md:flex md:justify-end">
						<RowActions onEdit={onEdit} onDelete={onDelete} />
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function MetaItem({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="space-y-1">
			<p className="text-muted-foreground text-xs">{label}</p>
			<div className="font-medium text-sm tabular-nums">{value}</div>
		</div>
	);
}

function RowActions({
	onDelete,
	onEdit,
}: {
	onDelete: () => void;
	onEdit: () => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						aria-label="Abrir acciones de la promoción"
					>
						<MoreHorizontal className="h-4 w-4" />
					</Button>
				}
			/>

			<DropdownMenuContent align="end" className="w-40">
				<DropdownMenuItem onClick={onEdit}>
					<Pencil className="h-4 w-4" />
					Editar
				</DropdownMenuItem>

				<DropdownMenuItem variant="destructive" onClick={onDelete}>
					<Trash2 className="h-4 w-4" />
					Eliminar
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function formatValidity(promotion: GetPromotionsPromotionDto) {
	if (!promotion.validFrom && !promotion.validUntil) {
		return "Vigencia indefinida";
	}

	const from = promotion.validFrom
		? new Date(promotion.validFrom).toLocaleDateString("es-ES")
		: "Siempre";

	const until = promotion.validUntil
		? new Date(promotion.validUntil).toLocaleDateString("es-ES")
		: "Sin fin";

	return `${from} - ${until}`;
}

function formatDecimal(value: string): string {
	const num = Number.parseFloat(value);
	if (Number.isNaN(num)) return value;
	if (num === Math.floor(num)) return num.toString();

	return num.toLocaleString("es-ES", {
		minimumFractionDigits: 1,
		maximumFractionDigits: 2,
	});
}

function formatCurrency(value: string): string {
	const num = Number.parseFloat(value);
	if (Number.isNaN(num)) return `$${value}`;

	return `$${num.toLocaleString("es-ES")}`;
}

function buildConditionsText(promotion: GetPromotionsPromotionDto): string {
	const parts: string[] = [];

	if (promotion.minRentalUnits && promotion.maxRentalUnits) {
		parts.push(
			`para alquileres de ${promotion.minRentalUnits} a ${promotion.maxRentalUnits} unidades facturadas`,
		);
	} else if (promotion.minRentalUnits) {
		parts.push(
			`para alquileres de ${promotion.minRentalUnits} unidades facturadas o más`,
		);
	} else if (promotion.maxRentalUnits) {
		parts.push(
			`para alquileres de hasta ${promotion.maxRentalUnits} unidades facturadas`,
		);
	}

	if (promotion.minOrderSubtotal) {
		parts.push(
			`cuando el subtotal sea de ${formatCurrency(promotion.minOrderSubtotal)} o más`,
		);
	}

	if (parts.length === 0) return "";

	return parts.join(" ");
}

function buildRowSummary(promotion: GetPromotionsPromotionDto): string {
	const isPercentage = promotion.effectType === "PERCENTAGE_OFF";
	const discountValue = formatDecimal(promotion.effectValue);

	const discount = isPercentage
		? `${discountValue}%`
		: formatCurrency(promotion.effectValue);

	const target =
		promotion.target === "ORDER"
			? "sobre toda la orden"
			: "sobre líneas elegibles";

	const conditions = buildConditionsText(promotion);
	const conditionPhrase = conditions ? ` ${conditions}` : "";
	const stackable = promotion.stackable ? " Acumulable." : " No acumulable.";

	return `${discount} de descuento ${target}${conditionPhrase}.${stackable}`;
}

type ScopeTypeCounts = Record<
	"CATEGORY" | "RENTABLE_ITEM" | "RENTAL_OFFER",
	number
>;

function countScopeTypes(
	scopes: GetPromotionsPromotionDto["scopes"],
): ScopeTypeCounts {
	const counts: ScopeTypeCounts = {
		CATEGORY: 0,
		RENTABLE_ITEM: 0,
		RENTAL_OFFER: 0,
	};

	for (const scope of scopes) {
		if (scope.type !== "ALL") counts[scope.type]++;
	}

	return counts;
}

function scopeCountsToParts(counts: ScopeTypeCounts): string[] {
	const parts: string[] = [];

	if (counts.CATEGORY > 0) {
		parts.push(
			`${counts.CATEGORY} ${
				counts.CATEGORY === 1 ? "categoría" : "categorías"
			}`,
		);
	}

	if (counts.RENTABLE_ITEM > 0) {
		parts.push(
			`${counts.RENTABLE_ITEM} ${
				counts.RENTABLE_ITEM === 1 ? "ítem rentable" : "ítems rentables"
			}`,
		);
	}

	if (counts.RENTAL_OFFER > 0) {
		parts.push(
			`${counts.RENTAL_OFFER} ${
				counts.RENTAL_OFFER === 1 ? "oferta" : "ofertas"
			}`,
		);
	}

	return parts;
}

function formatScopes(scopes: GetPromotionsPromotionDto["scopes"]): string {
	if (scopes.length === 0) return "Sin alcance";
	if (scopes.some((scope) => scope.type === "ALL")) return "Todos los ítems";

	const counts = countScopeTypes(scopes);
	const presentCount = Object.values(counts).filter(
		(count) => count > 0,
	).length;

	if (presentCount >= 3) return "Alcance mixto";

	return scopeCountsToParts(counts).join(" + ");
}

function isMixedScope(scopes: GetPromotionsPromotionDto["scopes"]): boolean {
	if (scopes.some((scope) => scope.type === "ALL")) return false;

	const types = new Set(scopes.map((scope) => scope.type));
	return types.size >= 3;
}

function formatScopeDetail(
	scopes: GetPromotionsPromotionDto["scopes"],
): string {
	const counts = countScopeTypes(scopes);
	return scopeCountsToParts(counts).join(", ");
}
