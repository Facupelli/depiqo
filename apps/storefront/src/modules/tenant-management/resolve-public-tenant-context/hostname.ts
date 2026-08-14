const MAX_HOSTNAME_LENGTH = 253;
const MAX_LABEL_LENGTH = 63;

export type HostnameResult =
	| { success: true; hostname: string }
	| { success: false; reason: "missing-host" | "malformed-host" };

export function normalizeRequestHostname(
	rawHost: string | null,
): HostnameResult {
	if (rawHost === null) {
		return { success: false, reason: "missing-host" };
	}

	let value = rawHost.trim().toLowerCase();

	if (
		!value ||
		value.includes("/") ||
		value.includes("\\") ||
		value.includes("@") ||
		value.startsWith("[")
	) {
		return { success: false, reason: "malformed-host" };
	}

	const parts = value.split(":");

	if (parts.length > 2) {
		return { success: false, reason: "malformed-host" };
	}

	if (parts.length === 2) {
		const [host, port] = parts;

		if (!host || !port || !/^\d+$/.test(port)) {
			return { success: false, reason: "malformed-host" };
		}

		value = host;
	}

	if (value.endsWith(".")) {
		value = value.slice(0, -1);
	}

	let hostname: string;

	try {
		hostname = new URL(`http://${value}`).hostname;
	} catch {
		return { success: false, reason: "malformed-host" };
	}

	if (!hostname || hostname.length > MAX_HOSTNAME_LENGTH) {
		return { success: false, reason: "malformed-host" };
	}

	if (hostname === "localhost") {
		return { success: true, hostname };
	}

	const labels = hostname.split(".");

	if (labels.length < 2 || labels.some(isInvalidHostnameLabel)) {
		return { success: false, reason: "malformed-host" };
	}

	return { success: true, hostname };
}

function isInvalidHostnameLabel(label: string): boolean {
	return (
		!label ||
		label.length > MAX_LABEL_LENGTH ||
		label.startsWith("-") ||
		label.endsWith("-") ||
		!/^[a-z0-9-]+$/.test(label)
	);
}
