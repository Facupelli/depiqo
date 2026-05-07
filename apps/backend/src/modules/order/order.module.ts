import { Module } from '@nestjs/common';
import { OrderRepository } from './infrastructure/persistence/repositories/order.repository';
import { PricingModule } from '../pricing/pricing.module';
import { CreateOrderService } from './application/commands/create-order/create-order.service';
import { CreateDraftOrderService } from './application/commands/create-draft-order/create-draft-order.service';
import { ConfirmOrderService } from './application/commands/confirm-order/confirm-order.service';
import { ConfirmDraftOrderFlow } from './application/commands/confirm-order/confirm-draft-order.flow';
import { ConfirmPendingReviewOrderFlow } from './application/commands/confirm-order/confirm-pending-review-order.flow';
import { RejectOrderService } from './application/commands/reject-order/reject-order.service';
import { CancelOrderService } from './application/commands/cancel-order/cancel-order.service';
import { MarkEquipmentAsRetiredService } from './application/commands/mark-equipment-as-retired/mark-equipment-as-retired.service';
import { MarkEquipmentAsReturnedService } from './application/commands/mark-equipment-as-returned/mark-equipment-as-returned.service';
import { ExpireOrderService } from './application/commands/expire-order/expire-order.service';
import { UpdateDraftOrderPricingService } from './application/commands/update-draft-order-pricing/update-draft-order-pricing.service';
import { UpdateDraftOrderService } from './application/commands/update-draft-order/update-draft-order.service';
import { EditOrderService } from './application/commands/edit-order/edit-order.service';
import { AssignOrderItemAccessoryAssetsService } from './application/commands/assign-order-item-accessory-assets/assign-order-item-accessory-assets.service';
import { ReplaceOrderItemAccessoriesService } from './application/commands/replace-order-item-accessories/replace-order-item-accessories.service';
import { InventoryModule } from '../inventory/inventory.module';
import { GetOrdersScheduleQueryHandler } from './application/queries/get-orders-schedule/get-orders-schedule.query-handler';
import { GetOrderByIdQueryHandler } from './application/queries/get-order-by-id/get-order-by-id.query-handler';
import { GetCalendarDotsQueryHandler } from './application/queries/get-calendar-dots/get-calendar-dots.query-handler';
import { GetOrdersCalendarQueryHandler } from './application/queries/get-orders-calendar/get-orders-calendar.query-handler';
import { GetPendingReviewOrdersQueryHandler } from './application/queries/get-pending-review-orders/get-pending-review-orders.query-handler';
import { GetOrdersQueryHandler } from './application/queries/get-orders/get-orders.query-handler';
import { GetDraftOrderPricingProposalQueryHandler } from './application/queries/get-draft-order-pricing-proposal/get-draft-order-pricing-proposal.query-handler';
import { PreviewOrderPricingQueryHandler } from './application/queries/preview-order-pricing/preview-order-pricing.query-handler';
import { PrepareOrderAgreementForSigningQueryHandler } from './application/queries/prepare-order-agreement-for-signing/prepare-order-agreement-for-signing.query-handler';
import { PrepareSignedOrderAgreementForSigningQueryHandler } from './application/queries/prepare-signed-order-agreement-for-signing/prepare-signed-order-agreement-for-signing.query-handler';
import { TenantModule } from '../tenant/tenant.module';
import { CreateOrderAssetResolver } from './application/commands/create-order/create-order-asset-resolver';
import { CreateOrderOwnerContractResolver } from './application/commands/create-order/create-order-owner-contract-resolver';
import { CreateOrderHttpController } from './application/commands/create-order/create-order.http.controller';
import { CreateDraftOrderHttpController } from './application/commands/create-draft-order/create-draft-order.http.controller';
import { ConfirmOrderHttpController } from './application/commands/confirm-order/confirm-order.http.controller';
import { UpdateDraftOrderPricingHttpController } from './application/commands/update-draft-order-pricing/update-draft-order-pricing.http.controller';
import { UpdateDraftOrderHttpController } from './application/commands/update-draft-order/update-draft-order.http.controller';
import { EditOrderHttpController } from './application/commands/edit-order/edit-order.http.controller';
import { AssignOrderItemAccessoryAssetsHttpController } from './application/commands/assign-order-item-accessory-assets/assign-order-item-accessory-assets.http.controller';
import { ReplaceOrderItemAccessoriesHttpController } from './application/commands/replace-order-item-accessories/replace-order-item-accessories.http.controller';
import { RejectOrderHttpController } from './application/commands/reject-order/reject-order.http.controller';
import { CancelOrderHttpController } from './application/commands/cancel-order/cancel-order.http.controller';
import { MarkEquipmentAsRetiredHttpController } from './application/commands/mark-equipment-as-retired/mark-equipment-as-retired.http.controller';
import { MarkEquipmentAsReturnedHttpController } from './application/commands/mark-equipment-as-returned/mark-equipment-as-returned.http.controller';
import { GetOrdersScheduleHttpController } from './application/queries/get-orders-schedule/get-orders-schedule.http.controller';
import { GetCalendarDotsHttpController } from './application/queries/get-calendar-dots/get-calendar-dots.http.controller';
import { GetOrdersCalendarHttpController } from './application/queries/get-orders-calendar/get-orders-calendar.http.controller';
import { GetOrderByIdHttpController } from './application/queries/get-order-by-id/get-order-by-id.http.controller';
import { GetPendingReviewOrdersHttpController } from './application/queries/get-pending-review-orders/get-pending-review-orders.http.controller';
import { GetOrdersHttpController } from './application/queries/get-orders/get-orders.http.controller';
import { GenerateOrderContractHttpController } from './application/queries/generate-order-contract/generate-order-contract.http.controller';
import { GenerateOrderBudgetHttpController } from './application/queries/generate-order-budget/generate-order-budget.http.controller';
import { GetDraftOrderPricingProposalHttpController } from './application/queries/get-draft-order-pricing-proposal/get-draft-order-pricing-proposal.http.controller';
import { PreviewOrderPricingHttpController } from './application/queries/preview-order-pricing/preview-order-pricing.http.controller';
import { GenerateOrderContractService } from './application/queries/generate-order-contract/generate-order-contract.service';
import { GenerateSignedOrderContractService } from './application/queries/generate-signed-order-contract/generate-signed-order-contract.service';
import { GenerateOrderBudgetService } from './application/queries/generate-order-budget/generate-order-budget.service';
import { ContractRendererAdapter } from './infrastructure/pdf/contract-renderer.adapter';
import { ContractRendererPort } from './domain/ports/contract-render.port';
import { DraftOrderPricingService } from './domain/services/draft-order-pricing.service';
import { OrderDocumentRendererService } from './application/pdf/order-document-renderer.service';

