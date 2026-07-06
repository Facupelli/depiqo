import React from 'react';
import { Page, StyleSheet, Text, View } from '@react-pdf/renderer';

import {
  ContractPartyData,
  RentalRemitoEquipmentLine,
  RentalRemitoPdfData,
} from '../../../application/rental-remito/rental-remito-pdf-data';
import {
  A4_PAGE_SIZE,
  ElectronicAcceptanceBlock,
  EmptyCustomerSignatureBlock,
  formatAccessoryText,
  PageFooter,
  RentalSignatureBlock,
  sharedStyles,
} from './shared';

const s = StyleSheet.create({
  headerCenterEmpty: {
    height: 24,
  },
  remitoNumber: {
    fontSize: 10,
    color: '#111111',
    textAlign: 'right',
    marginBottom: 2,
  },
  frameFirstPage: {
    height: 690,
  },
  frameContinuationPage: {
    height: 722,
  },
  frameTopContent: {
    flexShrink: 0,
  },
  infoSection: {
    paddingBottom: 0,
  },
  partySection: {
    paddingBottom: 9,
  },
  partyRowGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  partyCell: {
    width: '47%',
  },
  partyTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    marginBottom: 6,
  },
  partyLine: {
    fontSize: 11,
    marginBottom: 3,
  },
  partyLineValue: {
    fontFamily: 'Helvetica-Bold',
  },
  infoRowGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  infoCell: {
    width: '47%',
  },
  infoInline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoLabel: {
    fontSize: 11,
    marginRight: 4,
  },
  infoValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
  },
  infoNote: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
  },
  divider: {
    borderTop: '2pt solid #111111',
    marginHorizontal: -16,
    marginVertical: 12,
  },
  equipmentSection: {
    flexGrow: 1,
  },
  equipmentTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 13,
    marginBottom: 14,
  },
  equipmentGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  equipmentColumn: {
    width: '48%',
  },
  equipmentItem: {
    width: '100%',
    paddingRight: 0,
    marginBottom: 11,
  },
  equipmentName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10.5,
    lineHeight: 1.25,
    marginBottom: 2,
  },
  equipmentAccessories: {
    fontSize: 8.8,
    color: '#111111',
    lineHeight: 1.35,
  },
});

interface RemitoPageProps {
  data: RentalRemitoPdfData;
  columns: {
    left: RentalRemitoEquipmentLine[];
    right: RentalRemitoEquipmentLine[];
  };
  isContinuation?: boolean;
}

export function RemitoPage({ data, columns, isContinuation = false }: RemitoPageProps) {
  const { document } = data;

  return (
    <Page size={A4_PAGE_SIZE} style={sharedStyles.page} wrap={false}>
      {!isContinuation && (
        <View style={sharedStyles.headerRow} fixed>
          <View />
          <View style={sharedStyles.headerRight}>
            <View style={sharedStyles.headerRightContent}>
              <Text style={s.remitoNumber}>
                {document.label} N° {document.number}
              </Text>
            </View>
          </View>
        </View>
      )}

      {isContinuation && <View style={s.headerCenterEmpty} />}

      <View style={[sharedStyles.frame, isContinuation ? s.frameContinuationPage : s.frameFirstPage]}>
        <View style={sharedStyles.frameContent}>
          <View style={s.frameTopContent}>
            {!isContinuation && (
              <View style={s.infoSection}>
                <View style={s.partySection}>
                  <View style={s.partyRowGrid}>
                    <PartyInfoBlock title="ARRENDADOR" party={document.landlord} />
                    <PartyInfoBlock title="ARRENDATARIO" party={document.tenant} />
                  </View>
                </View>

                <View style={s.divider} />

                <View>
                  <View style={s.infoRowGrid}>
                    <View style={s.infoCell}>
                      <View style={s.infoInline}>
                        <Text style={s.infoLabel}>FECHA DE RETIRO:</Text>
                        <Text style={s.infoValue}>{document.pickupDate}</Text>
                      </View>
                    </View>

                    <View style={s.infoCell}>
                      <View style={s.infoInline}>
                        <Text style={s.infoLabel}>PRECIO ACORDADO:</Text>
                        <Text style={s.infoValue}>{document.agreedPrice} + IVA</Text>
                      </View>
                    </View>
                  </View>

                  <View style={s.infoRowGrid}>
                    <View style={s.infoCell}>
                      <View style={s.infoInline}>
                        <Text style={s.infoLabel}>FECHA DE DEVOLUCIÓN:</Text>
                        <Text style={s.infoValue}>{document.returnDate}</Text>
                      </View>
                    </View>

                    <View style={s.infoCell}>
                      <Text style={s.infoNote}>IMPORTANTE: VER CONDICIONES ANEXO I</Text>
                    </View>
                  </View>

                  <View style={s.infoRowGrid}>
                    <View style={s.infoCell}>
                      <View style={s.infoInline}>
                        <Text style={s.infoLabel}>CANTIDAD DE JORNADAS:</Text>
                        <Text style={s.infoValue}>{document.jornadas}</Text>
                      </View>
                    </View>

                    <View style={s.infoCell} />
                  </View>
                </View>
              </View>
            )}

            {!isContinuation && <View style={s.divider} />}

            <View style={s.equipmentSection}>
              {!isContinuation && <Text style={s.equipmentTitle}>{document.equipmentTitle}</Text>}

              <View style={s.equipmentGrid}>
                <View style={s.equipmentColumn}>
                  {columns.left.map((line, index) => (
                    <EquipmentLineItem key={`left-${index}`} line={line} />
                  ))}
                </View>

                <View style={s.equipmentColumn}>
                  {columns.right.map((line, index) => (
                    <EquipmentLineItem key={`right-${index}`} line={line} />
                  ))}
                </View>
              </View>
            </View>
          </View>

          <View style={sharedStyles.signatureRow}>
            {document.signedSummary ? (
              <ElectronicAcceptanceBlock summary={document.signedSummary} />
            ) : (
              <EmptyCustomerSignatureBlock />
            )}

            {document.showRentalSignatureBlock && (
              <RentalSignatureBlock rentalSignatureUrl={document.rentalSignatureUrl} />
            )}
          </View>
        </View>
      </View>

      <PageFooter />
    </Page>
  );
}

function EquipmentLineItem({ line }: { line: RentalRemitoEquipmentLine }) {
  const accessoryText = line.includedItems.map(formatAccessoryText).join(', ');

  return (
    <View style={s.equipmentItem} wrap={false}>
      <Text style={s.equipmentName}>
        x{line.quantity} {line.name}
      </Text>
      {accessoryText.length > 0 && <Text style={s.equipmentAccessories}>Con {accessoryText}</Text>}
    </View>
  );
}

function PartyInfoBlock({ title, party }: { title: string; party: ContractPartyData }) {
  return (
    <View style={s.partyCell}>
      <Text style={s.partyTitle}>{title}</Text>
      <Text style={s.partyLine}>
        <Text style={s.partyLineValue}>{party.fullName}</Text>
      </Text>
      <Text style={s.partyLine}>
        <Text style={s.partyLineValue}>{party.documentNumber}</Text>
      </Text>
      <Text style={s.partyLine}>
        <Text style={s.partyLineValue}>{party.address}</Text>
      </Text>
      <Text style={s.partyLine}>
        <Text style={s.partyLineValue}>{party.phone}</Text>
      </Text>
    </View>
  );
}
