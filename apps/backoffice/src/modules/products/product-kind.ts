import type { GetRentableItemDetailResponseDto } from "@repo/api-contracts";

export const comboKinds = ["PACKAGE", "KIT", "BUNDLE"] as const;

export function isComboKind(
	kind: GetRentableItemDetailResponseDto["kind"],
): kind is (typeof comboKinds)[number] {
	return (comboKinds as readonly string[]).includes(kind);
}
