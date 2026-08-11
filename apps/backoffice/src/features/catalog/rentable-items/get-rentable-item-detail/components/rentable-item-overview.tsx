import type { GetRentableItemDetailResponseDto } from "@repo/api-contracts";
import { Card, CardContent } from "@repo/ui/components/card";
import {
	Building2,
	CheckCircle2,
	CircleDollarSign,
	type LucideIcon,
	PackageOpen,
	Pencil,
	Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getKindLabel } from "../rentable-item-detail.utils";

interface RentableItemOverviewProps {
	item: GetRentableItemDetailResponseDto;
	imageUrl: string | null;
	startingPrice: string | null;
	readyOfferCount: number;
}

export function RentableItemOverview({
	item,
	imageUrl,
	startingPrice,
	readyOfferCount,
}: RentableItemOverviewProps) {
	return (
		<Card className="overflow-hidden rounded-2xl py-0 shadow-sm">
			<CardContent className="grid p-0 lg:grid-cols-[300px_minmax(0,1fr)]">
				<div className="flex min-h-56 items-center justify-center border-b bg-muted/20 p-6 lg:min-h-72 lg:border-r lg:border-b-0">
					{imageUrl ? (
						<img
							src={imageUrl}
							alt={item.name}
							className="max-h-48 max-w-55 object-contain"
						/>
					) : (
						<PackageOpen className="size-12 text-muted-foreground" />
					)}
				</div>

				<div className="grid divide-y lg:grid-cols-2 lg:divide-x lg:divide-y-0">
					<div className="flex flex-col justify-center divide-y py-5">
						<OverviewFact
							icon={PackageOpen}
							label="Tipo"
							value={getKindLabel(item.kind)}
						/>
						<OverviewFact
							icon={Tag}
							label="Categoría"
							value={item.categoryName ?? "Sin categoría"}
						/>
						<OverviewFact
							icon={Pencil}
							label="Descripción"
							value={item.description ?? "Sin descripción"}
							multiline
						/>
					</div>

					<div className="flex flex-col justify-center divide-y py-5">
						<OverviewFact
							icon={Building2}
							label="Disponible en"
							value={`${item.offers.length} ${item.offers.length === 1 ? "sucursal" : "sucursales"}`}
						/>
						<OverviewFact
							icon={CheckCircle2}
							label="Ofertas listas"
							value={`${readyOfferCount} de ${item.offers.length}`}
						/>
						<OverviewFact
							icon={CircleDollarSign}
							label="Precio desde"
							value={startingPrice ?? "Sin precio configurado"}
						/>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function OverviewFact({
	icon: Icon,
	label,
	value,
	multiline = false,
}: {
	icon: LucideIcon;
	label: string;
	value: string;
	multiline?: boolean;
}) {
	return (
		<div
			className={cn(
				"grid min-h-20 grid-cols-[20px_minmax(0,1fr)] gap-x-2 gap-y-1 px-4 py-4 sm:grid-cols-[24px_160px_minmax(0,1fr)] lg:px-6",
				multiline ? "items-start" : "items-center",
			)}
		>
			<Icon
				className={cn(
					"size-5 shrink-0 text-muted-foreground",
					multiline && "mt-0.5",
				)}
			/>
			<span className="font-medium text-foreground">{label}</span>
			<span className="col-start-2 text-muted-foreground sm:col-start-3">
				{value}
			</span>
		</div>
	);
}
