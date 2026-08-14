import React from 'react';
import { Document, DocumentProps } from '@react-pdf/renderer';

import {
  RentalRemitoEquipmentLine,
  RentalRemitoPdfData,
} from '../../../application/rental-remito/rental-remito-pdf-data';
import { LegalAnnexPage } from './legal-annex-page.component';
import { RemitoPage } from './remito-page.component';

const FIRST_PAGE_CONTENT_HEIGHT = 600;
const CONTINUATION_PAGE_CONTENT_HEIGHT = 700;
const ITEM_BASE_HEIGHT = 18;
const ITEM_NAME_LINE_HEIGHT = 14;
const ITEM_SERIAL_NUMBER_LINE_HEIGHT = 12;
const COLUMN_CHAR_WIDTH = 33;
const SERIAL_NUMBER_CHAR_WIDTH = 50;
const ITEM_VERTICAL_GAP = 11;

interface RentalRemitoDocumentProps {
  data: RentalRemitoPdfData;
}

export function createRentalRemitoDocument({
  data,
}: RentalRemitoDocumentProps): React.ReactElement<DocumentProps> {
  const [firstPage, ...continuationPages] = paginateEquipmentLines(data.equipmentLines);

  return (
    <Document>
      <RemitoPage data={data} columns={firstPage ?? { left: [], right: [] }} />
      {continuationPages.map((columns, index) => (
        <RemitoPage key={`continuation-${index}`} data={data} columns={columns} isContinuation />
      ))}
      {data.document.presentation.includeLegalAnnex && (
        <LegalAnnexPage
          logoUrl={data.document.logoUrl}
          rentalSignatureUrl={data.document.rentalSignatureUrl}
          showRentalSignatureBlock={data.document.presentation.showRentalSignatureBlock}
          signedSummary={data.document.signedSummary}
        />
      )}
    </Document>
  );
}

type EquipmentPageColumns = {
  left: RentalRemitoEquipmentLine[];
  right: RentalRemitoEquipmentLine[];
};

function paginateEquipmentLines(lines: RentalRemitoEquipmentLine[]): EquipmentPageColumns[] {
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

    const heightKey = `${targetColumn}Height` as 'leftHeight' | 'rightHeight';

    page[targetColumn].push(line);
    page[heightKey] += itemHeight;
  }

  pages.push({ left: page.left, right: page.right });

  return pages;
}

function createEmptyPage() {
  return {
    left: [] as RentalRemitoEquipmentLine[],
    right: [] as RentalRemitoEquipmentLine[],
    leftHeight: 0,
    rightHeight: 0,
  };
}

function estimateItemHeight(line: RentalRemitoEquipmentLine): number {
  const serialNumbersText = line.serialNumbers.join(' · ');
  const nameText = `x${line.quantity} ${line.name}`;

  const nameLines = Math.max(1, Math.ceil(nameText.length / COLUMN_CHAR_WIDTH));
  const serialNumberLines =
    serialNumbersText.length > 0
      ? Math.max(1, Math.ceil(serialNumbersText.length / SERIAL_NUMBER_CHAR_WIDTH))
      : 0;
  return (
    ITEM_BASE_HEIGHT +
    nameLines * ITEM_NAME_LINE_HEIGHT +
    serialNumberLines * ITEM_SERIAL_NUMBER_LINE_HEIGHT +
    ITEM_VERTICAL_GAP
  );
}
