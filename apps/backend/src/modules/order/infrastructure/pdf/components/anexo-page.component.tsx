import React from 'react';
import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';

import { SignedContractSummary } from 'src/modules/order/domain/ports/contract-render.port';
import { A4_PAGE_SIZE } from './shared/page-constants';
import { sharedStyles } from './shared/shared-styles';
import { ElectronicAcceptanceBlock } from './shared/electronic-acceptance-block.component';
import { PageFooter } from './shared/page-footer.component';
import { RentalSignatureBlock } from './shared/rental-signature-block.component';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  anexoLabel: {
    fontSize: 10,
    color: '#111',
    textAlign: 'right',
    marginBottom: 2,
  },

  intro: {
    marginBottom: 8,
    fontSize: 8,
    lineHeight: 1.25,
  },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    marginBottom: 2,
  },
  sectionIntro: {
    fontSize: 7.35,
    lineHeight: 1.2,
    marginBottom: 3,
  },
  clause: {
    marginBottom: 2,
    fontSize: 7.35,
    lineHeight: 1.2,
  },
  paragraph: {
    fontSize: 7.35,
    lineHeight: 1.2,
    marginBottom: 4,
  },

  conformityLine: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.8,
    marginTop: 8,
    marginBottom: 2,
  },
});

// ---------------------------------------------------------------------------
// Static clauses
// ---------------------------------------------------------------------------

const GENERAL_CONDITIONS_INTRO =
  'Las siguientes cláusulas reguladoras de la responsabilidad mutua entre ambas partes constituyen condición sine qua non del contrato, sin las cuales Federico Giaccaglia (NIE Y9940697L) en adelante GUARIDA RENTAL, no consentiría en obligarse:';

const GENERAL_CONDITIONS = [
  'El material alquilado y sus accesorios, objeto del presente contrato, son titularidad exclusiva de GUARIDA RENTAL.',
  'GUARIDA RENTAL se reserva el derecho de alquilar el material y sus accesorios exclusivamente a profesionales del sector audiovisual, o profesionales que estén directamente relacionados con él.',
  'GUARIDA RENTAL no proporcionará a la parte arrendataria ninguna información o formación sobre el funcionamiento de los equipos.',
  'Entrega y devolución del equipo: El arrendador entrega al arrendatario el equipo contratado en perfectas condiciones de estado e inventario, asimismo, el arrendatario se compromete a devolverlo en perfectas condiciones en la fecha y hora de devolución pactadas.',
  'Desperfectos en la devolución del material: En aquellos casos en los que no estén incluidos en el seguro, la parte arrendataria estará obligada a abonar íntegramente el importe del mismo material nuevo, según los precios de mercado dentro de los 15 días naturales posteriores a la fecha de devolución pactada.',
  'Devolución del material en plazo: Los retrasos en la devolución del material alquilado que no hayan sido aceptados por escrito por GUARIDA RENTAL, deberán ser abonados en razón de tarifa de "1 día" por cada 24 horas de demora, a los que no será aplicable ningún tipo de descuento y que vienen reflejados en la página web: www.guaridarental.com. En aquellos casos en que la demora sea superior a 72 horas, GUARIDA RENTAL además de requerir el pago de la tarifa diaria enunciada anteriormente, procederá de inmediato a emprender las acciones legales oportunas.',
  'Avería dentro del período de alquiler: GUARIDA RENTAL no asume responsabilidad alguna de sustitución del equipo derivado de un mal uso del mismo. En caso de reconocerse derecho de sustitución, éste estará sujeto a disponibilidad de la empresa arrendadora.',
  'Modificaciones en el equipo: El cliente arrendatario no podrá modificar, desmontar o reparar el equipo objeto de alquiler ni vender, empeñar o desprenderse del equipo ni sus accesorios, bajo apercibimiento de las responsabilidades inherentes a tales actuaciones.',
  'Responsabilidad por daños ocasionados en el equipo: Aquellos daños ocasionados en el equipo, derivados de su mala utilización serán de responsabilidad exclusiva del cliente arrendatario.',
  'Responsabilidad civil por daños ocasionados a terceras personas: El cliente arrendatario es enteramente responsable de los daños causados por el hecho de una mala utilización. GUARIDA RENTAL declina toda responsabilidad en los casos en que el material alquilado pudiera provocar un accidente.',
  'Salida del país del material alquilado: El arrendatario a fecha de suscripción o en cualquier momento posterior deberá comunicar la salida de los equipos al extranjero dentro del período de arrendamiento. Las gestiones relativas a esta salida correrán a cargo del arrendatario íntegramente.',
  'Responsabilidad derivada de la LOPD: La responsabilidad derivada de las acciones que pudieren realizarse al amparo de la Ley Orgánica 15/1999, de 13 de Diciembre, de Protección de Datos de carácter personal, como resultado de las grabaciones obtenidas o de la pérdida de información no será, en ningún caso de GUARIDA RENTAL. El cliente arrendatario responderá de cuantas acciones se interpongan en tales conceptos.',
  'Sumisión expresa a los Tribunales de Madrid: El cumplimiento o interpretación de las condiciones aquí presentes, en caso de discrepancia, serán competencia de los Tribunales de Madrid, quedando de tal forma renunciado expresamente el fuero propio que pudiera corresponder al cliente arrendatario.',
];

