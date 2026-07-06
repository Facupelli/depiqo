type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };

export type RentalId = Brand<string, 'RentalId'>;
export type RentalSelectionId = Brand<string, 'RentalSelectionId'>;
export type AssetId = Brand<string, 'AssetId'>;
export type EquipmentTypeId = Brand<string, 'EquipmentTypeId'>;
export type RentalOfferId = Brand<string, 'RentalOfferId'>;
