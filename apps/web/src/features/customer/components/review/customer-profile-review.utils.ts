import type { CustomerProfileResponseDto } from "@repo/schemas";

const leadSourceLabels: Record<
	CustomerProfileResponseDto["heardAboutUs"],
	string
> = {
	INSTAGRAM: "Instagram",
	FACEBOOK: "Facebook",
	GOOGLE: "Google",
	TIKTOK: "TikTok",
	REFERRAL: "Amigo / referido",
	EVENT: "Evento",
	REPEAT_CUSTOMER: "Ya fue cliente",
	OTHER: "Otro",
};

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "medium",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "medium",
	timeStyle: "short",
});

export function formatReviewDate(value: Date | null) {
	if (!value) {
		return "-";
	}

	return dateFormatter.format(value);
}

export function formatReviewDateTime(value: Date | null) {
	if (!value) {
		return "-";
	}

	return dateTimeFormatter.format(value);
}

export function getReviewStatusLabel(
	status: CustomerProfileResponseDto["status"],
) {
	const labels: Record<CustomerProfileResponseDto["status"], string> = {
		PENDING: "Pendiente de validacion",
		APPROVED: "Aprobado",
		REJECTED: "Rechazado",
	};

	return labels[status];
}

export function getReviewStatusClasses(
	status: CustomerProfileResponseDto["status"],
) {
	const classes: Record<CustomerProfileResponseDto["status"], string> = {
		PENDING: "border-amber-200 bg-amber-50 text-amber-700",
		APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
		REJECTED: "border-red-200 bg-red-50 text-red-700",
	};

	return classes[status];
}

export function getSafeValue(value: string | null) {
	return value?.trim() ? value : "-";
}

export function getLeadSourceLabel(
	value: CustomerProfileResponseDto["heardAboutUs"],
) {
	return leadSourceLabels[value];
}

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
