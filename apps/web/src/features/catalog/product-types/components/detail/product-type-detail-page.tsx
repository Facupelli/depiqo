import type { ProductTypeResponse } from "@repo/schemas";
import { RentalItemKind } from "@repo/types";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useBlocker } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import z from "zod";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddPricingTierDialogForm } from "@/features/catalog/pricing-tier/components/pricing-tier-dialog-form";
import { useSetPricingTiers } from "@/features/catalog/pricing-tier/pricing-tier.queries";
import {
	type PricingTierFormValues,
	toAddPricingTiersDto,
} from "@/features/catalog/pricing-tier/schemas/pricing-tier-form.schema";
import { AccessoriesTab } from "@/features/catalog/product-types/components/detail/accessories-tab";
import { AssetsTab } from "@/features/catalog/product-types/components/detail/assets-tab";
import { PricingTab } from "@/features/catalog/product-types/components/detail/pricing-tab";
import {
	ProductProvider,
	useProduct,
} from "@/features/catalog/product-types/components/detail/product-detail.context";
import { SpecificationsTab } from "@/features/catalog/product-types/components/detail/specifications-tab";
import { formatTrackingType } from "@/features/catalog/product-types/components/products-columns";
import { RetireProductTypeAlertDialog } from "@/features/catalog/product-types/components/retire-product-type-alert-dialog";
import { usePublishProductType } from "@/features/catalog/product-types/product.mutations";
import { productKeys } from "@/features/catalog/product-types/products.queries";
import { ProblemDetailsError } from "@/shared/errors";

export const productTypeDetailSearchSchema = z.object({
	assetsView: z.enum(["list", "timeline"]).default("list"),
	timelinePreset: z.enum(["day", "week", "2weeks"]).default("week"),
	timelineFrom: z.iso.datetime().optional(),
	timelineTo: z.iso.datetime().optional(),
	showInactive: z.boolean().default(false),
});

export type ProductTypeDetailSearch = z.infer<
	typeof productTypeDetailSearchSchema
>;

interface ProductTypeDetailPageProps {
	productId: string;
	product: ProductTypeResponse | null | undefined;
	search: ProductTypeDetailSearch;
	variant: "products" | "accessories";
	copy: ProductTypeDetailCopy;
	onSearchChange: (updates: Partial<ProductTypeDetailSearch>) => void;
}

interface ProductTypeDetailCopy {
	parentLabel: string;
	parentTo: "/dashboard/catalog/products" | "/dashboard/catalog/accessories";
	notFoundMessage: string;
	physicalItemsTabLabel: string;
	editLabel: string;
}

