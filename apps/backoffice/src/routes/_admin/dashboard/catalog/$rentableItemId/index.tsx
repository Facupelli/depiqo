import type { GetRentableItemDetailResponseDto } from "@repo/api-contracts";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, CheckCircle2, PackageOpen, Pencil } from "lucide-react";
import { useState } from "react";
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
	AlertDialogTrigger,
} from "@repo/ui/components/alert-dialog";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { CreateRentalOfferWithPricingDialog } from "@/features/admin/offering-setup/create-rental-offer-with-pricing/create-rental-offer-with-pricing-dialog";
import { getActivateRentableItemErrorMessage } from "@/features/catalog/rentable-items/activate-rentable-item/activate-rentable-item.errors";
import { useActivateRentableItem } from "@/features/catalog/rentable-items/activate-rentable-item/activate-rentable-item.mutation";
import {
	type RatePlanOption,
	RentableItemBranchOffersSection,
	RentableItemOfferStatusSummary,
} from "@/features/catalog/rentable-items/get-rentable-item-detail/components/rentable-item-offers-section";
import { RentableItemOverview } from "@/features/catalog/rentable-items/get-rentable-item-detail/components/rentable-item-overview";
import { RentableItemRequiredEquipmentSection } from "@/features/catalog/rentable-items/get-rentable-item-detail/components/rentable-item-required-equipment-section";
import {
	getOfferMetrics,
	getStartingPrice,
} from "@/features/catalog/rentable-items/get-rentable-item-detail/rentable-item-detail.utils";
import { rentableItemQueries } from "@/features/catalog/rentable-items/rentable-items.queries";
import { useRatePlans } from "@/features/pricing/rate-plans/rate-plans.queries";
import { buildR2PublicUrl } from "@/lib/r2-public-url";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute(
	"/_admin/dashboard/catalog/$rentableItemId/",
)({
	loader: ({ context: { queryClient }, params: { rentableItemId } }) =>
		queryClient.ensureQueryData(rentableItemQueries.detail(rentableItemId)),
	errorComponent: ({ error }) => (
		<AdminRouteError
			error={error}
			genericMessage="No pudimos cargar el detalle del ítem."
			forbiddenMessage="No tienes permisos para ver este ítem."
		/>
	),
	component: RouteComponent,
});

function RouteComponent() {
	const { rentableItemId } = Route.useParams();
	const { data: item } = useSuspenseQuery(
		rentableItemQueries.detail(rentableItemId),
	);
	const { data: ratePlans = [] } = useRatePlans({ isActive: true });
	const ratePlanOptions = ratePlans
		.filter((plan) => plan.tierCount > 0)
		.map((plan) => ({ id: plan.id, name: plan.name }));

	return (
		<RentableItemDetailPage item={item} ratePlanOptions={ratePlanOptions} />
	);
}

const statusPresentation = {
	DRAFT: {
		label: "Borrador",
		description: "Los clientes no pueden verlo ni solicitarlo.",
		variant: "secondary",
		className: "",
	},
	ACTIVE: {
		label: "Activo",
		description: "Los clientes pueden verlo y solicitarlo.",
		variant: "default",
		className: "bg-emerald-600 text-white",
	},
	ARCHIVED: {
		label: "Archivado",
		description: "Los clientes no pueden verlo ni solicitarlo.",
		variant: "outline",
		className: "",
	},
} satisfies Record<
	GetRentableItemDetailResponseDto["status"],
	{
		label: string;
		description: string;
		variant: "default" | "secondary" | "outline";
		className: string;
	}
>;

