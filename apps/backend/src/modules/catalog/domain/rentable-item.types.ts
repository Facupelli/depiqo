export const CATALOG_RENTABLE_ITEM_KINDS = ['SINGLE', 'PACKAGE', 'KIT', 'BUNDLE'] as const;
export type CatalogRentableItemKind = (typeof CATALOG_RENTABLE_ITEM_KINDS)[number];

export const CATALOG_RENTABLE_ITEM_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;
export type CatalogRentableItemStatus = (typeof CATALOG_RENTABLE_ITEM_STATUSES)[number];
