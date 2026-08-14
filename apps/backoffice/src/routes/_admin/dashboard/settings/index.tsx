import { createFileRoute, useNavigate } from "@tanstack/react-router";
import z from "zod";
import { TenantContractSignerSettingsSection } from "@/features/tenant-management/tenant/contract-signer/components/tenant-contract-signer-settings-section";
import { TenantConfigSettingsSection } from "@/features/tenant-management/tenant/update-tenant-config/components/tenant-config-form";
import { cn } from "@/lib/utils";
import { BrandingSection } from "@/modules/settings/branding/update-branding/BrandingSection";
import { CustomDomainSection } from "@/modules/settings/domains/custom-domain/CustomDomainSection";
import { AdminRouteError } from "@/shared/components/admin-route-error";

const SETTINGS_SECTIONS = [
	"branding",
	"owner-profile",
	"domain",
	"general",
	"billing-units",
	"category-grouping",
	"pricing",
	"insurance",
] as const;

type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

const settingsSearchSchema = z.object({
	section: z.enum(SETTINGS_SECTIONS).default("general"),
});

const settingsNavGroups: Array<{
	title: string;
	items: Array<{
		key: SettingsSection;
		label: string;
		description: string;
	}>;
}> = [
	{
		title: "Rental",
		items: [
			{
				key: "general",
				label: "General",
				description:
					"Reservas, comunicación de pedidos y ajustes del catálogo.",
			},
			{
				key: "branding",
				label: "Marca",
				description: "Visual identity and tenant presentation.",
			},
			{
				key: "owner-profile",
				label: "Remito",
				description: "Datos legales y firma del titular del rental.",
			},
			{
				key: "domain",
				label: "Dominio",
				description: "Custom domain and storefront access.",
			},
		],
	},
	{
		title: "Precios",
		items: [
			{
				key: "pricing",
				label: "Pricing",
				description: "Currency, rounding, and pricing behavior.",
			},
			{
				key: "insurance",
				label: "Seguro de equipos",
				description: "Aplica un seguro de equipos a los pedidos.",
			},
		],
	},
];

const settingsSectionMeta = Object.fromEntries(
	settingsNavGroups.flatMap((group) =>
		group.items.map((item) => [
			item.key,
			{
				title: item.label,
				description: item.description,
				groupTitle: group.title,
			},
		]),
	),
) as Record<
	SettingsSection,
	{ title: string; description: string; groupTitle: string }
>;

export const Route = createFileRoute("/_admin/dashboard/settings/")({
	validateSearch: settingsSearchSchema,
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar la configuración."
				forbiddenMessage="No tienes permisos para ver la configuración."
			/>
		);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate({ from: Route.fullPath });
	const { section } = Route.useSearch();
	const activeSection = settingsSectionMeta[section];

	function handleSectionChange(nextSection: SettingsSection) {
		navigate({
			search: () => ({
				section: nextSection,
			}),
			replace: true,
		});
	}

	return (
		<div className="space-y-8 p-8">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Ajustes</h1>
					<p className="text-sm text-muted-foreground">
						Maneja tus ajustes del rental.
					</p>
				</div>
			</div>

			<div className="grid gap-12 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
				<SettingsSectionNav
					activeSection={section}
					onSectionChange={handleSectionChange}
				/>

				<div className="min-w-0 space-y-6">
					<div className="space-y-1">
						<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
							{activeSection.groupTitle}
						</p>
						<h2 className="text-2xl font-semibold tracking-tight">
							{activeSection.title}
						</h2>
						<p className="text-sm text-muted-foreground">
							{activeSection.description}
						</p>
					</div>

					<SettingsPanel section={section} />
				</div>
			</div>
		</div>
	);
}

function SettingsSectionNav({
	activeSection,
	onSectionChange,
}: {
	activeSection: SettingsSection;
	onSectionChange: (section: SettingsSection) => void;
}) {
	return (
		<div className="lg:sticky lg:top-8 lg:self-start">
			<div className="rounded-2xl border bg-card p-3 shadow-xs">
				{settingsNavGroups.map((group, groupIndex) => (
					<div
						key={group.title}
						className={cn("space-y-1.5", groupIndex > 0 && "mt-5")}
					>
						<p className="px-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
							{group.title}
						</p>
						<div className="space-y-1">
							{group.items.map((item) => {
								const isActive = item.key === activeSection;

								return (
									<button
										key={item.key}
										type="button"
										onClick={() => onSectionChange(item.key)}
										className={cn(
											"flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition-colors",
											isActive
												? "bg-muted text-foreground font-medium"
												: "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
										)}
									>
										{item.label}
									</button>
								);
							})}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function SettingsPanel({ section }: { section: SettingsSection }) {
	switch (section) {
		case "general":
			return <TenantConfigSettingsSection section="general" />;
		case "branding":
			return <BrandingSection />;
		case "owner-profile":
			return <TenantContractSignerSettingsSection />;
		case "domain":
			return <CustomDomainSection />;
		case "pricing":
			return <TenantConfigSettingsSection section="pricing" />;
		case "insurance":
			return <TenantConfigSettingsSection section="insurance" />;
	}
}
