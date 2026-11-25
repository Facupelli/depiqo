export const marketingUrl = "https://depiqo.com/";
export const marketingImage = {
	url: `${marketingUrl}og/depiqo-og.png`,
	width: 2400,
	height: 1260,
	alt: "Depiqo: gestión de alquileres, inventario y operación en un solo lugar",
};
export const marketingSeo = {
	title: "Software de gestión de alquiler de equipos | Depiqo",
	description:
		"Gestioná alquileres, inventario y disponibilidad de equipos con Depiqo. Ofrecé un catálogo online para que tus clientes consulten y reserven.",
};

const organizationId = `${marketingUrl}#organization`;

export const marketingJsonLd = {
	"@context": "https://schema.org",
	"@graph": [
		{
			"@type": "Organization",
			"@id": organizationId,
			name: "Depiqo",
			url: marketingUrl,
		},
		{
			"@type": "WebSite",
			"@id": `${marketingUrl}#website`,
			name: "Depiqo",
			url: marketingUrl,
			inLanguage: "es",
			publisher: { "@id": organizationId },
		},
		{
			"@type": "WebApplication",
			"@id": `${marketingUrl}#software`,
			name: "Depiqo",
			url: marketingUrl,
			description:
				"Software de gestión para negocios que alquilan equipos. Conecta un catálogo online con reservas y un panel para gestionar inventario, disponibilidad, clientes y contratos de alquiler.",
			applicationCategory: "BusinessApplication",
			operatingSystem: "Web",
			inLanguage: "es",
			publisher: { "@id": organizationId },
			isPartOf: { "@id": `${marketingUrl}#website` },
		},
	],
};

// Only trusted constants enter this script; escaping also prevents HTML termination.
export const marketingJsonLdScript = JSON.stringify(marketingJsonLd).replace(
	/</g,
	"\\u003c",
);
