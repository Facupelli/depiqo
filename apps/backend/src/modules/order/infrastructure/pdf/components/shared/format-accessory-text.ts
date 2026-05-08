import { EquipmentLine } from 'src/modules/order/domain/ports/contract-render.port';

export function formatAccessoryText(item: EquipmentLine['includedItems'][number]): string {
  const base = `${item.quantity}x ${item.name}`;
  const assignedIdentifiers = item.assignedAssetIdentifiers.join(', ');
  const pendingQuantity = item.assignedAssetCount === null ? 0 : Math.max(0, item.quantity - item.assignedAssetCount);
  const details = [
    item.notes,
    assignedIdentifiers.length > 0 ? assignedIdentifiers : null,
    pendingQuantity > 0 ? `${pendingQuantity} pendiente${pendingQuantity === 1 ? '' : 's'}` : null,
  ].filter((value): value is string => Boolean(value));

  return details.length > 0 ? `${base} (${details.join('; ')})` : base;
}
