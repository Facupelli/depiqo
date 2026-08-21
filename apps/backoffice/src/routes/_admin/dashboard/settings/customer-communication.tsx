import { createFileRoute } from "@tanstack/react-router";
import { SettingsConfigurationSection } from "@/modules/settings/business-configuration/SettingsConfigurationSection";

export const Route = createFileRoute(
	"/_admin/dashboard/settings/customer-communication",
)({
	component: CustomerCommunicationScreen,
});

function CustomerCommunicationScreen() {
	return <SettingsConfigurationSection section="customer-communication" />;
}
