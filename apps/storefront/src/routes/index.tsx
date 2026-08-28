import { createFileRoute, notFound } from "@tanstack/react-router";
import { DepiqoLandingPage } from "@/modules/marketing/pages/depiqo-landing";
import { tenantLandingRegistry } from "@/modules/tenant-landings/tenant-landing-registry";
import { getResolvedTenantBranding } from "@/modules/tenant-management/tenant-branding/tenant-branding";

const platformSeo = {
	title: "DEPIQO - Gestión de alquileres, simplificado.",
	description: "Inventario, alquileres y operación en un solo lugar.",
	ogTitle: "DEPIQO - Gestión de alquileres, simplificado.",
	ogDescription: "Inventario, alquileres y operación en un solo lugar.",
};

const platformUrl = "https://www.depiqo.com/";
const platformOgImageUrl = "https://www.depiqo.com/og/depiqo-og.png";

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
		const isPlatformLanding = !loaderData || loaderData.landingSlug === null;
		const meta = [
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
		];

		if (!isPlatformLanding) {
			return {
				meta,
				links: [
					{
						rel: "icon",
						href: loaderData.branding?.faviconHref ?? "/favicon.svg",
					},
				],
			};
		}

		return {
			meta: [
				...meta,
				{ property: "og:site_name", content: "DEPIQO" },
				{ property: "og:url", content: platformUrl },
				{ property: "og:image", content: platformOgImageUrl },
				{ name: "twitter:image", content: platformOgImageUrl },
			],
			links: [
				{ rel: "canonical", href: platformUrl },
				{ rel: "icon", href: "/favicon.ico", sizes: "48x48" },
				{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
				{
					rel: "icon",
					href: "/favicon-96x96.png",
					type: "image/png",
					sizes: "96x96",
				},
				{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
			],
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
