import { clientEnv } from "@/config/client-env";

const R2_PUBLIC_URLS = {
	catalog: clientEnv.VITE_R2_PUBLIC_URL,
	branding: clientEnv.VITE_BRANDING_R2_PUBLIC_URL,
} as const;

export type R2PublicBucket = keyof typeof R2_PUBLIC_URLS;

export function buildR2PublicUrl(
	path: string | null | undefined,
	bucket: R2PublicBucket,
): string | null {
	if (!path) {
		return null;
	}

	if (path.startsWith("http://") || path.startsWith("https://")) {
		return path;
	}

	return `${R2_PUBLIC_URLS[bucket]}/${path}`;
}
