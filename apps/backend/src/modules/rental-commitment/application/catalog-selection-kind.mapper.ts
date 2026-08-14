import { CatalogRentableItemKind } from 'src/modules/catalog/public-api/catalog-selection-resolution.public-api';

import { RentableItemKind } from '../domain/rental-status';

export function toRentalSelectionKind(kind: CatalogRentableItemKind): RentableItemKind {
  switch (kind) {
    case 'SINGLE':
      return RentableItemKind.Single;
    case 'PACKAGE':
      return RentableItemKind.Package;
    case 'KIT':
      return RentableItemKind.Kit;
    case 'BUNDLE':
      return RentableItemKind.Bundle;
  }
}