const INSURANCE_TEXT =
  'En caso de contratar el servicio de seguro de equipo: Los equipos alquilados tienen cobertura durante los viajes que se realicen en coche entre dos puntos cualesquiera de España. También durante el montaje y rodaje en caso de robo, incendio, roturas, daños por agua. Como aplicación y/o aclaración, se establece que el riesgo de robo del interés asegurado quedará garantizado durante los estacionamientos de corta duración de los vehículos en la vía pública, siempre y cuando los objetos asegurados no estuviesen expuestos a la vista desde el exterior y hubieran quedado debidamente cerrados los accesos al vehículo, accediendo al interior de éstos mediante fractura de puertas, cerraduras y/o ventillas. Asimismo, cuando los equipos asegurados pernocten a bordo de los vehículos en aparcamientos, garajes u otros lugares cerrados, éstos deberán estar debidamente vigilados. Caso de producirse un evento de esta naturaleza, deberá ser puesto de inmediato en conocimiento de la Comisaría de Policía más próxima al lugar donde se produjo el hecho. Se hace constar de forma expresa que quedan excluidos de la cobertura las averías o daños debidos al uso, impericia, negligencia, daños eléctricos y magnéticos, rozaduras y/o arañazos, daños al software, defectos latentes, hurto, estafa, apropiación indebida, uso en dron y daños por contaminación biológica y/o química, siendo el cliente arrendatario quien deba asumir los gastos de reparación o de reemplazo con un material nuevo, siempre dentro de 10 días desde la fecha pactada para la devolución. El presente seguro tiene un franquicia a cargo del cliente arrendatario de 150 €.';

const DATA_PROTECTION_TEXT =
  'En GUARIDA RENTAL tratamos la información que nos facilita con el fin de prestarles el servicio solicitado y realizar su facturación. Los datos proporcionados se conservarán mientras se mantenga la relación comercial o durante el tiempo necesario para cumplir con las obligaciones legales y atender las posibles responsabilidades que pudieran derivar del cumplimiento de la finalidad para la que los datos fueron recabados. Los datos no se cederán a terceros salvo en los casos en que exista una obligación legal. Usted tiene derecho a obtener información sobre si en GUARIDA RENTAL estamos tratando sus datos personales, por lo que puede ejercer sus derechos de acceso, rectificación, supresión y portabilidad de datos y oposición y limitación a su tratamiento ante GUARIDA RENTAL o en la dirección de correo electrónico guaridarental@gmail.com, adjuntando copia de su DNI o documento equivalente. Asimismo, y especialmente si considera que no ha obtenido satisfacción plena en el ejercicio de sus derechos, podrá presentar una reclamación ante la autoridad nacional de control dirigiéndose a estos efectos a la Agencia Española de Protección de Datos, C/ Jorge Juan, 6 – 28001 Madrid. Igualmente, solicitamos su autorización para ofrecerle productos y servicios relacionados con los contratados y fidelizarle como cliente.';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AnexoPageProps {
  logoUrl: string | null;
  rentalSignatureUrl: string | null;
  showRentalSignatureBlock: boolean;
  signedSummary?: SignedContractSummary;
}

export function AnexoPage({
  logoUrl: _logoUrl,
  rentalSignatureUrl,
  showRentalSignatureBlock,
  signedSummary,
}: AnexoPageProps) {
  return (
    <Page size={A4_PAGE_SIZE} style={sharedStyles.page} wrap={false}>
      <View style={sharedStyles.headerRow}>
        <View style={sharedStyles.headerRight}>
          <View style={sharedStyles.headerRightContent}>
            <Text style={s.anexoLabel}>ANEXO I</Text>
          </View>
        </View>
      </View>

      <View style={[sharedStyles.frame, { height: 690 }]}>
        <View style={sharedStyles.frameContent}>
          <View>
            <Text style={s.intro}>
              Este anexo tiene como fin establecer las condiciones de alquiler de equipos solicitados por el cliente,
              dejando claras las responsabilidades de cada parte, y funcionando como contrato entre las partes abajo
              firmantes.
            </Text>

            <Text style={s.sectionTitle}>Condiciones generales de contratación</Text>
            <Text style={s.sectionIntro}>{GENERAL_CONDITIONS_INTRO}</Text>

            {GENERAL_CONDITIONS.map((text, index) => (
              <Text key={index} style={s.clause}>
                {index + 1}. {text}
              </Text>
            ))}

            <Text style={s.sectionTitle}>Seguro</Text>
            <Text style={s.paragraph}>{INSURANCE_TEXT}</Text>

            <Text style={s.sectionTitle}>Protección de datos</Text>
            <Text style={s.paragraph}>{DATA_PROTECTION_TEXT}</Text>

            <Text style={s.conformityLine}>SE FIRMA ESTE EJEMPLAR EXPRESANDO CONFORMIDAD DE AMBAS PARTES.</Text>
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
            {showRentalSignatureBlock && <RentalSignatureBlock rentalSignatureUrl={rentalSignatureUrl} />}
          </View>
        </View>
      </View>

      <PageFooter />
    </Page>
  );
}
