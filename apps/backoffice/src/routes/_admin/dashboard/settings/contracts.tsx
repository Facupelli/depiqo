import { createFileRoute } from "@tanstack/react-router";
import { ContractSignerSettingsSection } from "@/modules/settings/contract-settings/configure-contract-signer/ContractSignerSettingsSection";

export const Route = createFileRoute("/_admin/dashboard/settings/contracts")({
	component: ContractSignerSettingsSection,
});
