import type { GetRentableItemDetailResponseDto } from "@repo/api-contracts";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	Building2,
	CheckCircle2,
	CircleDollarSign,
	Eye,
	type LucideIcon,
	MoreHorizontal,
	PackageOpen,
	Pencil,
	Tag,
} from "lucide-react";
import type { ReactNode } from "react";
import { useId, useState } from "react";
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
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateRentalOfferWithPricingDialog } from "@/features/admin/offering-setup/create-rental-offer-with-pricing/create-rental-offer-with-pricing-dialog";
import { useActivateRentableItem } from "@/features/catalog/rentable-items/activate-rentable-item/activate-rentable-item.mutation";
import { rentableItemQueries } from "@/features/catalog/rentable-items/rentable-items.queries";
import { useAttachRatePlanToRentalOffer } from "@/features/pricing/rental-offer-pricings/attach-rate-plan-to-rental-offer/attach-rate-plan-to-rental-offer.mutation";
import { toAttachRatePlanToRentalOfferDto } from "@/features/pricing/rental-offer-pricings/attach-rate-plan-to-rental-offer/attach-rate-plan-to-rental-offer.schema";
import { AttachRatePlanToRentalOfferForm } from "@/features/pricing/rental-offer-pricings/attach-rate-plan-to-rental-offer/attach-rate-plan-to-rental-offer-form";
import { useCreateRatePlanAndAttachToRentalOffer } from "@/features/pricing/rental-offer-pricings/create-rate-plan-and-attach-to-rental-offer/create-rate-plan-and-attach-to-rental-offer.mutation";
import { toCreateRatePlanAndAttachToRentalOfferDto } from "@/features/pricing/rental-offer-pricings/create-rate-plan-and-attach-to-rental-offer/create-rate-plan-and-attach-to-rental-offer.schema";
import { CreateRatePlanAndAttachForm } from "@/features/pricing/rental-offer-pricings/create-rate-plan-and-attach-to-rental-offer/create-rate-plan-and-attach-to-rental-offer-form";
import { AdminRouteError } from "@/shared/components/admin-route-error";
import { ProblemDetailsError } from "@/shared/errors";

export const Route = createFileRoute(
	"/_admin/dashboard/catalog/$rentableItemId/",
)({
	loader: ({ context: { queryClient }, params: { rentableItemId } }) =>
		queryClient.ensureQueryData(rentableItemQueries.detail(rentableItemId)),
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar el detalle del ítem."
				forbiddenMessage="No tienes permisos para ver este ítem."
			/>
		);
	},
	component: RouteComponent,
});

interface RentableItemDetailPageProps {
	item: GetRentableItemDetailResponseDto;
}

const kindLabels = {
	SINGLE: "Individual",
	PACKAGE: "Paquete",
	KIT: "Kit",
} satisfies Partial<Record<GetRentableItemDetailResponseDto["kind"], string>>;

function getKindLabel(kind: GetRentableItemDetailResponseDto["kind"]): string {
	return kindLabels[kind as keyof typeof kindLabels] ?? kind;
}

const statusLabels: Record<GetRentableItemDetailResponseDto["status"], string> =
	{
		DRAFT: "Borrador",
		ACTIVE: "Activo",
		ARCHIVED: "Archivado",
	};

const billingUnitLabels: Record<"HOUR" | "DAY" | "WEEK", string> = {
	HOUR: "hora",
	DAY: "día",
	WEEK: "semana",
};

