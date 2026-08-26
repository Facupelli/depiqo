import type { ComponentType } from "react";
import type { TenantBranding } from "@/modules/tenant-management/tenant-branding/tenant-branding";
import { GuaridaRentalLandingPage } from "./pages/guarida-rental-landing";

export interface LandingSeo {
	title: string;
	description: string;
	ogTitle?: string;
	ogDescription?: string;
}

export interface TenantLandingDefinition {
	component: ComponentType<{ branding: TenantBranding }>;
	seo: LandingSeo;
}

export const tenantLandingRegistry: Record<string, TenantLandingDefinition> = {
	"guarida-rental": {
		component: GuaridaRentalLandingPage,
		seo: {
			title: "Guarida Rental | Alquiler de equipo audiovisual en Madrid",
			description:
				"Alquiler de equipo audiovisual en Madrid para rodajes, fotografia y producción. Camaras, luces, sonido y soporte tecnico para proyectos de todos los tamanos.",
			ogTitle: "Guarida Rental | Equipo audiovisual en Madrid",
			ogDescription:
				"Rental audiovisual en Madrid para cine, foto y producción. Explora el catalogo de equipos y reserva online.",
		},
	},
	facu2: {
		component: GuaridaRentalLandingPage,
		seo: {
			title: "Guarida Rental | Alquiler de equipo audiovisual en Madrid",
			description:
				"Alquiler de equipo audiovisual en Madrid para rodajes, fotografia y producción. Camaras, luces, sonido y soporte tecnico para proyectos de todos los tamanos.",
			ogTitle: "Guarida Rental | Equipo audiovisual en Madrid",
			ogDescription:
				"Rental audiovisual en Madrid para cine, foto y producción. Explora el catalogo de equipos y reserva online.",
		},
	},
};
