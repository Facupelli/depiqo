import type { BundleItemResponse, TenantPricingConfig } from "@repo/schemas";
import { CheckCircle, Trash2, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { groupBundleComponents } from "@/features/catalog/bundles/bundles.utils";
import { formatCurrency } from "@/shared/utils/price.utils";

interface BundleDetailDialogProps {
	bundle: BundleItemResponse;
	priceConfig: TenantPricingConfig;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	isInCart: boolean;
	isUnavailable: boolean;
	onAdd: () => void;
	onRemove: () => void;
	imageBaseUrl: string | null;
}

export function BundleDetailDialog({
	bundle,
	priceConfig,
	isOpen,
	onOpenChange,
	isInCart,
	isUnavailable,
	onAdd,
	onRemove,
	imageBaseUrl,
}: BundleDetailDialogProps) {
	const price = bundle.pricingPreview;

	const bundleComponents = bundle.components.map((component) => ({
		...component.productType,
		productTypeId: component.productType.id,
		quantity: component.quantity,
	}));
	const grouped = groupBundleComponents(bundleComponents);

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			{/*
        On mobile: single column, full screen height, entire dialog scrolls.
        On desktop: two columns, max 70vh, only the right panel scrolls.
      */}
			<DialogContent className="overflow-hidden p-0 sm:max-w-5xl max-h-[95vh] sm:max-h-[85vh] flex flex-col">
				<div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] min-h-0 flex-1">
					{/* Image panel — compact banner on mobile, sticky side on desktop */}
					<div className="lg:sticky lg:top-0 lg:self-start lg:h-full lg:max-h-[85vh] shrink-0">
						<div className="relative flex items-center justify-center border-b lg:border-b-0 lg:border-r lg:h-full p-4 lg:p-6 bg-muted/10">
							{imageBaseUrl ? (
								<img
									src={imageBaseUrl}
									alt={bundle.name}
									className="w-full object-contain max-h-40 lg:max-h-[55vh]"
								/>
							) : (
								<div className="flex w-full items-center justify-center min-h-32 lg:min-h-72 bg-muted rounded-md">
									<span className="text-sm text-muted-foreground">
										No image
									</span>
								</div>
							)}
							{isInCart && (
								<div className="absolute bottom-3 left-3">
									<Badge className="rounded-xs bg-black px-2 py-1 text-[10px] uppercase tracking-widest text-white hover:bg-black">
										Agregado
									</Badge>
								</div>
							)}
						</div>
					</div>

					{/* Content panel — scrolls independently on desktop, flows naturally on mobile */}
					<div className="flex flex-col gap-4 p-5 lg:p-6 overflow-y-auto">
						<DialogHeader className="gap-2">
							<div className="space-y-1">
								<p className="text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
									Detalle del combo
								</p>
								<DialogTitle className="text-2xl font-semibold leading-tight">
									{bundle.name}
								</DialogTitle>
							</div>
							{bundle.description && (
								<DialogDescription className="text-sm leading-6 text-muted-foreground">
									{bundle.description}
								</DialogDescription>
							)}
						</DialogHeader>

						<div className="grid gap-2 sm:grid-cols-2">
							<div className="rounded-lg border bg-muted/20 p-3">
								<p className="text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
									Precio por {bundle.billingUnit.label.toLowerCase()}
								</p>
								<p className="mt-2 text-2xl font-semibold leading-none">
									{price
										? formatCurrency(
												price.pricePerUnit,
												priceConfig.currency,
												priceConfig.locale,
											)
										: "Contactanos"}
								</p>
							</div>
							<div className="rounded-lg border bg-muted/20 p-3">
								<p className="text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
									Componentes
								</p>
								<p className="mt-2 text-2xl font-semibold leading-none">
									{bundle.components.length}
								</p>
							</div>
						</div>

						{/* Components grouped by category */}
						<div className="rounded-lg border bg-muted/10 p-3 space-y-4">
							<p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
								Que incluye
							</p>

							{grouped.categorized.map((group) => (
								<div key={group.categoryName} className="space-y-2">
									<p className="text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
										{group.categoryName}
									</p>
									{group.components.map((component) => (
										<BundleComponentItem
											key={component.id}
											bundleId={bundle.id}
											component={component}
										/>
									))}
								</div>
							))}

							{grouped.uncategorized.length > 0 && (
								<div className="space-y-2">
									{grouped.categorized.length > 0 && (
										<p className="text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
											Otros
										</p>
									)}
									{grouped.uncategorized.map((component) => (
										<BundleComponentItem
											key={component.id}
											bundleId={bundle.id}
											component={component}
										/>
									))}
								</div>
							)}
						</div>

						<DialogFooter className="border-t pt-4 sm:justify-between">
							{isInCart ? (
								<div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
									<Button variant="outline" disabled>
										<CheckCircle className="mr-2 h-4 w-4" />
										Reservado
									</Button>
									<Button variant="outline" onClick={onRemove}>
										<Trash2 className="mr-2 h-4 w-4" />
										Quitar del pedido
									</Button>
								</div>
							) : (
								<Button
									className="w-full sm:w-auto"
									onClick={onAdd}
									disabled={isUnavailable}
								>
									<Zap className="mr-2 h-4 w-4" />
									{isUnavailable
										? "No disponible para este periodo"
										: "Reservar Combo"}
								</Button>
							)}
						</DialogFooter>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function BundleComponentItem({
	bundleId,
	component,
}: {
	bundleId: string;
	component: {
		productTypeId: string;
		quantity: number;
		id: string;
		name: string;
		description: string | null;
		includedItems: {
			name: string;
			quantity: number;
			notes: string | null;
		}[];
		imageUrl: string | null;
		category: {
			id: string;
			name: string;
		} | null;
	};
}) {
	return (
		<div
			key={`${bundleId}-dialog-${component.id}`}
			className="rounded-md border bg-background p-3"
		>
			<div className="flex items-start justify-between gap-4">
				<div>
					<p className="text-sm font-semibold text-foreground">
						{component.quantity}x {component.name}
					</p>
					{component.description && (
						<p className="mt-1 text-sm leading-6 text-muted-foreground">
							{component.description}
						</p>
					)}
				</div>
				<Badge
					variant="secondary"
					className="shrink-0 rounded-xs text-[10px] uppercase tracking-widest"
				>
					Qty {component.quantity}
				</Badge>
			</div>
			{component.includedItems.length > 0 && (
				<div className="mt-4 rounded-md border bg-muted/30 px-3 py-3">
					<p className="mb-2 text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
						Incluye tambien
					</p>
					<div className="flex flex-wrap gap-x-5 gap-y-2">
						{component.includedItems.map((item, index) => (
							<div
								key={`${component.id}-${item.name}-${index}`}
								className="flex items-start gap-2"
							>
								<CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
								<div className="text-xs text-muted-foreground">
									<p>
										{item.name}
										{item.quantity > 1 && (
											<span className="ml-1">x{item.quantity}</span>
										)}
									</p>
									{item.notes && <p className="mt-0.5">{item.notes}</p>}
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