function RentableItemDetailPage({
	item,
	ratePlanOptions,
}: {
	item: GetRentableItemDetailResponseDto;
	ratePlanOptions: RatePlanOption[];
}) {
	const imageUrl = buildR2PublicUrl(item.imageUrl, "catalog");
	const metrics = getOfferMetrics(item.offers);
	const startingPrice = getStartingPrice(item);
	return (
		<div className="px-6 pb-8">
			<PageBreadcrumb
				parent={{ label: "Catálogo", to: "/dashboard/catalog" }}
				current={`Ítem rentable / ${item.name}`}
			/>
			<div className="space-y-5">
				<header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
					<div className="min-w-0 space-y-2">
						<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
							<h1 className="truncate text-4xl font-semibold tracking-tight">
								{item.name}
							</h1>
							<RentableItemStatus status={item.status} />
						</div>
					</div>
					<div className="flex shrink-0 flex-wrap items-center gap-2">
						{item.status === "DRAFT" ? (
							<ActivateRentableItemAction item={item} />
						) : null}
						<Button size="lg" onClick={() => undefined}>
							<Pencil className="mr-2 size-4" />
							Editar ítem
						</Button>
					</div>
				</header>
				<RentableItemOverview
					item={item}
					imageUrl={imageUrl}
					startingPrice={startingPrice}
					readyOfferCount={metrics.ready}
				/>
				<RentableItemOfferStatusSummary
					metrics={metrics}
					action={
						<CreateRentalOfferWithPricingDialog
							item={item}
							ratePlanOptions={ratePlanOptions}
						/>
					}
				/>
				<Tabs defaultValue="branches" className="flex flex-col gap-y-4">
					<TabsList
						variant="line"
						className="h-auto justify-start rounded-none border-b bg-transparent p-0"
					>
						<TabsTrigger
							value="branches"
							className="gap-2 rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-medium text-muted-foreground shadow-none transition-none focus-visible:ring-0 [&::after]:hidden data-active:border-b-primary data-active:bg-transparent data-active:font-semibold data-active:text-primary data-active:shadow-none"
						>
							<Building2 className="size-4" />
							Ofertas por sucursal
						</TabsTrigger>
						<TabsTrigger
							value="equipment"
							className="gap-2 rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-medium text-muted-foreground shadow-none transition-none focus-visible:ring-0 [&::after]:hidden data-active:border-b-primary data-active:bg-transparent data-active:font-semibold data-active:text-primary data-active:shadow-none"
						>
							<PackageOpen className="size-4" />
							Equipo
						</TabsTrigger>
					</TabsList>
					<TabsContent value="branches" className="mt-0">
						<RentableItemBranchOffersSection
							item={item}
							ratePlanOptions={ratePlanOptions}
						/>
					</TabsContent>
					<TabsContent value="equipment" className="mt-0">
						<RentableItemRequiredEquipmentSection item={item} />
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}

function ActivateRentableItemAction({
	item,
}: {
	item: GetRentableItemDetailResponseDto;
}) {
	const [open, setOpen] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const activateMutation = useActivateRentableItem();
	async function handleActivate() {
		setErrorMessage(null);
		try {
			await activateMutation.mutateAsync({ rentableItemId: item.id });
			setOpen(false);
		} catch (error) {
			setErrorMessage(getActivateRentableItemErrorMessage(error, item));
		}
	}
	return (
		<AlertDialog
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (!nextOpen) setErrorMessage(null);
			}}
		>
			<AlertDialogTrigger
				render={
					<Button
						type="button"
						variant="outline"
						size="lg"
						disabled={activateMutation.isPending}
					>
						<CheckCircle2 className="mr-2 size-4" />
						{activateMutation.isPending ? "Activando..." : "Activar"}
					</Button>
				}
			/>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Activar ítem rentable</AlertDialogTitle>
					<AlertDialogDescription>
						Al activar este ítem, aparecerá en el catálogo de tu tienda para que
						tus clientes puedan verlo y solicitarlo.
					</AlertDialogDescription>
				</AlertDialogHeader>
				{errorMessage ? (
					<p className="text-sm text-destructive">{errorMessage}</p>
				) : null}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={activateMutation.isPending}>
						Cancelar
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleActivate}
						disabled={activateMutation.isPending}
					>
						{activateMutation.isPending ? "Activando..." : "Activar ítem"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

function RentableItemStatus({
	status,
}: {
	status: GetRentableItemDetailResponseDto["status"];
}) {
	const presentation = statusPresentation[status];
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Badge variant={presentation.variant} className={presentation.className}>
				{presentation.label}
			</Badge>
			<p className="text-sm text-muted-foreground">
				{presentation.description}
			</p>
		</div>
	);
}
