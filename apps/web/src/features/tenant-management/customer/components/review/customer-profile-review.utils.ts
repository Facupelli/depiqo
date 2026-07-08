export function getInstagramProfileUrl(username: string | null) {
	if (!username?.trim()) {
		return null;
	}

	return `https://www.instagram.com/${username.trim()}/`;
}

export function maskAccountNumber(accountNumber: string) {
	if (accountNumber.length <= 4) {
		return accountNumber;
	}

	const visible = accountNumber.slice(-4);
	const masked = "*".repeat(accountNumber.length - 4).replace(/(.{4})/g, "$1 ");

	return `${masked}${visible}`.trim();
}

export function getDocumentFileName(identityDocumentPath: string) {
	const segments = identityDocumentPath.split("/").filter(Boolean);
	return segments.at(-1) ?? identityDocumentPath;
}

export function getDocumentPreviewType(identityDocumentPath: string) {
	const normalizedPath = identityDocumentPath.toLowerCase();

	if (normalizedPath.endsWith(".pdf")) {
		return "pdf" as const;
	}

	if (
		normalizedPath.endsWith(".jpg") ||
		normalizedPath.endsWith(".jpeg") ||
		normalizedPath.endsWith(".png") ||
		normalizedPath.endsWith(".webp")
	) {
		return "image" as const;
	}

	return "unknown" as const;
}
