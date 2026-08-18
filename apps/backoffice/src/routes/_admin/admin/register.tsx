import { createFileRoute } from "@tanstack/react-router";
import { RegisterBusinessPage } from "@/onboarding/register-business/RegisterBusinessPage";

export const Route = createFileRoute("/_admin/admin/register")({
	component: RegisterBusinessPage,
});
