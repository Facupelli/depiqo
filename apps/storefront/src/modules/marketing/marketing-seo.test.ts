import { describe, expect, it } from "vitest";
import {
	marketingRedirect,
	robotsResponse,
	shouldNoindex,
	sitemapResponse,
} from "./marketing-indexing.server";
import {
	marketingImage,
	marketingJsonLdScript,
	marketingSeo,
	marketingUrl,
} from "./marketing-seo";

describe("marketing discovery policy", () => {
	it("uses the verified non-www production identity", () => {
		expect(marketingUrl).toBe("https://depiqo.com/");
		expect(marketingSeo.title).toContain("alquiler de equipos");
		expect(marketingImage.url).toBe("https://depiqo.com/og/depiqo-og.png");
	});

	it("permanently redirects www, preserving paths and query parameters", () => {
		const response = marketingRedirect(
			new URL("https://www.depiqo.com/catalogo/equipo?utm_source=bing&a=2"),
		);
		expect(response?.status).toBe(301);
		expect(response?.headers.get("location")).toBe(
			"https://depiqo.com/catalogo/equipo?utm_source=bing&a=2",
		);
		for (const host of [
			"depiqo.com",
			"www.guaridarental.com",
			"app.depiqo.com",
		]) {
			expect(marketingRedirect(new URL(`https://${host}/`))).toBeNull();
		}
	});

	it("permits search crawlers without changing GPTBot or tenant rules", async () => {
		const response = robotsResponse("depiqo.com");
		expect(response.headers.get("content-type")).toContain("text/plain");
		expect(await response.text()).toBe(
			"# https://www.robotstxt.org/robotstxt.html\nUser-agent: *\nDisallow:\n\nSitemap: https://depiqo.com/sitemap.xml\n",
		);
		expect(await robotsResponse("www.guaridarental.com").text()).toBe(
			"# https://www.robotstxt.org/robotstxt.html\nUser-agent: *\nDisallow:\n",
		);
	});

	it("lists only the canonical homepage, without fabricated lastmod", async () => {
		const response = sitemapResponse("depiqo.com");
		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("application/xml");
		const xml = await response.text();
		expect(xml.match(/<loc>/g)).toHaveLength(1);
		expect(xml).toContain("<loc>https://depiqo.com/</loc>");
		expect(xml).not.toContain("lastmod");
		for (const host of [
			"www.guaridarental.com",
			"app.depiqo.com",
			"test.workers.dev",
		]) {
			expect(sitemapResponse(host).status).toBe(404);
		}
	});

	it("excludes previews and marketing utility pages, not tenant content", () => {
		for (const host of [
			"localhost",
			"test.workers.dev",
			"version.test.workers.dev",
			"test.pages.dev",
		]) {
			expect(shouldNoindex(host, "/")).toBe(true);
		}
		expect(shouldNoindex("depiqo.com", "/")).toBe(false);
		expect(shouldNoindex("depiqo.com", "/login")).toBe(true);
		expect(shouldNoindex("depiqo.com", "/health")).toBe(true);
		expect(shouldNoindex("www.guaridarental.com", "/rental/products")).toBe(
			false,
		);
	});

	it("serializes a coherent truthful graph without offers or reviews", () => {
		const graph = JSON.parse(marketingJsonLdScript);
		expect(graph["@context"]).toBe("https://schema.org");
		expect(
			graph["@graph"].map((node: { "@type": string }) => node["@type"]),
		).toEqual(["Organization", "WebSite", "WebApplication"]);
		for (const node of graph["@graph"]) {
			expect(node.name).toBe("Depiqo");
			expect(node.url).toBe(marketingUrl);
			expect(node["@id"]).toMatch(/^https:\/\/depiqo\.com\/#/);
		}
		expect(marketingJsonLdScript).not.toMatch(
			/offers|aggregateRating|review|sameAs|</,
		);
	});
});
