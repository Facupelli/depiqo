import { createFileRoute, notFound } from "@tanstack/react-router";
import { DepiqoLandingPage } from "@/modules/marketing/pages/depiqo-landing";
import { tenantLandingRegistry } from "@/modules/tenant-landings/tenant-landing-registry";
import { getResolvedTenantBranding } from "@/modules/tenant-management/tenant-branding/tenant-branding";

const platformSeo = {
	title: "Depiqo | Software para alquiler de equipos",
	description:
		"Gestiona catalogo, reservas, clientes y operaciones para tu negocio de alquiler de equipos desde una sola plataforma.",
	ogTitle: "Depiqo | Software para rental de equipos",
	ogDescription:
		"Una plataforma para gestionar alquiler de equipos, disponibilidad, pedidos y clientes con una experiencia moderna.",
};

export const Route = createFileRoute("/")({
	loader: ({ context: { tenantContext } }) => {
		if (!tenantContext || tenantContext.face === "platform") {
			return { seo: platformSeo, branding: null, landingSlug: null };
		}

		if (tenantContext.face !== "storefront") throw notFound();
		const landing = tenantLandingRegistry[tenantContext.tenant.slug];
		if (!landing) throw notFound();

		return {
			seo: landing.seo,
			branding: getResolvedTenantBranding(tenantContext),
			landingSlug: tenantContext.tenant.slug,
		};
	},
	head: ({ loaderData }) => {
		const seo = loaderData?.seo ?? platformSeo;
		const favicon = loaderData?.branding?.faviconHref ?? "/favicon.svg";
		return {
			meta: [
				{ title: seo.title },
				{ name: "description", content: seo.description },
				{ property: "og:title", content: seo.ogTitle ?? seo.title },
				{
					property: "og:description",
					content: seo.ogDescription ?? seo.description,
				},
				{ property: "og:type", content: "website" },
				{ name: "twitter:card", content: "summary_large_image" },
				{ name: "twitter:title", content: seo.ogTitle ?? seo.title },
				{
					name: "twitter:description",
					content: seo.ogDescription ?? seo.description,
				},
			],
			links: [{ rel: "icon", href: favicon }],
		};
	},
	component: HomePage,
});

function HomePage() {
	const { tenantContext } = Route.useRouteContext();
	const { branding, landingSlug } = Route.useLoaderData();

	if (!tenantContext || tenantContext.face === "platform")
		return <DepiqoLandingPage />;
	if (!branding || !landingSlug) throw notFound();
	const LandingPage = tenantLandingRegistry[landingSlug]?.component;
	if (!LandingPage) throw notFound();
	return <LandingPage branding={branding} />;
}
