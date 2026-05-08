import React from 'react';
import { Document, DocumentProps } from '@react-pdf/renderer';
import { ContractData, EquipmentLine } from 'src/modules/order/domain/ports/contract-render.port';
import { formatAccessoryText } from './shared/format-accessory-text';
import { RemitoPage } from './remito-page.component';
import { AnexoPage } from './anexo-page.component';

const FIRST_PAGE_CONTENT_HEIGHT = 600;
const CONTINUATION_PAGE_CONTENT_HEIGHT = 700;
const ITEM_BASE_HEIGHT = 18;
const ITEM_NAME_LINE_HEIGHT = 14;
const ITEM_ACCESSORY_LINE_HEIGHT = 12;
const COLUMN_CHAR_WIDTH = 33;
const ACCESSORY_CHAR_WIDTH = 50;
const ITEM_VERTICAL_GAP = 11;

// ---------------------------------------------------------------------------
// ContractDocument
// ---------------------------------------------------------------------------
// Assembles the full rental contract PDF:
//   - One RemitoPage with the equipment list (the renderer paginates naturally
//     if the list overflows — @react-pdf/renderer inserts continuation pages
//     automatically when `wrap` is enabled on the Page)
//   - One AnexoPage — always the last page, always static
// ---------------------------------------------------------------------------

interface ContractDocumentProps {
  data: ContractData;
}

export function createContractDocument({ data }: ContractDocumentProps): React.ReactElement<DocumentProps> {
  const [firstPage, ...continuationPages] = paginateEquipmentLines(data.equipmentLines);

  return (
    <Document>
      <RemitoPage data={data} columns={firstPage ?? { left: [], right: [] }} />
      {continuationPages.map((columns, index) => (
        <RemitoPage key={`continuation-${index}`} data={data} columns={columns} isContinuation />
      ))}
      <AnexoPage
        logoUrl={data.document.logoUrl}
        rentalSignatureUrl={data.document.rentalSignatureUrl}
        showRentalSignatureBlock={data.document.showRentalSignatureBlock}
        signedSummary={data.document.signedSummary}
      />
    </Document>
  );
}

type EquipmentPageColumns = {
  left: EquipmentLine[];
  right: EquipmentLine[];
};

function paginateEquipmentLines(lines: EquipmentLine[]): EquipmentPageColumns[] {
  const pages: EquipmentPageColumns[] = [];
  let page = createEmptyPage();
  let maxHeight = FIRST_PAGE_CONTENT_HEIGHT;

  for (const line of lines) {
    const itemHeight = estimateItemHeight(line);
    const targetColumn = page.leftHeight <= page.rightHeight ? 'left' : 'right';
    const nextColumnHeight = page[`${targetColumn}Height`] + itemHeight;

    if ((page.left.length > 0 || page.right.length > 0) && nextColumnHeight > maxHeight) {
      pages.push({ left: page.left, right: page.right });
      page = createEmptyPage();
      maxHeight = CONTINUATION_PAGE_CONTENT_HEIGHT;
    }

    const columnKey = targetColumn;
    const heightKey = `${targetColumn}Height` as 'leftHeight' | 'rightHeight';

    page[columnKey].push(line);
    page[heightKey] += itemHeight;
  }

  pages.push({ left: page.left, right: page.right });

  return pages;
}

function createEmptyPage() {
  return {
    left: [] as EquipmentLine[],
    right: [] as EquipmentLine[],
    leftHeight: 0,
    rightHeight: 0,
  };
}

function estimateItemHeight(line: EquipmentLine): number {
  const accessoriesText = line.includedItems.map(formatAccessoryText).join(', ');

  const nameText = `x${line.quantity} ${line.name}`;
  const nameLines = Math.max(1, Math.ceil(nameText.length / COLUMN_CHAR_WIDTH));
  const accessoryLines =
    accessoriesText.length > 0 ? Math.max(1, Math.ceil(`Con ${accessoriesText}`.length / ACCESSORY_CHAR_WIDTH)) : 0;

  return (
    ITEM_BASE_HEIGHT +
    nameLines * ITEM_NAME_LINE_HEIGHT +
    accessoryLines * ITEM_ACCESSORY_LINE_HEIGHT +
    ITEM_VERTICAL_GAP
  );
}
