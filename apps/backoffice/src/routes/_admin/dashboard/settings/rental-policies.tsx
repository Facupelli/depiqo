import { createFileRoute } from "@tanstack/react-router";
import { SettingsConfigurationSection } from "@/modules/settings/business-configuration/SettingsConfigurationSection";

export const Route = createFileRoute(
	"/_admin/dashboard/settings/rental-policies",
)({
	component: RentalPoliciesScreen,
});

function RentalPoliciesScreen() {
	return <SettingsConfigurationSection section="rental-policies" />;
}
