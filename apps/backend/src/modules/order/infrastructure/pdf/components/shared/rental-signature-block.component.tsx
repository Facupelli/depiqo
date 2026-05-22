import React from 'react';
import { Image, View, Text } from '@react-pdf/renderer';
import { sharedStyles } from './shared-styles';

interface RentalSignatureBlockProps {
  rentalSignatureUrl: string | null;
}

export function RentalSignatureBlock({ rentalSignatureUrl }: RentalSignatureBlockProps) {
  return (
    <View style={sharedStyles.signatureBlock}>
      <View style={sharedStyles.signatureVisual}>
        <View style={sharedStyles.signatureLine} />
        {rentalSignatureUrl && (
          <View style={sharedStyles.signatureImageFrame}>
            <Image src={rentalSignatureUrl} style={sharedStyles.signatureImage} />
          </View>
        )}
      </View>
      <Text style={sharedStyles.signatureLabel}>FIRMA DEL RESPONSABLE DEL RENTAL</Text>
    </View>
  );
}
