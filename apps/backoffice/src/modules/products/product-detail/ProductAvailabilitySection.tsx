import type { GetRentableItemDetailResponseDto } from "@repo/api-contracts";
import { Badge } from "@repo/ui/components/badge";
import {
	Building2,
	CheckCircle2,
	CircleDollarSign,
	EyeOff,
	type LucideIcon,
	Tag,
} from "lucide-react";
import type { ReactNode } from "react";
import { EditBranchAvailabilityDialog } from "@/modules/products/branch-availability/edit-branch-availability/EditBranchAvailabilityDialog";
import type { PricePlanOption } from "@/modules/products/product-pricing/price-plan-selection/PricePlanSelectionForm";
import { SetPricePlanAction } from "@/modules/products/product-pricing/set-price-plan/SetPricePlanAction";
import { formatPriceSummary } from "./product-detail.utils";

type RentalOffer = GetRentableItemDetailResponseDto["offers"][number];

const setupIssueLabels = {
	BRANCH_INACTIVE: "La sucursal está inactiva",
	BRANCH_UNAVAILABLE: "La sucursal ya no está disponible",
	MISSING_PRICING: "No tiene un plan de precios asignado",
	PRICING_ASSIGNMENT_INACTIVE: "La asignación de precios está inactiva",
	RATE_PLAN_INACTIVE: "El plan de precios está inactivo",
	NO_VALID_TIERS: "El plan no tiene tramos de precios válidos",
	OFFER_NOT_RENTABLE: "El alquiler está deshabilitado",
	OFFER_NOT_VISIBLE: "La oferta no es visible en el catálogo",
} satisfies Record<RentalOffer["setupSummary"]["issues"][number], string>;

export function ProductAvailabilitySection({
	product,
	ratePlanOptions,
}: {
	product: GetRentableItemDetailResponseDto;
	ratePlanOptions: PricePlanOption[];
}) {
	return (
		<section className="rounded-2xl border bg-background p-5 shadow-sm">
			<div className="mb-4">
				<h2 className="font-semibold text-lg tracking-tight">
					Ofertas por sucursal
				</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Configura la visibilidad, disponibilidad para alquilar y precio en
					cada sucursal.
				</p>
			</div>
			{product.offers.length === 0 ? (
				<div className="flex h-32 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
					Este ítem todavía no se ofrece en ninguna sucursal.
				</div>
			) : (
				<div className="space-y-3">
					{product.offers.map((offer) => (
						<BranchOfferCard
							key={offer.rentalOfferId}
							offer={offer}
							ratePlanOptions={ratePlanOptions}
						/>
					))}
				</div>
			)}
		</section>
	);
}

function BranchOfferCard({
	offer,
	ratePlanOptions,
}: {
	offer: RentalOffer;
	ratePlanOptions: PricePlanOption[];
}) {
	const presentation = getOfferPresentation(offer);
	return (
		<article className="grid items-center overflow-hidden rounded-2xl border bg-background lg:grid-cols-[minmax(250px,1.2fr)_minmax(220px,1.1fr)_minmax(240px,1fr)_190px]">
			<div className="flex items-center gap-4 p-5">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
					<Building2 className="size-5" />
				</div>
				<div className="min-w-0">
					<h3 className="truncate font-semibold text-lg">
						{offer.branchName ?? offer.branchId}
					</h3>
					<Badge variant="outline" className={presentation.badgeClassName}>
						{presentation.label}
					</Badge>
					<div className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
						<span className={offer.isVisible ? "text-emerald-700" : undefined}>
							{offer.isVisible ? "Visible" : "Oculta"}
						</span>
						<span aria-hidden="true">·</span>
						<span className={offer.isRentable ? "text-emerald-700" : undefined}>
							{offer.isRentable
								? "Disponible para alquilar"
								: "No disponible para alquilar"}
						</span>
					</div>
				</div>
			</div>
			<OfferCardSection icon={Tag} title="Precio">
				{offer.setupSummary.priceSummary ? (
					<>
						<p>Plan: {offer.setupSummary.priceSummary.ratePlanName}</p>
						<p className="mt-1">
							{formatPriceSummary(offer.setupSummary.priceSummary)}
						</p>
					</>
				) : (
					<p>Sin precio asignado</p>
				)}
			</OfferCardSection>
			<OfferCardSection
				icon={presentation.icon}
				title="Estado de configuración"
				tone={presentation.tone}
			>
				<p>{presentation.description}</p>
			</OfferCardSection>
			<div className="flex flex-col justify-center gap-2 border-t p-4 lg:border-t-0 lg:border-l">
				<SetPricePlanAction offer={offer} ratePlanOptions={ratePlanOptions} />
				<EditBranchAvailabilityDialog offer={offer} />
			</div>
		</article>
	);
}

function OfferCardSection({
	icon: Icon,
	title,
	children,
	tone = "default",
}: {
	icon: LucideIcon;
	title: string;
	children: ReactNode;
	tone?: "default" | "ready" | "warning" | "muted";
}) {
	const iconClassName = {
		default: "text-muted-foreground",
		ready: "text-emerald-600",
		warning: "text-amber-600",
		muted: "text-muted-foreground",
	}[tone];
	return (
		<div className="flex gap-3 border-t p-5 lg:border-t-0 lg:border-l">
			<Icon className={`mt-6 size-5 shrink-0 ${iconClassName}`} />
			<div className="min-w-0 text-sm text-muted-foreground">
				<p className="mb-2 font-semibold text-foreground">{title}</p>
				{children}
			</div>
		</div>
	);
}

function getOfferPresentation(offer: RentalOffer) {
	const details = offer.setupSummary.issues.map(
		(issue) => setupIssueLabels[issue],
	);
	return {
		BRANCH_UNAVAILABLE: {
			label: "Sucursal no disponible",
			badgeClassName: "border-red-200 bg-red-50 text-red-700",
			icon: Building2,
			tone: "warning" as const,
			description: details[0] ?? "Esta sucursal no está disponible.",
		},
		MISSING_PRICING: {
			label: "Sin precio configurado",
			badgeClassName: "border-amber-200 bg-amber-50 text-amber-800",
			icon: CircleDollarSign,
			tone: "warning" as const,
			description: "Esta oferta todavía no tiene un plan de precios asignado.",
		},
		INVALID_PRICING: {
			label: "Precio incompleto",
			badgeClassName: "border-red-200 bg-red-50 text-red-700",
			icon: CircleDollarSign,
			tone: "warning" as const,
			description:
				details.join(". ") || "El plan de precios necesita atención.",
		},
		NOT_RENTABLE: {
			label: "No disponible para alquilar",
			badgeClassName: "border-red-200 bg-red-50 text-red-700",
			icon: EyeOff,
			tone: "warning" as const,
			description: "El alquiler está deshabilitado para esta oferta.",
		},
		NOT_VISIBLE: {
			label: "Oculta en el catálogo",
			badgeClassName: "border-muted bg-muted text-muted-foreground",
			icon: EyeOff,
			tone: "muted" as const,
			description:
				"La oferta está configurada, pero no se muestra en el catálogo.",
		},
		READY: {
			label: "Lista para alquilar",
			badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
			icon: CheckCircle2,
			tone: "ready" as const,
			description: "Esta oferta está lista para alquilar.",
		},
	}[offer.setupSummary.status];
}