@Module({
  imports: [PricingModule, InventoryModule, TenantModule],
  controllers: [
    CreateOrderHttpController,
    CreateDraftOrderHttpController,
    ConfirmOrderHttpController,
    UpdateDraftOrderHttpController,
    EditOrderHttpController,
    AssignOrderItemAccessoryAssetsHttpController,
    ReplaceOrderItemAccessoriesHttpController,
    UpdateDraftOrderPricingHttpController,
    RejectOrderHttpController,
    CancelOrderHttpController,
    MarkEquipmentAsRetiredHttpController,
    MarkEquipmentAsReturnedHttpController,
    GetOrdersHttpController,
    GetPendingReviewOrdersHttpController,
    GetOrdersScheduleHttpController,
    GetCalendarDotsHttpController,
    GetOrdersCalendarHttpController,
    GetOrderByIdHttpController,
    GetDraftOrderPricingProposalHttpController,
    PreviewOrderPricingHttpController,
    GenerateOrderContractHttpController,
    GenerateOrderBudgetHttpController,
  ],
  providers: [
    OrderRepository,
    CreateOrderAssetResolver,
    CreateOrderOwnerContractResolver,
    CreateOrderService,
    CreateDraftOrderService,
    DraftOrderPricingService,
    ConfirmDraftOrderFlow,
    ConfirmPendingReviewOrderFlow,
    ConfirmOrderService,
    UpdateDraftOrderService,
    EditOrderService,
    AssignOrderItemAccessoryAssetsService,
    ReplaceOrderItemAccessoriesService,
    UpdateDraftOrderPricingService,
    RejectOrderService,
    CancelOrderService,
    MarkEquipmentAsRetiredService,
    MarkEquipmentAsReturnedService,
    ExpireOrderService,
    GetOrdersScheduleQueryHandler,
    GetCalendarDotsQueryHandler,
    GetOrdersCalendarQueryHandler,
    GetOrderByIdQueryHandler,
    GetDraftOrderPricingProposalQueryHandler,
    PreviewOrderPricingQueryHandler,
    GetPendingReviewOrdersQueryHandler,
    GetOrdersQueryHandler,
    PrepareOrderAgreementForSigningQueryHandler,
    PrepareSignedOrderAgreementForSigningQueryHandler,
    OrderDocumentRendererService,
    GenerateOrderContractService,
    GenerateSignedOrderContractService,
    GenerateOrderBudgetService,
    {
      provide: ContractRendererPort,
      useClass: ContractRendererAdapter,
    },
  ],
})
export class OrderModule {}
