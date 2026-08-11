import { createFileRoute, redirect } from "@tanstack/react-router";
import { DepiqoLandingPage } from "@/features/marketing/pages/depiqo-landing";

const platformSeo = {
	title: "Depiqo | Software para alquiler de equipos",
	description:
		"Gestiona catalogo, reservas, clientes y operaciones para tu negocio de alquiler de equipos desde una sola plataforma.",
	ogTitle: "Depiqo | Software para rental de equipos",
	ogDescription:
		"Una plataforma para gestionar alquiler de equipos, disponibilidad, pedidos y clientes con una experiencia moderna.",
};

export const Route = createFileRoute("/")({
	loader: () => ({ seo: platformSeo }),
	head: ({ loaderData }) => {
		const seo = loaderData?.seo ?? platformSeo;

		return {
			meta: [
				{ title: seo.title },
				{ name: "description", content: seo.description },
				{
					property: "og:title",
					content: seo.ogTitle ?? seo.title,
				},
				{
					property: "og:description",
					content: seo.ogDescription ?? seo.description,
				},
				{ property: "og:type", content: "website" },
				{ name: "twitter:card", content: "summary_large_image" },
				{
					name: "twitter:title",
					content: seo.ogTitle ?? seo.title,
				},
				{
					name: "twitter:description",
					content: seo.ogDescription ?? seo.description,
				},
			],
		};
	},
	component: HomePage,
});

function HomePage() {
	const { tenantContext } = Route.useRouteContext();

	if (tenantContext.face === "platform") {
		return <DepiqoLandingPage />;
	}

	if (tenantContext.face === "admin") {
		throw redirect({ to: "/dashboard" });
	}

	throw redirect({ to: "/dashboard" });
}
