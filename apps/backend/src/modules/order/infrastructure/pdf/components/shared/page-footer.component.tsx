import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { sharedStyles } from './shared-styles';

export function PageFooter() {
  return (
    <View style={sharedStyles.pageFooter} fixed>
      <Text style={sharedStyles.footerText}>2026. GUARIDA RENTAL. MADRID, ESPAÑA.</Text>
      <Text style={sharedStyles.footerText}>Telefono de contacto: 680 870 274</Text>
      <Text style={sharedStyles.footerText}>www.guaridarental.com - guaridarental@gmail.com</Text>
    </View>
  );
}
