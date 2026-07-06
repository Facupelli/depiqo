import { Injectable } from '@nestjs/common';

/*
 * Legacy order notification handler disabled during v2 module flattening.
 *
 * This handler depended on:
 * - src/modules/order/public/events/order-cancelled.event
 * - v2 tenant-management public API
 *
 * Keep this file as a placeholder until rental-commitment emits the replacement
 * event and the notification flow is reintroduced against the new boundaries.
 */
@Injectable()
export class SendOrderCancelledNotificationHandler {}
