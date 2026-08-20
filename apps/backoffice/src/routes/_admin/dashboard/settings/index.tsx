import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	Bell,
	Building2,
	ChevronRight,
	FileText,
	Globe2,
	MapPin,
	Shield,
} from "lucide-react";
import { z } from "zod";
import { currentBusinessQueries } from "@/application/current-business/current-business.queries";
import { BranchesPage } from "@/modules/settings/branches/list-branches/BranchesPage";
import { BrandingSection } from "@/modules/settings/branding/update-branding/BrandingSection";
import { SettingsConfigurationSection } from "@/modules/settings/business-configuration/SettingsConfigurationSection";
import { ContractSignerSettingsSection } from "@/modules/settings/contract-settings/configure-contract-signer/ContractSignerSettingsSection";
import { CustomDomainSection } from "@/modules/settings/domains/custom-domain/CustomDomainSection";
import { AdminRouteError } from "@/shared/components/admin-route-error";

const SETTINGS_SECTIONS = [
	"business",
	"branches",
	"storefront",
	"rental-policies",
	"customer-communication",
	"contracts",
] as const;

type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

const settingsSearchSchema = z.object({
	section: z.enum(SETTINGS_SECTIONS).optional(),
});

const settingsGroups = [
	{
		title: "Negocio",
		items: [
			{
				key: "business",
				label: "Negocio",
				description:
					"¿Cómo se identifica y configura regionalmente mi negocio?",
				icon: Building2,
			},
			{
				key: "branches",
				label: "Sucursales",
				description: "¿Dónde opera mi negocio?",
				icon: MapPin,
			},
			{
				key: "storefront",
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
				key: "rental-policies",
				label: "Políticas de alquiler",
				description: "¿Qué reglas generales aplica DEPIQO a mis alquileres?",
				icon: Shield,
			},
			{
				key: "customer-communication",
				label: "Comunicación con clientes",
				description: "¿Cómo continúa DEPIQO la comunicación con mis clientes?",
				icon: Bell,
			},
			{
				key: "contracts",
				label: "Contratos",
				description:
					"¿Quién representa a mi negocio en los contratos de alquiler?",
				icon: FileText,
			},
		],
	},
] as const satisfies ReadonlyArray<{
	title: string;
	items: ReadonlyArray<{
		key: SettingsSection;
		label: string;
		description: string;
		icon: typeof Building2;
	}>;
}>;

function findSettingsMetadata(section: SettingsSection) {
	return settingsGroups
		.flatMap((group) =>
			group.items.map((item) => ({ ...item, groupTitle: group.title })),
		)
		.find((item) => item.key === section);
}

export const Route = createFileRoute("/_admin/dashboard/settings/")({
	validateSearch: settingsSearchSchema,
	errorComponent: ({ error }) => (
		<AdminRouteError
			error={error}
			genericMessage="No pudimos cargar la configuración."
			forbiddenMessage="No tienes permisos para ver la configuración."
		/>
	),
	component: SettingsRoute,
});

function SettingsRoute() {
	const { section } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });

	function selectSection(nextSection: SettingsSection) {
		navigate({ search: { section: nextSection }, replace: true });
	}

	if (!section) {
		return <SettingsLanding onSelect={selectSection} />;
	}

	const active = findSettingsMetadata(section);
	if (!active) {
		return null;
	}

	return (
		<div className="space-y-8 p-8">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
				<p className="text-sm text-muted-foreground">
					Administra cómo opera y se presenta tu negocio.
				</p>
			</div>
			<div className="grid gap-12 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
				<SettingsNav activeSection={section} onSelect={selectSection} />
				<main className="min-w-0 space-y-6">
					<div className="space-y-2">
						<button
							type="button"
							onClick={() => navigate({ search: {}, replace: true })}
							className="text-sm font-medium text-muted-foreground hover:text-foreground lg:hidden"
						>
							← Configuración
						</button>
						<h2 className="text-2xl font-semibold tracking-tight">
							{active.label}
						</h2>
						<p className="text-sm text-muted-foreground">
							{active.description}
						</p>
					</div>
					<SettingsPanel section={section} />
				</main>
			</div>
		</div>
	);
}

