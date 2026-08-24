export enum RentalStatus {
  Pending = 'PENDING',
  Draft = 'DRAFT',
  Confirmed = 'CONFIRMED',
  Cancelled = 'CANCELLED',
  Completed = 'COMPLETED',
}

export enum RentalSource {
  Staff = 'STAFF',
  WhatsAppFlow = 'WHATSAPP_FLOW',
  Formal = 'FORMAL',
}

export enum FulfillmentMethod {
  Pickup = 'PICKUP',
  Delivery = 'DELIVERY',
}

export enum RentableItemKind {
  Single = 'SINGLE',
  Package = 'PACKAGE',
  Kit = 'KIT',
  Bundle = 'BUNDLE',
}

export enum AssetBlockType {
  Equipment = 'EQUIPMENT',
  Accessory = 'ACCESSORY',
}

export enum SelectedAccessoryStatus {
  Suggested = 'SUGGESTED',
  Selected = 'SELECTED',
  Removed = 'REMOVED',
  PartiallyAvailable = 'PARTIALLY_AVAILABLE',
}

export enum RentalOwnerSplitStatus {
  Pending = 'PENDING',
  Confirmed = 'CONFIRMED',
  Void = 'VOID',
  Settled = 'SETTLED',
}
