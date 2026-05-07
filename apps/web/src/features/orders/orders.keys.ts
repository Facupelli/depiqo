import type {
	DraftOrderPricingProposalRequestDto,
	GetCalendarDotsQueryDto,
	GetDraftOrderPricingParamDto,
	GetOrderByIdParamDto,
	GetOrdersCalendarQueryDto,
	GetOrdersQueryDto,
	GetOrdersScheduleQuery,
	OrderPricingPreviewRequestDto,
} from "@repo/schemas";

export const orderKeys = {
	all: () => ["orders"] as const,
	lists: () => [...orderKeys.all(), "list"] as const,
	list: (params: GetOrdersQueryDto) => [...orderKeys.lists(), params] as const,
	details: () => [...orderKeys.all(), "detail"] as const,
	detail: (params: GetOrderByIdParamDto) =>
		[...orderKeys.details(), params] as const,
	schedules: () => [...orderKeys.all(), "schedule"] as const,
	schedule: (params: GetOrdersScheduleQuery) =>
		[...orderKeys.schedules(), params] as const,
	calendars: () => [...orderKeys.all(), "calendar"] as const,
	calendar: (params: GetOrdersCalendarQueryDto) =>
		[...orderKeys.calendars(), params] as const,
	calendarDots: () => [...orderKeys.all(), "calendar-dots"] as const,
	calendarDot: (params: GetCalendarDotsQueryDto) =>
		[...orderKeys.calendarDots(), params] as const,
	drafts: () => [...orderKeys.all(), "drafts"] as const,
	draft: (params: GetDraftOrderPricingParamDto) =>
		[...orderKeys.drafts(), params] as const,
	draftPricingProposals: () =>
		[...orderKeys.all(), "draft-pricing-proposals"] as const,
	draftPricingProposal: (
		params: GetDraftOrderPricingParamDto,
		dto: DraftOrderPricingProposalRequestDto,
	) => [...orderKeys.draftPricingProposals(), params, dto] as const,
	draftPricingUpdates: () =>
		[...orderKeys.all(), "draft-pricing-updates"] as const,
	draftPricingUpdate: (params: GetDraftOrderPricingParamDto) =>
		[...orderKeys.draftPricingUpdates(), params] as const,
	pricingPreviews: () => [...orderKeys.all(), "pricing-previews"] as const,
	pricingPreview: (dto: OrderPricingPreviewRequestDto) =>
		[...orderKeys.pricingPreviews(), dto] as const,
	accessoryPreparations: () =>
		[...orderKeys.all(), "accessory-preparation"] as const,
	accessoryPreparation: (params: GetOrderByIdParamDto) =>
		[...orderKeys.accessoryPreparations(), params] as const,
};
