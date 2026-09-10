import type { GetRentableItemDetailResponseDto } from "@repo/api-contracts";
import { Badge } from "@repo/ui/components/badge";
import {
	Building2,
	CheckCircle2,
	CircleDollarSign,
	EyeOff,
	type LucideIcon,
} from "lucide-react";
import { formatMoney } from "@/shared/utils/formatters";
import type { PricePlanOption } from "../product-pricing/price-plan-selection/PricePlanSelectionForm";
import { SetPricePlanAction } from "../product-pricing/set-price-plan/SetPricePlanAction";
import { EditBranchAvailabilityDialog } from "./edit-branch-availability/EditBranchAvailabilityDialog";

type RentalOffer = GetRentableItemDetailResponseDto["offers"][number];
type SetupStatus = RentalOffer["setupSummary"]["status"];
type SetupIssue = RentalOffer["setupSummary"]["issues"][number];
type Presentation = {
	label: string;
	badgeClassName: string;
	icon: LucideIcon;
	description: string;
};

const billingUnitLabels = { HOUR: "hora", DAY: "día", WEEK: "semana" } as const;
const setupIssueLabels = {
	BRANCH_INACTIVE: "La sucursal está inactiva",
	BRANCH_UNAVAILABLE: "La sucursal ya no está disponible",
	MISSING_PRICING: "No tiene un plan de precios asignado",
	PRICING_ASSIGNMENT_INACTIVE: "La asignación de precios está inactiva",
	RATE_PLAN_INACTIVE: "El plan de precios está inactivo",
	NO_VALID_TIERS: "El plan no tiene tramos de precios válidos",
	OFFER_NOT_RENTABLE: "El alquiler está deshabilitado",
	OFFER_NOT_VISIBLE: "La oferta no es visible en el catálogo",
} satisfies Record<SetupIssue, string>;

export function RentalOfferCard({
	offer,
	ratePlanOptions,
	ratePlanOptionsStatus = "ready",
}: {
	offer: RentalOffer;
	ratePlanOptions: PricePlanOption[];
	ratePlanOptionsStatus?: "loading" | "error" | "ready";
}) {
	const price = offer.setupSummary.priceSummary;
	const presentation = getOfferPresentation(offer);
	const StatusIcon = presentation.icon;
	return (
		<article className="grid overflow-hidden rounded-xl border bg-background lg:grid-cols-[minmax(220px,1fr)_minmax(240px,1.1fr)_auto] lg:items-center">
			<div className="flex gap-3 p-4 sm:p-5">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
					<Building2 className="size-5 text-muted-foreground" />
				</div>
				<div className="min-w-0">
					<h3 className="truncate font-semibold">
						{offer.branchName ?? offer.branchId}
					</h3>
					<div className="mt-2 flex flex-wrap gap-2">
						<Badge variant="outline" className={presentation.badgeClassName}>
							{presentation.label}
						</Badge>
						<Badge variant="outline">
							{offer.isVisible ? "Visible" : "Oculta"}
						</Badge>
						<Badge variant="outline">
							{offer.isRentable ? "Disponible" : "No disponible"}
						</Badge>
					</div>
				</div>
			</div>
			<div className="border-t p-4 lg:border-t-0 lg:border-l">
				<div className="flex items-start gap-2 text-sm text-muted-foreground">
					<StatusIcon className="mt-0.5 size-4 shrink-0" />
					<div>
						<p className="font-medium text-foreground">
							{presentation.description}
						</p>
						<p className="mt-2 font-semibold text-foreground">
							{price
								? `Desde ${formatMoney(price.startingPrice, price.currency)}/${billingUnitLabels[price.billingUnit]}`
								: "Sin precio asignado"}
						</p>
						{price ? (
							<p className="mt-1 text-xs">Plan: {price.ratePlanName}</p>
						) : null}
					</div>
				</div>
			</div>
			<div className="flex flex-col gap-2 border-t p-4 lg:border-t-0 lg:border-l">
				<SetPricePlanAction
					offer={offer}
					ratePlanOptions={ratePlanOptions}
					ratePlanOptionsStatus={ratePlanOptionsStatus}
					assignLabel="Configurar precio"
				/>
				<EditBranchAvailabilityDialog
					rentalOfferId={offer.rentalOfferId}
					branchName={offer.branchName}
					isVisible={offer.isVisible}
					isRentable={offer.isRentable}
				/>
			</div>
		</article>
	);
}

function getOfferPresentation(offer: RentalOffer): Presentation {
	const details = offer.setupSummary.issues.map(
		(issue) => setupIssueLabels[issue],
	);
	const presentations = {
		BRANCH_UNAVAILABLE: {
			label: "Sucursal no disponible",
			badgeClassName: "border-red-200 bg-red-50 text-red-700",
			icon: Building2,
			description: details.join(". ") || "Esta sucursal no está disponible.",
		},
		MISSING_PRICING: {
			label: "Sin precio configurado",
			badgeClassName: "border-amber-200 bg-amber-50 text-amber-800",
			icon: CircleDollarSign,
			description: "Esta oferta todavía no tiene un plan de precios asignado.",
		},
		INVALID_PRICING: {
			label: "Precio incompleto",
			badgeClassName: "border-red-200 bg-red-50 text-red-700",
			icon: CircleDollarSign,
			description:
				details.join(". ") || "El plan de precios necesita atención.",
		},
		NOT_RENTABLE: {
			label: "No disponible para alquilar",
			badgeClassName: "border-red-200 bg-red-50 text-red-700",
			icon: EyeOff,
			description: "El alquiler está deshabilitado para esta oferta.",
		},
		NOT_VISIBLE: {
			label: "Oculta en el catálogo",
			badgeClassName: "border-muted bg-muted text-muted-foreground",
			icon: EyeOff,
			description:
				"La oferta está configurada, pero no se muestra en el catálogo.",
		},
		READY: {
			label: "Lista para alquilar",
			badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
			icon: CheckCircle2,
			description: "Lista para alquilar",
		},
	} satisfies Record<SetupStatus, Presentation>;
	return presentations[offer.setupSummary.status];
}
