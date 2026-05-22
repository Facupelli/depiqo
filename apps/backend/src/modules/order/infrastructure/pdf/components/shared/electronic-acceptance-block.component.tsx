import React from 'react';
import { Image, View, Text } from '@react-pdf/renderer';
import { SignedContractSummary } from 'src/modules/order/domain/ports/contract-render.port';
import { sharedStyles } from './shared-styles';

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
