import { marketingUrl } from "./marketing-seo";

export function isMarketingHostname(hostname: string): boolean {
	return hostname === "depiqo.com" || hostname === "www.depiqo.com";
}

export function isPreviewHostname(hostname: string): boolean {
	return (
		hostname === "localhost" ||
		hostname.endsWith(".localhost") ||
		hostname === "127.0.0.1" ||
		hostname.endsWith(".workers.dev") ||
		hostname.endsWith(".pages.dev")
	);
}

export function marketingRedirect(url: URL): Response | null {
	if (url.hostname !== "www.depiqo.com") return null;
	const target = new URL(marketingUrl);
	target.pathname = url.pathname;
	target.search = url.search;
	return new Response(null, {
		status: 301,
		headers: { location: target.href },
	});
}

export function shouldNoindex(hostname: string, pathname: string): boolean {
	return (
		isPreviewHostname(hostname) ||
		(isMarketingHostname(hostname) &&
			pathname !== "/" &&
			pathname !== "/sitemap.xml" &&
			pathname !== "/robots.txt")
	);
}

export function robotsResponse(hostname: string): Response {
	const sitemap = isMarketingHostname(hostname)
		? `\nSitemap: ${marketingUrl}sitemap.xml\n`
		: "";
	return new Response(
		`# https://www.robotstxt.org/robotstxt.html\nUser-agent: *\nDisallow:\n${sitemap}`,
		{ headers: { "content-type": "text/plain; charset=utf-8" } },
	);
}

export function sitemapResponse(hostname: string): Response {
	if (!isMarketingHostname(hostname)) {
		return new Response("Not Found", { status: 404 });
	}
	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${marketingUrl}</loc></url>\n</urlset>\n`,
		{ headers: { "content-type": "application/xml; charset=utf-8" } },
	);
}
