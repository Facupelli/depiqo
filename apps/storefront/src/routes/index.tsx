import { createFileRoute, notFound } from "@tanstack/react-router";
import marketingCss from "@/modules/marketing/marketing.css?url";
import {
	marketingImage,
	marketingJsonLdScript,
	marketingSeo,
	marketingUrl,
} from "@/modules/marketing/marketing-seo";
import { DepiqoLandingPage } from "@/modules/marketing/pages/depiqo-landing";
import { getDemoMonth } from "@/modules/marketing/reservation-demo";
import { tenantLandingRegistry } from "@/modules/tenant-landings/tenant-landing-registry";
import { getResolvedTenantBranding } from "@/modules/tenant-management/tenant-branding/tenant-branding";

const platformSeo = {
	...marketingSeo,
	ogTitle: marketingSeo.title,
	ogDescription: marketingSeo.description,
};

export const Route = createFileRoute("/")({
	loader: ({ context: { tenantContext } }) => {
		if (!tenantContext || tenantContext.face === "platform") {
			return {
				seo: platformSeo,
				branding: null,
				landingSlug: null,
				demoMonth: getDemoMonth(new Date()),
			};
		}

		if (tenantContext.face !== "storefront") throw notFound();
		const landing = tenantLandingRegistry[tenantContext.tenant.slug];
		if (!landing) throw notFound();

		return {
			seo: landing.seo,
			branding: getResolvedTenantBranding(tenantContext),
			landingSlug: tenantContext.tenant.slug,
			demoMonth: null,
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
				{ property: "og:url", content: marketingUrl },
				{ property: "og:image", content: marketingImage.url },
				{ property: "og:image:width", content: String(marketingImage.width) },
				{ property: "og:image:height", content: String(marketingImage.height) },
				{ property: "og:image:alt", content: marketingImage.alt },
				{ name: "twitter:image", content: marketingImage.url },
				{ name: "twitter:image:alt", content: marketingImage.alt },
			],
			links: [
				{ rel: "canonical", href: marketingUrl },
				{ rel: "stylesheet", href: marketingCss },
				{
					rel: "preload",
					href: "/fonts/manrope/manrope-latin-variable.woff2",
					as: "font",
					type: "font/woff2",
					crossOrigin: "anonymous",
				},
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
			scripts: [
				{ type: "application/ld+json", children: marketingJsonLdScript },
			],
		};
	},
	component: HomePage,
});

function HomePage() {
	const { tenantContext } = Route.useRouteContext();
	const { branding, landingSlug, demoMonth } = Route.useLoaderData();

	if ((!tenantContext || tenantContext.face === "platform") && demoMonth)
		return <DepiqoLandingPage demoMonth={demoMonth} />;
	if (!branding || !landingSlug) throw notFound();
	const LandingPage = tenantLandingRegistry[landingSlug]?.component;
	if (!LandingPage) throw notFound();
	return <LandingPage branding={branding} />;
}
