import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
	Bell,
	Building2,
	FileText,
	Globe2,
	MapPin,
	Shield,
} from "lucide-react";

export type SettingsNavItem = {
	to: string;
	label: string;
	description: string;
	icon: LucideIcon;
};

export type SettingsNavGroup = {
	title: string;
	items: SettingsNavItem[];
};

export const settingsNavGroups: SettingsNavGroup[] = [
	{
		title: "Negocio",
		items: [
			{
				to: "/dashboard/settings/business",
				label: "Negocio",
				description:
					"¿Cómo se identifica y configura regionalmente mi negocio?",
				icon: Building2,
			},
			{
				to: "/dashboard/settings/branches",
				label: "Sucursales",
				description: "Gestiona las ubicaciones donde opera tu negocio.",
				icon: MapPin,
			},
			{
				to: "/dashboard/settings/storefront",
				label: "Tienda online",
				description: "¿Cómo se ve y se presenta mi negocio a los clientes?",
				icon: Globe2,
			},
		],
	},
	{
		title: "Operaciones",
		items: [
			{
				to: "/dashboard/settings/rental-policies",
				label: "Políticas de alquiler",
				description: "¿Qué reglas generales aplica DEPIQO a mis alquileres?",
				icon: Shield,
			},
			{
				to: "/dashboard/settings/customer-communication",
				label: "Comunicación con clientes",
				description: "¿Cómo continúa DEPIQO la comunicación con mis clientes?",
				icon: Bell,
			},
			{
				to: "/dashboard/settings/contracts",
				label: "Contratos",
				description:
					"¿Quién representa a mi negocio en los contratos de alquiler?",
				icon: FileText,
			},
		],
	},
];

const settingsNavItems: SettingsNavItem[] = settingsNavGroups.flatMap(
	(group) => group.items,
);

export function findSettingsNavItem(
	pathname: string,
): SettingsNavItem | undefined {
	return settingsNavItems.find((item) => item.to === pathname);
}

const idleItemClassName =
	"flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground";

const activeItemClassName =
	"flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-sm font-medium text-foreground transition-colors";

export function SettingsSecondaryNav() {
	return (
		<nav aria-label="Configuración" className="flex flex-col gap-6">
			{settingsNavGroups.map((group) => (
				<div key={group.title}>
					<p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
						{group.title}
					</p>
					<div className="flex flex-col gap-0.5">
						{group.items.map((item) => {
							const Icon = item.icon;

							return (
								<Link
									key={item.to}
									to={item.to}
									preload={false}
									activeOptions={{ exact: true }}
									className={idleItemClassName}
									activeProps={{ className: activeItemClassName }}
								>
									<span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
										<Icon className="size-4" />
									</span>
									<span className="truncate">{item.label}</span>
								</Link>
							);
						})}
					</div>
				</div>
			))}
		</nav>
	);
}