function SettingsLanding({
	onSelect,
}: {
	onSelect: (section: SettingsSection) => void;
}) {
	return (
		<div className="mx-auto max-w-4xl space-y-10 p-8">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
				<p className="text-sm text-muted-foreground">
					Administra cómo opera y se presenta tu negocio.
				</p>
			</div>
			<div className="space-y-8">
				{settingsGroups.map((group) => (
					<section key={group.title} className="space-y-3">
						<h2 className="text-sm font-bold text-muted-foreground uppercase">
							{group.title}
						</h2>
						<div className="overflow-hidden rounded-xl border bg-card">
							{group.items.map((item) => {
								const Icon = item.icon;
								return (
									<button
										key={item.key}
										type="button"
										onClick={() => onSelect(item.key)}
										className="flex w-full items-center gap-4 border-b px-5 py-4 text-left last:border-b-0"
									>
										<span className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
											<Icon className="size-5" />
										</span>
										<span className="flex-1 text-sm font-medium">
											{item.label}
										</span>
										<ChevronRight className="size-4 text-muted-foreground" />
									</button>
								);
							})}
						</div>
					</section>
				))}
			</div>
		</div>
	);
}

function SettingsNav({
	activeSection,
	onSelect,
}: {
	activeSection: SettingsSection;
	onSelect: (section: SettingsSection) => void;
}) {
	return (
		<aside className="hidden lg:sticky lg:top-8 lg:block lg:self-start">
			<div className="rounded-xl border bg-card p-3">
				{settingsGroups.map((group, index) => (
					<div key={group.title} className={index ? "mt-5" : ""}>
						<p className="px-2 pb-1.5 text-[11px] font-medium uppercase text-muted-foreground">
							{group.title}
						</p>
						{group.items.map((item) => (
							<button
								key={item.key}
								type="button"
								onClick={() => onSelect(item.key)}
								className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors ${activeSection === item.key ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
							>
								{item.label}
							</button>
						))}
					</div>
				))}
			</div>
		</aside>
	);
}

function SettingsPanel({ section }: { section: SettingsSection }) {
	switch (section) {
		case "business":
			return <BusinessSettings />;
		case "branches":
			return <BranchesSettings />;
		case "storefront":
			return <StorefrontSettings />;
		case "rental-policies":
			return <SettingsConfigurationSection section="rental-policies" />;
		case "customer-communication":
			return <SettingsConfigurationSection section="customer-communication" />;
		case "contracts":
			return <ContractSignerSettingsSection />;
	}
}

function BusinessSettings() {
	const { data: business } = useSuspenseQuery(currentBusinessQueries.current());
	return (
		<div className="space-y-8">
			<section className="space-y-4">
				<div>
					<h3 className="text-lg font-semibold">Información del negocio</h3>
					<p className="text-sm text-muted-foreground">
						Estos datos identifican tu negocio en DEPIQO.
					</p>
				</div>
				<div className="divide-y overflow-hidden rounded-xl border bg-card">
					<ReadOnlyRow label="Nombre" value={business.name} />
					<ReadOnlyRow
						label="Dirección de DEPIQO"
						value={`${business.slug}.depiqo.com`}
					/>
				</div>
			</section>
			<section className="space-y-4">
				<div>
					<h3 className="text-lg font-semibold">Configuración regional</h3>
					<p className="text-sm text-muted-foreground">
						Define cómo se muestran precios, idioma y fechas.
					</p>
				</div>
				<SettingsConfigurationSection section="business" />
			</section>
		</div>
	);
}

function BranchesSettings() {
	const navigate = useNavigate();
	return (
		<BranchesPage
			compact
			onCreateBranch={() => navigate({ to: "/dashboard/branches/new" })}
			onEditBranch={(branchId) =>
				navigate({
					to: "/dashboard/branches/$branchId/edit",
					params: { branchId },
				})
			}
		/>
	);
}

function StorefrontSettings() {
	const { data: business } = useSuspenseQuery(currentBusinessQueries.current());
	return (
		<div className="space-y-8">
			<section className="space-y-4">
				<div>
					<h3 className="text-lg font-semibold">Identidad de la tienda</h3>
					<p className="text-sm text-muted-foreground">
						Personaliza la apariencia de tu tienda online.
					</p>
				</div>
				<BrandingSection />
			</section>
			<section className="space-y-4">
				<div>
					<h3 className="text-lg font-semibold">Dominio</h3>
					<p className="text-sm text-muted-foreground">
						Elige cómo encuentran los clientes tu tienda online.
					</p>
				</div>
				<div className="divide-y overflow-hidden rounded-xl border bg-card">
					<ReadOnlyRow
						label="URL de la tienda DEPIQO"
						value={`${business.slug}.depiqo.com`}
					/>
				</div>
				<CustomDomainSection />
			</section>
			<SettingsConfigurationSection section="storefront" />
		</div>
	);
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-8 px-5 py-4">
			<p className="text-sm font-semibold">{label}</p>
			<p className="text-sm text-muted-foreground">{value}</p>
		</div>
	);
}
