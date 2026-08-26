import { env } from "cloudflare:workers";

export async function getCustomerDocument(objectPath: string) {
	const object = await env.CUSTOMERS_BUCKET.get(objectPath);

	if (!object) {
		return null;
	}

	return {
		body: object.body,
		contentLength: object.size,
		contentType: object.httpMetadata?.contentType,
		etag: object.httpEtag,
	};
}
