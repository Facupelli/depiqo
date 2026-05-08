import React from 'react';
import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { ContractData, EquipmentLine } from 'src/modules/order/domain/ports/contract-render.port';
import { A4_PAGE_SIZE } from './shared/page-constants';
import { formatAccessoryText } from './shared/format-accessory-text';
import { sharedStyles } from './shared/shared-styles';
import { ElectronicAcceptanceBlock } from './shared/electronic-acceptance-block.component';
import { PageFooter } from './shared/page-footer.component';
import { RentalSignatureBlock } from './shared/rental-signature-block.component';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  // ── Header ────────────────────────────────────────────────────────────────
  headerCenterEmpty: {
    height: 24,
  },
  logo: {
    width: 145,
    height: 62,
    objectFit: 'contain',
  },
  logoPlaceholder: {
    width: 145,
    height: 62,
  },
  remitoNumber: {
    fontSize: 10,
    color: '#111',
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
  sectionDivider: {
    borderTop: '2pt solid #111111',
    marginHorizontal: -16,
    marginVertical: 12,
  },
  divider: {
    borderTop: '2pt solid #111111',
    marginHorizontal: -16,
    marginVertical: 12,
  },

  // ── Equipment list ────────────────────────────────────────────────────────
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
    color: '#111',
    lineHeight: 1.35,
  },
});

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RemitoPageProps {
  data: ContractData;
  columns: {
    left: EquipmentLine[];
    right: EquipmentLine[];
  };
  isContinuation?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RemitoPage({ data, columns, isContinuation = false }: RemitoPageProps) {
  const { document } = data;
  const signedSummary = document.signedSummary;

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

                <View style={s.sectionDivider} />

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
                        <Text style={s.infoValue}>{document.agreedPrice}</Text>
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
            {signedSummary ? (
              <ElectronicAcceptanceBlock summary={signedSummary} />
            ) : (
              <View style={sharedStyles.signatureBlock}>
                <View style={sharedStyles.signatureVisual}>
                  <View style={sharedStyles.signatureLine} />
                </View>
                <Text style={sharedStyles.signatureLabel}>FIRMA DEL RESPONSABLE DE PRODUCCIÓN</Text>
              </View>
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

// ---------------------------------------------------------------------------
// Equipment line sub-component
// ---------------------------------------------------------------------------

function EquipmentLineItem({ line }: { line: EquipmentLine }) {
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

function PartyInfoBlock({ title, party }: { title: string; party: ContractData['document']['landlord'] }) {
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
