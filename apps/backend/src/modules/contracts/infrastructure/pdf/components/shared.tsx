import React from 'react';
import { Image, StyleSheet, Text, View } from '@react-pdf/renderer';

import { SignedContractSummary } from '../../../application/rental-remito/rental-remito-pdf-data';

export const A4_PAGE_SIZE = { width: 595.28, height: 841.89 } as const;

export const sharedStyles = StyleSheet.create({
  page: {
    paddingTop: 8,
    paddingBottom: 38,
    paddingHorizontal: 26,
    fontSize: 8.5,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 20,
  },
  signatureBlock: {
    width: '38%',
  },
  digitalSignatureBlock: {
    width: '38%',
  },
  digitalSignatureVisual: {
    height: 40,
    marginBottom: 6,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  digitalSignatureLine: {
    borderBottom: '1pt solid #111111',
    marginBottom: 6,
  },
  digitalSignatureLabel: {
    fontSize: 7.8,
    color: '#111',
    textAlign: 'center',
  },
  digitalSignatureImage: {
    width: 190,
    height: 36,
    objectFit: 'contain',
  },
  signatureVisual: {
    position: 'relative',
    height: 40,
    marginBottom: 10,
    justifyContent: 'flex-end',
  },
  signatureLine: {
    borderBottom: '1pt solid #1a1a1a',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  signatureImageFrame: {
    alignSelf: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    marginBottom: 4,
  },
  signatureImage: {
    width: 200,
    height: 200,
    objectFit: 'contain',
  },
  signatureLabel: {
    fontSize: 7.8,
    color: '#111',
    textAlign: 'center',
  },
  pageFooter: {
    position: 'absolute',
    bottom: 12,
    left: 54,
    right: 54,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#111',
    paddingTop: 4,
  },
  footerText: {
    maxWidth: '33%',
    textAlign: 'center',
    color: '#737373',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    minHeight: 34,
  },
  headerLogo: {
    width: 145,
    height: 62,
    objectFit: 'contain',
  },
  headerLogoPlaceholder: {
    width: 145,
    height: 62,
  },
  headerLine: {
    flex: 1,
    borderTop: '2pt solid #111111',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerRightContent: {
    width: '100%',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  frame: {
    border: '2pt solid #111111',
    borderRadius: 14,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  frameContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
});

export function HeaderLogo({ logoUrl }: { logoUrl: string | null }) {
  if (!logoUrl) {
    return <View style={sharedStyles.headerLogoPlaceholder} />;
  }

  return <Image src={logoUrl} style={sharedStyles.headerLogo} />;
}

export function PageFooter() {
  return (
    <View style={sharedStyles.pageFooter} fixed>
      <Text style={sharedStyles.footerText}>2026. GUARIDA RENTAL. MADRID, ESPAÑA.</Text>
      <Text style={sharedStyles.footerText}>Telefono de contacto: 680 870 274</Text>
      <Text style={sharedStyles.footerText}>www.guaridarental.com - guaridarental@gmail.com</Text>
    </View>
  );
}

export function RentalSignatureBlock({ rentalSignatureUrl }: { rentalSignatureUrl: string | null }) {
  return (
    <View style={sharedStyles.signatureBlock}>
      <View style={sharedStyles.signatureVisual}>
        <View style={sharedStyles.signatureLine} />
        {rentalSignatureUrl ? (
          <View style={sharedStyles.signatureImageFrame}>
            <Image src={rentalSignatureUrl} style={sharedStyles.signatureImage} />
          </View>
        ) : null}
      </View>
      <Text style={sharedStyles.signatureLabel}>FIRMA DEL RESPONSABLE DEL RENTAL</Text>
    </View>
  );
}

export function EmptyCustomerSignatureBlock() {
  return (
    <View style={sharedStyles.signatureBlock}>
      <View style={sharedStyles.signatureVisual}>
        <View style={sharedStyles.signatureLine} />
      </View>
      <Text style={sharedStyles.signatureLabel}>FIRMA DEL RESPONSABLE DE PRODUCCIÓN</Text>
    </View>
  );
}

export function ElectronicAcceptanceBlock({ summary }: { summary: SignedContractSummary }) {
  return (
    <View style={sharedStyles.digitalSignatureBlock}>
      <View style={sharedStyles.digitalSignatureVisual}>
        <Image src={summary.signatureImageDataUrl} style={sharedStyles.digitalSignatureImage} />
      </View>
      <View style={sharedStyles.digitalSignatureLine} />
      <Text style={sharedStyles.digitalSignatureLabel}>FIRMA DIGITAL DEL ARRENDATARIO</Text>
    </View>
  );
}