function RouteComponent() {
	const { rentableItemId } = Route.useParams();
	const { data: item } = useSuspenseQuery(
		rentableItemQueries.detail(rentableItemId),
	);

	const [activeTab, setActiveTab] = useState("equipment");

	const branchNames = item.offers
		.map((offer) => offer.branchName ?? offer.branchId)
		.join(", ");

	const visibleCount = item.offers.filter((offer) => offer.isVisible).length;
	const rentableCount = item.offers.filter((offer) => offer.isRentable).length;
	const pricingCount = item.offers.filter(
		(offer) => offer.activeRatePlan,
	).length;
	const startingPrice = getStartingPrice(item);

	return (
		<div className="px-6 pb-8">
			<PageBreadcrumb
				parent={{ label: "Catálogo", to: "/dashboard/catalog" }}
				current={`Ítem rentable / ${item.name}`}
			/>

			<div className="space-y-5">
				<header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
					<div className="min-w-0 space-y-3">
						<div className="flex flex-wrap items-center gap-3">
							<h1 className="truncate text-4xl font-semibold tracking-tight">
								{item.name}
							</h1>
							<RentableItemStatusBadge status={item.status} />
						</div>

						<div className="flex flex-wrap gap-2">
							<TopChip icon={PackageOpen} label={getKindLabel(item.kind)} />
							<TopChip
								icon={Tag}
								label={item.categoryName ?? "Sin categoría"}
							/>
							<TopChip
								icon={Building2}
								label={`${item.offers.length} sucursales`}
							/>
							<TopChip
								icon={CircleDollarSign}
								label={startingPrice ?? "Sin precio"}
							/>
						</div>
					</div>

					<div className="flex shrink-0 flex-wrap items-center gap-2">
						{item.status === "DRAFT" ? (
							<ActivateRentableItemAction rentableItemId={rentableItemId} />
						) : null}

						<Button size="lg" onClick={() => undefined}>
							<Pencil className="mr-2 size-4" />
							Editar ítem
						</Button>
					</div>
				</header>

				<Card className="overflow-hidden rounded-2xl shadow-sm py-4">
					<CardContent className="grid gap-6 lg:grid-cols-[460px_1fr] px-4">
						<div className="overflow-hidden rounded-md border bg-muted/30">
							{item.imageUrl ? (
								<img
									src={item.imageUrl}
									alt={item.name}
									className="aspect-4/3 h-full w-full object-cover"
								/>
							) : (
								<div className="flex aspect-4/3 w-full items-center justify-center text-muted-foreground">
									<PackageOpen className="size-12" />
								</div>
							)}
						</div>

						<div className="flex min-w-0 flex-col justify-between gap-4">
							<div className="space-y-3">
								{item.description ? (
									<p className="max-w-4xl text-base leading-7 text-foreground">
										{item.description}
									</p>
								) : null}

								<div className="grid divide-y border-t bg-background sm:grid-cols-2 sm:divide-x sm:divide-y-0">
									<div className="space-y-0">
										<Info
											label="Categoría"
											value={item.categoryName ?? "Sin categoría"}
										/>
										<Info label="Tipo" value={getKindLabel(item.kind)} />
									</div>

									<div className="space-y-0 pl-4">
										<Info
											label="Ofrecido en sucursales"
											value={branchNames || "Sin sucursales"}
										/>
										<Info
											label="Visibilidad"
											value={`${visibleCount}/${item.offers.length} visible`}
										/>
										<Info
											label="Rentabilidad"
											value={`${rentableCount}/${item.offers.length} rentable`}
										/>
										<Info
											label="Precio inicial"
											value={startingPrice ?? "Sin precio"}
										/>
									</div>
								</div>
							</div>

							<div className="grid gap-3 sm:grid-cols-3">
								<SummaryPill
									icon={Eye}
									label="Visibles"
									value={`${visibleCount}`}
								/>
								<SummaryPill
									icon={CheckCircle2}
									label="Rentables"
									value={`${rentableCount}`}
								/>
								<SummaryPill
									icon={CircleDollarSign}
									label="Con precios"
									value={`${pricingCount}`}
								/>
							</div>
						</div>
					</CardContent>
				</Card>

				<Tabs
					value={activeTab}
					onValueChange={setActiveTab}
					className="flex flex-col gap-y-4"
				>
					<TabsList
						variant="line"
						className="h-auto justify-start rounded-none border-b bg-transparent p-0"
					>
						<TabsTrigger
							value="equipment"
							className="gap-2 rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-medium text-muted-foreground shadow-none transition-none focus-visible:ring-0 [&::after]:hidden data-active:border-b-primary data-active:border-t-transparent data-active:border-l-transparent data-active:border-r-transparent data-active:bg-transparent data-active:font-semibold data-active:text-primary data-active:shadow-none"
						>
							<PackageOpen className="size-4" />
							Equipo
						</TabsTrigger>
						<TabsTrigger
							value="branches"
							className="gap-2 rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-medium text-muted-foreground shadow-none transition-none focus-visible:ring-0 [&::after]:hidden data-active:border-b-primary data-active:border-t-transparent data-active:border-l-transparent data-active:border-r-transparent data-active:bg-transparent data-active:font-semibold data-active:text-primary data-active:shadow-none"
						>
							<Building2 className="size-4" />
							Sucursales y disponibilidad
						</TabsTrigger>
						<TabsTrigger
							value="pricing"
							className="gap-2 rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-medium text-muted-foreground shadow-none transition-none focus-visible:ring-0 [&::after]:hidden data-active:border-b-primary data-active:border-t-transparent data-active:border-l-transparent data-active:border-r-transparent data-active:bg-transparent data-active:font-semibold data-active:text-primary data-active:shadow-none"
						>
							<CircleDollarSign className="size-4" />
							Precios
						</TabsTrigger>
					</TabsList>

					<TabsContent value="equipment" className="mt-0">
						<RequiredEquipmentTable item={item} />
					</TabsContent>

					<TabsContent value="branches" className="mt-0">
						<BranchOffersTable item={item} />
					</TabsContent>

					<TabsContent value="pricing" className="mt-0">
						<PricingTable item={item} />
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}

function ActivateRentableItemAction({
	rentableItemId,
}: {
	rentableItemId: string;
}) {
	const [open, setOpen] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const activateMutation = useActivateRentableItem();

	async function handleActivate() {
		setErrorMessage(null);

		try {
			await activateMutation.mutateAsync({ rentableItemId });
			setOpen(false);
		} catch (error) {
			if (error instanceof ProblemDetailsError) {
				setErrorMessage(
					error.problemDetails.detail ??
						error.problemDetails.title ??
						"No pudimos activar el ítem rentable.",
				);
				return;
			}

			setErrorMessage("Ocurrió un error al activar el ítem rentable.");
		}
	}

	return (
		<AlertDialog
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (!nextOpen) {
					setErrorMessage(null);
				}
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

function TopChip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
	return (
		<div className="inline-flex h-10 items-center gap-2 rounded-md border bg-background px-4 text-sm font-medium">
			<Icon className="size-4 text-muted-foreground" />
			<span>{label}</span>
		</div>
	);
}

function SummaryPill({
	icon: Icon,
	label,
	value,
}: {
	icon: LucideIcon;
	label: string;
	value: string;
}) {
	return (
		<div className="flex items-center gap-3 rounded-xl border bg-background px-4 py-3">
			<div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
				<Icon className="size-5" />
			</div>
			<div>
				<p className="text-lg font-semibold leading-none">{value}</p>
				<p className="mt-1 text-xs text-muted-foreground">{label}</p>
			</div>
		</div>
	);
}

function Info({ label, value }: { label: string; value: string }) {
	return (
		<div className="grid grid-cols-[150px_1fr] gap-4 border-b py-3 last:border-b-0">
			<p className="text-sm font-semibold text-foreground">{label}</p>
			<p className="min-w-0 truncate text-sm text-muted-foreground">{value}</p>
		</div>
	);
}

function RequiredEquipmentTable({ item }: RentableItemDetailPageProps) {
	return (
		<DetailTable
			title="Equipo requerido"
			colSpan={3}
			isEmpty={item.requiredEquipment.length === 0}
			emptyMessage="No hay equipo requerido."
		>
			<TableHeader className="bg-neutral-100">
				<TableRow>
					<TableHead>Nombre</TableHead>
					<TableHead>Cantidad</TableHead>
					<TableHead>Notas</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{item.requiredEquipment.map((equipment) => (
					<TableRow key={equipment.equipmentTypeId}>
						<TableCell className="font-medium">
							{equipment.equipmentTypeName ?? equipment.equipmentTypeId}
						</TableCell>
						<TableCell>{equipment.quantityPerItem}</TableCell>
						<TableCell className="text-muted-foreground">
							{equipment.notes ?? equipment.equipmentTypeDescription ?? "—"}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</DetailTable>
	);
}

function BranchOffersTable({ item }: RentableItemDetailPageProps) {
	// TODO: Replace item-derived rate plan options with all tenant/catalog rate plans.
	const ratePlanOptions = getRatePlanOptions(item.offers);

	return (
		<DetailTable
			title="Ofertas por sucursal"
			action={
				<CreateRentalOfferWithPricingDialog
					item={item}
					ratePlanOptions={ratePlanOptions}
				/>
			}
			colSpan={7}
			isEmpty={item.offers.length === 0}
			emptyMessage="No hay ofertas por sucursal."
		>
			<TableHeader className="bg-neutral-100">
				<TableRow>
					<TableHead>Sucursal</TableHead>
					<TableHead>Visible en catálogo</TableHead>
					<TableHead>Rentable</TableHead>
					<TableHead>Con precios</TableHead>
					<TableHead>Precio inicial</TableHead>
					<TableHead>Última actualización</TableHead>
					<TableHead className="w-12 text-right">Acciones</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{item.offers.map((offer) => (
					<TableRow key={offer.rentalOfferId}>
						<TableCell className="font-medium">
							{offer.branchName ?? offer.branchId}
						</TableCell>
						<TableCell>
							<BooleanBadge
								value={offer.isVisible}
								trueLabel="Visible"
								falseLabel="Oculto"
							/>
						</TableCell>
						<TableCell>
							<BooleanBadge
								value={offer.isRentable}
								trueLabel="Rentable"
								falseLabel="No rentable"
							/>
						</TableCell>
						<TableCell>
							<BooleanBadge
								value={!!offer.activeRatePlan}
								trueLabel="Con precios"
								falseLabel="Sin precios"
							/>
						</TableCell>
						<TableCell>
							{offer.activeRatePlan
								? formatTierPrice(offer.activeRatePlan)
								: "Sin precio"}
						</TableCell>
						<TableCell className="text-muted-foreground">
							{formatDate(offer.updatedAt)}
						</TableCell>
						<TableCell className="text-right">
							<ConfigureRentalOfferPriceAction
								offer={offer}
								offers={item.offers}
							/>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</DetailTable>
	);
}

function ConfigureRentalOfferPriceAction({
	offer,
	offers,
}: {
	offer: GetRentableItemDetailResponseDto["offers"][number];
	offers: GetRentableItemDetailResponseDto["offers"];
}) {
	const attachFormId = useId();
	const createFormId = useId();
	const [attachOpen, setAttachOpen] = useState(false);
	const [createOpen, setCreateOpen] = useState(false);
	const attachMutation = useAttachRatePlanToRentalOffer();
	const createMutation = useCreateRatePlanAndAttachToRentalOffer();
	const branchLabel = offer.branchName ?? offer.branchId;
	// TODO: Replace item-derived rate plan options with all tenant/catalog rate plans.
	const ratePlanOptions = getRatePlanOptions(offers);

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button variant="ghost" size="icon-sm" aria-label="Abrir acciones">
							<MoreHorizontal className="size-4" />
						</Button>
					}
				/>
				<DropdownMenuContent align="end" className="w-52">
					<DropdownMenuItem onClick={() => setAttachOpen(true)}>
						<CircleDollarSign className="size-4" />
						Vincular precio
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setCreateOpen(true)}>
						<CircleDollarSign className="size-4" />
						Configurar precio
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<Dialog open={attachOpen} onOpenChange={setAttachOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Vincular precio</DialogTitle>
						<DialogDescription>
							Asocia un plan de precios existente a la oferta de {branchLabel}.
						</DialogDescription>
					</DialogHeader>

					{attachOpen ? (
						<AttachRatePlanToRentalOfferForm
							formId={attachFormId}
							ratePlanOptions={ratePlanOptions}
							isPending={attachMutation.isPending}
							submitLabel="Vincular plan"
							pendingLabel="Vinculando..."
							onSubmit={async (values) => {
								const body = toAttachRatePlanToRentalOfferDto(values, {
									catalogRentalOfferId: offer.rentalOfferId,
								});

								await attachMutation.mutateAsync({ body });
								setAttachOpen(false);
							}}
							onCancel={() => setAttachOpen(false)}
						/>
					) : null}
				</DialogContent>
			</Dialog>

			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-4xl">
					<DialogHeader>
						<DialogTitle>Configurar precio</DialogTitle>
						<DialogDescription>
							Crea un plan de precios y asígnalo a la oferta de {branchLabel}.
						</DialogDescription>
					</DialogHeader>

					{createOpen ? (
						<CreateRatePlanAndAttachForm
							formId={createFormId}
							catalogRentalOfferId={offer.rentalOfferId}
							isPending={createMutation.isPending}
							submitLabel="Crear y asociar plan"
							pendingLabel="Creando y asociando..."
							onSubmit={async (values, context) => {
								const body = toCreateRatePlanAndAttachToRentalOfferDto(
									values,
									context,
								);

								await createMutation.mutateAsync({ body });
								setCreateOpen(false);
							}}
							onCancel={() => setCreateOpen(false)}
						/>
					) : null}
				</DialogContent>
			</Dialog>
		</>
	);
}

function getRatePlanOptions(
	offers: GetRentableItemDetailResponseDto["offers"],
) {
	const optionsById = new Map<string, { id: string; name: string }>();

	for (const offer of offers) {
		const plan = offer.activeRatePlan;
		if (!plan) continue;
		optionsById.set(plan.ratePlanId, {
			id: plan.ratePlanId,
			name: plan.ratePlanName,
		});
	}

	return Array.from(optionsById.values());
}

function PricingTable({ item }: RentableItemDetailPageProps) {
	const offersWithPricing = item.offers.flatMap((offer) =>
		offer.activeRatePlan
			? [{ ...offer, activeRatePlan: offer.activeRatePlan }]
			: [],
	);

	return (
		<DetailTable
			title="Planes de precios"
			colSpan={5}
			isEmpty={offersWithPricing.length === 0}
			emptyMessage="No hay planes de precios activos."
		>
			<TableHeader className="bg-neutral-100">
				<TableRow>
					<TableHead>Sucursal</TableHead>
					<TableHead>Plan</TableHead>
					<TableHead>Unidad</TableHead>
					<TableHead>Tramos</TableHead>
					<TableHead>Estado</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{offersWithPricing.map((offer) => {
					const { activeRatePlan: plan } = offer;

					return (
						<TableRow key={plan.rentalOfferPricingId}>
							<TableCell className="font-medium">
								{offer.branchName ?? offer.branchId}
							</TableCell>
							<TableCell>{plan.ratePlanName}</TableCell>
							<TableCell>{billingUnitLabels[plan.billingUnit]}</TableCell>
							<TableCell>{summarizeTiers(plan)}</TableCell>
							<TableCell>
								<Badge variant="outline" className="bg-primary/10 text-primary">
									{plan.status === "ACTIVE" ? "Activo" : "Inactivo"}
								</Badge>
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</DetailTable>
	);
}

function BooleanBadge({
	value,
	trueLabel,
	falseLabel,
}: {
	value: boolean;
	trueLabel: string;
	falseLabel: string;
}) {
	return (
		<Badge
			variant="outline"
			className={
				value
					? "border-emerald-200 bg-emerald-50 text-emerald-700"
					: "border-muted bg-muted text-muted-foreground"
			}
		>
			<span
				className={
					value
						? "mr-2 size-2 rounded-full bg-emerald-600"
						: "mr-2 size-2 rounded-full bg-muted-foreground"
				}
			/>
			{value ? trueLabel : falseLabel}
		</Badge>
	);
}

function DetailTable({
	children,
	colSpan,
	isEmpty,
	emptyMessage,
	title,
	description,
	action,
}: {
	children: ReactNode;
	colSpan: number;
	isEmpty: boolean;
	emptyMessage: string;
	title: string;
	description?: string;
	action?: ReactNode;
}) {
	return (
		<div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
			<div className="flex items-start justify-between gap-4 px-4 pt-4 pb-2">
				<div>
					<h2 className="text-lg font-semibold tracking-tight">{title}</h2>
					{description != null && (
						<p className="text-sm text-muted-foreground">{description}</p>
					)}
				</div>
				{action != null ? <div className="shrink-0">{action}</div> : null}
			</div>

			<div className="px-4 pb-4">
				<Table className="border rounded-md">
					{children}

					{isEmpty ? (
						<TableBody>
							<TableRow>
								<TableCell
									colSpan={colSpan}
									className="h-28 text-center text-muted-foreground"
								>
									{emptyMessage}
								</TableCell>
							</TableRow>
						</TableBody>
					) : null}
				</Table>
			</div>
		</div>
	);
}

function RentableItemStatusBadge({
	status,
}: {
	status: GetRentableItemDetailResponseDto["status"];
}) {
	if (status === "ACTIVE") {
		return <Badge className="bg-emerald-600 text-white">Activo</Badge>;
	}
	if (status === "DRAFT") {
		return <Badge variant="secondary">Borrador</Badge>;
	}
	return <Badge variant="outline">{statusLabels[status]}</Badge>;
}

function getStartingPrice(item: GetRentableItemDetailResponseDto) {
	const prices = item.offers.flatMap((offer) => {
		const plan = offer.activeRatePlan;
		const firstTier = plan?.tiers[0];
		return plan && firstTier
			? [
					{
						amount: Number(firstTier.pricePerUnit),
						currency: plan.currency,
						unit: plan.billingUnit,
					},
				]
			: [];
	});
	const lowest = prices
		.filter((price) => Number.isFinite(price.amount))
		.sort((a, b) => a.amount - b.amount)[0];
	return lowest
		? `Desde ${formatCurrency(String(lowest.amount), lowest.currency)} / ${billingUnitLabels[lowest.unit]}`
		: null;
}

function formatTierPrice(
	plan: NonNullable<
		GetRentableItemDetailResponseDto["offers"][number]["activeRatePlan"]
	>,
) {
	const firstTier = plan.tiers[0];
	return firstTier
		? `Desde ${formatCurrency(firstTier.pricePerUnit, plan.currency)} / ${billingUnitLabels[plan.billingUnit]}`
		: "Sin precio";
}

function summarizeTiers(
	plan: NonNullable<
		GetRentableItemDetailResponseDto["offers"][number]["activeRatePlan"]
	>,
) {
	return plan.tiers
		.map(
			(tier) =>
				`${tier.fromUnit}-${tier.toUnit ?? "∞"}: ${formatCurrency(tier.pricePerUnit, plan.currency)}`,
		)
		.join(" · ");
}

function formatDate(value: string) {
	return new Intl.DateTimeFormat("es-AR", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}

function formatCurrency(amount: string, currency: string) {
	const numericAmount = Number(amount);
	if (!Number.isFinite(numericAmount)) return `${currency} ${amount}`;
	return new Intl.NumberFormat("es-AR", {
		style: "currency",
		currency,
		maximumFractionDigits: 2,
	}).format(numericAmount);
}