export function ProductTypeDetailPage({
	productId,
	product,
	search,
	variant,
	copy,
	onSearchChange,
}: ProductTypeDetailPageProps) {
	const queryClient = useQueryClient();
	const { mutateAsync: setPricingTiers } = useSetPricingTiers();

	const [pendingTiers, setPendingTiers] = useState<PricingTierFormValues[]>([]);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [hasUnsavedAccessoryLinks, setHasUnsavedAccessoryLinks] =
		useState(false);
	const [activeTab, setActiveTab] = useState("physical-items");

	const hasUnsavedPricingTiers = pendingTiers.length > 0;
	const hasUnsavedChanges = hasUnsavedPricingTiers || hasUnsavedAccessoryLinks;

	const { proceed, reset, status } = useBlocker({
		blockerFn: () => hasUnsavedChanges,
	});

	useEffect(() => {
		if (!hasUnsavedChanges) {
			return;
		}

		function handleBeforeUnload(e: BeforeUnloadEvent) {
			e.preventDefault();
		}

		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [hasUnsavedChanges]);

	function handleAddTier(tier: PricingTierFormValues) {
		setPendingTiers((prev) => [...prev, tier]);
	}

	function handleAssetsViewChange(value: "list" | "timeline") {
		onSearchChange({ assetsView: value });
	}

	function handleTimelineSearchChange(
		updates: Partial<{
			timelinePreset: "day" | "week" | "2weeks";
			timelineFrom: string | undefined;
			timelineTo: string | undefined;
			showInactive: boolean;
		}>,
	) {
		onSearchChange(updates);
	}

	async function handleSaveChanges() {
		if (!hasUnsavedChanges || !product) {
			return;
		}

		setIsSaving(true);

		try {
			const pricingTiersDto = toAddPricingTiersDto(pendingTiers);
			await setPricingTiers({
				targetType: "PRODUCT_TYPE",
				targetId: product.id,
				tiers: pricingTiersDto.tiers,
			});
			setPendingTiers([]);
			await queryClient.invalidateQueries({
				queryKey: productKeys.detail(productId),
			});
		} catch (error) {
			console.log({ error });
		} finally {
			setIsSaving(false);
		}
	}

	if (!product) {
		return (
			<div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
				{copy.notFoundMessage}
			</div>
		);
	}

	const isPrimaryProduct = product.kind === RentalItemKind.PRIMARY;

	return (
		<>
			<ProductProvider product={product}>
				<div className="pb-10 px-8">
					<PageBreadcrumb
						parent={{ label: copy.parentLabel, to: copy.parentTo }}
						current={product.name}
					/>

					<div className="space-y-8">
						<ProductHeader variant={variant} editLabel={copy.editLabel} />

						<Tabs
							value={activeTab}
							onValueChange={setActiveTab}
							className="flex flex-col gap-y-10"
						>
							<TabsList>
								<TabsTrigger value="physical-items">
									{copy.physicalItemsTabLabel}
								</TabsTrigger>
								{isPrimaryProduct && (
									<TabsTrigger value="accessories">Accesorios</TabsTrigger>
								)}
								<TabsTrigger value="specifications">
									Especificaciones
								</TabsTrigger>
								{isPrimaryProduct && (
									<TabsTrigger value="pricing">Precios</TabsTrigger>
								)}
							</TabsList>

							<TabsContent value="specifications">
								<SpecificationsTab />
							</TabsContent>

							{isPrimaryProduct && (
								<TabsContent value="pricing">
									<div className="flex items-center justify-between pb-4">
										<Button size="sm" onClick={() => setDialogOpen(true)}>
											<Plus className="mr-1.5 size-3.5" />
											Agregar tarifa
										</Button>

										{hasUnsavedPricingTiers && (
											<Button onClick={handleSaveChanges} disabled={isSaving}>
												{isSaving ? "Guardando..." : "Guardar cambios"}
											</Button>
										)}
									</div>
									<PricingTab pendingTiers={pendingTiers} />
								</TabsContent>
							)}

							{isPrimaryProduct && (
								<TabsContent value="accessories">
									<AccessoriesTab
										key={product.id}
										isActive={activeTab === "accessories"}
										onDirtyChange={setHasUnsavedAccessoryLinks}
									/>
								</TabsContent>
							)}

							<TabsContent value="physical-items">
								<AssetsTab
									assetsView={search.assetsView}
									onAssetsViewChange={handleAssetsViewChange}
									timelineSearch={{
										timelinePreset: search.timelinePreset,
										timelineFrom: search.timelineFrom,
										timelineTo: search.timelineTo,
										showInactive: search.showInactive,
									}}
									onTimelineSearchChange={handleTimelineSearchChange}
								/>
							</TabsContent>
						</Tabs>
					</div>
				</div>

				{isPrimaryProduct && (
					<AddPricingTierDialogForm
						open={dialogOpen}
						onOpenChange={setDialogOpen}
						billingUnitLabel={product.billingUnit.label}
						onAdd={handleAddTier}
					/>
				)}
			</ProductProvider>

			<AlertDialog open={status === "blocked"}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Cambios sin guardar</AlertDialogTitle>
						<AlertDialogDescription>
							Tienes cambios sin guardar. Si sales ahora, perderas los cambios.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={reset}>Quedarse</AlertDialogCancel>
						<AlertDialogAction onClick={proceed}>Salir igual</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

function ProductHeader({
	variant,
	editLabel,
}: {
	variant: "products" | "accessories";
	editLabel: string;
}) {
	const [serverError, setServerError] = useState<string | null>(null);
	const { product } = useProduct();
	const productImageBaseUrl =
		(
			import.meta as ImportMeta & {
				env?: { VITE_R2_PUBLIC_URL?: string };
			}
		).env?.VITE_R2_PUBLIC_URL ?? "";

	const isPublished = product.publishedAt !== null;
	const isRetired = product.retiredAt !== null;
	const canManageLifecycle = variant === "products";

	const { mutateAsync: publish, isPending: isPublishing } =
		usePublishProductType();

	const handlePublish = async (productId: string) => {
		setServerError(null);

		try {
			await publish({ productTypeId: productId });
		} catch (error) {
			if (error instanceof ProblemDetailsError) {
				setServerError(error.problemDetails.detail);
			}
		}
	};

	return (
		<div className="flex items-start justify-between gap-8">
			<div>
				<div className="flex items-center gap-2 text-sm text-muted-foreground pb-2">
					{product.category && (
						<>
							<span>{product.category.name}</span>
							<span>·</span>
						</>
					)}
					<Badge variant="outline">
						{formatTrackingType(product.trackingMode)}
					</Badge>
				</div>
				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<h1 className="text-2xl font-bold tracking-tight">
							{product.name}
						</h1>
						<LifecycleBadge
							variant={variant}
							isPublished={isPublished}
							isRetired={isRetired}
						/>
					</div>

					{product.description && (
						<p className="text-sm text-muted-foreground max-w-prose">
							{product.description}
						</p>
					)}
				</div>

				<div className="flex items-center gap-4 pt-6">
					{!isRetired && variant === "products" && (
						<Button
							variant="outline"
							nativeButton={false}
							render={
								<Link
									to="/dashboard/catalog/products/$productId/edit"
									params={{ productId: product.id }}
								>
									{editLabel}
								</Link>
							}
						/>
					)}

					{!isRetired && variant === "accessories" && (
						<Button
							variant="outline"
							nativeButton={false}
							render={
								<Link
									to="/dashboard/catalog/accessories/$accessoryId/edit"
									params={{ accessoryId: product.id }}
								>
									{editLabel}
								</Link>
							}
						/>
					)}

					{canManageLifecycle && !isPublished && !isRetired && (
						<Button
							onClick={() => handlePublish(product.id)}
							disabled={isPublishing}
						>
							{isPublishing ? "Publicando..." : "Publicar"}
						</Button>
					)}

					{canManageLifecycle && isPublished && !isRetired && (
						<RetireProductTypeAlertDialog product={product} />
					)}
				</div>

				{serverError && (
					<p className="pt-2 text-sm text-destructive">{serverError}</p>
				)}
			</div>

			{product.imageUrl ? (
				<img
					src={`${productImageBaseUrl}/${product.imageUrl}`}
					alt={product.name}
					width={320}
					height={240}
					loading="lazy"
					decoding="async"
					className="rounded-lg object-contain shrink-0 w-[320px] h-60"
				/>
			) : (
				<div className="w-[320px] h-60 rounded-lg bg-muted shrink-0 flex items-center justify-center">
					<span className="text-sm text-muted-foreground">Sin imagen</span>
				</div>
			)}
		</div>
	);
}

function LifecycleBadge({
	variant,
	isPublished,
	isRetired,
}: {
	variant: "products" | "accessories";
	isPublished: boolean;
	isRetired: boolean;
}) {
	if (isRetired) {
		return <Badge variant="destructive">Retirado</Badge>;
	}
	if (variant === "accessories") {
		return <Badge variant="secondary">Activo</Badge>;
	}
	if (isPublished) {
		return <Badge variant="default">Publicado</Badge>;
	}
	return <Badge variant="secondary">Borrador</Badge>;
}
