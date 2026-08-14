import { Column, Heading, Row, Section, Text } from 'react-email';
import * as React from 'react';

import { RentalEmailFulfillmentMethod, RentalEmailStatus } from '../../../../application/ports/email-renderer.port';

import { emailTheme } from '../../react-email/email-theme';

type RentalConfirmedConfirmationEmailContentProps = {
  rentalNumber: number | string;
  status: RentalEmailStatus;
  fulfillmentMethod: RentalEmailFulfillmentMethod;
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;
  introTitle?: string;
  introText?: string;
};

const styles = {
  introTitle: {
    margin: '0 0 12px',
    fontSize: '40px',
    lineHeight: '44px',
    fontWeight: 700,
    color: emailTheme.colors.text,
  },
  introText: {
    margin: '0 0 32px',
    fontSize: '18px',
    lineHeight: '30px',
    color: emailTheme.colors.mutedText,
  },
  card: {
    marginBottom: '32px',
    padding: '24px 28px',
    borderRadius: '16px',
    backgroundColor: emailTheme.colors.mutedSurface,
    border: `1px solid ${emailTheme.colors.border}`,
  },
  cardLabel: {
    margin: '0 0 10px',
    fontSize: '13px',
    lineHeight: '18px',
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    color: emailTheme.colors.mutedText,
  },
  cardPrimaryValue: {
    margin: 0,
    fontSize: '24px',
    lineHeight: '32px',
    fontWeight: 700,
    color: emailTheme.colors.primary,
  },
  dividerColumn: {
    borderLeft: `1px solid ${emailTheme.colors.border}`,
    paddingLeft: '24px',
  },
  sectionTitle: {
    margin: '0 0 18px',
    fontSize: '18px',
    lineHeight: '28px',
    fontWeight: 700,
    color: emailTheme.colors.text,
  },
  detailRow: {
    padding: '16px 0',
    borderTop: `1px solid ${emailTheme.colors.border}`,
  },
  detailLabel: {
    margin: 0,
    fontSize: '13px',
    lineHeight: '18px',
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    color: emailTheme.colors.mutedText,
  },
  detailValue: {
    margin: 0,
    fontSize: '18px',
    lineHeight: '28px',
    color: emailTheme.colors.text,
  },
  detailSubvalue: {
    margin: '4px 0 0',
    fontSize: '16px',
    lineHeight: '24px',
    color: emailTheme.colors.mutedText,
  },
};

export function RentalConfirmedConfirmationEmailContent({
  rentalNumber,
  status,
  fulfillmentMethod,
  pickupDate,
  pickupTime,
  returnDate,
  returnTime,
  introTitle = '¡Tu alquiler fue confirmado!',
  introText = 'Gracias por elegirnos. Tu alquiler ya está confirmado y te avisaremos ante cualquier novedad.',
}: RentalConfirmedConfirmationEmailContentProps) {
  return (
    <>
      <Heading as="h1" style={styles.introTitle}>
        {introTitle}
      </Heading>
      <Text style={styles.introText}>{introText}</Text>

      <Section style={styles.card}>
        <Row>
          <Column width="48%">
            <Text style={styles.cardLabel}>Número de alquiler</Text>
            <Text style={styles.cardPrimaryValue}>#{rentalNumber}</Text>
          </Column>
          <Column width="52%" style={styles.dividerColumn}>
            <Text style={styles.cardLabel}>Estado</Text>
            <Text style={styles.cardPrimaryValue}>{formatRentalStatus(status)}</Text>
          </Column>
        </Row>
      </Section>

      <Text style={styles.sectionTitle}>Detalle del alquiler</Text>

      <DetailRow label="Método de entrega" value={formatFulfillmentMethod(fulfillmentMethod)} />
      <DetailRow label="Retiro" value={pickupDate} secondaryValue={pickupTime} />
      <DetailRow label="Devolución" value={returnDate} secondaryValue={returnTime} />
    </>
  );
}

type DetailRowProps = {
  label: string;
  value: string;
  secondaryValue?: string;
};

function DetailRow({ label, value, secondaryValue }: DetailRowProps) {
  return (
    <Section style={styles.detailRow}>
      <Row>
        <Column width="42%">
          <Text style={styles.detailLabel}>{label}</Text>
        </Column>
        <Column width="58%">
          <Text style={styles.detailValue}>{value}</Text>
          {secondaryValue ? <Text style={styles.detailSubvalue}>{secondaryValue}</Text> : null}
        </Column>
      </Row>
    </Section>
  );
}

function formatRentalStatus(status: RentalEmailStatus): string {
  switch (status) {
    case 'PENDING':
      return 'Pendiente';
    case 'DRAFT':
      return 'Borrador';
    case 'CONFIRMED':
      return 'Confirmado';
    case 'PREPARED':
      return 'Preparado';
    case 'CANCELLED':
      return 'Cancelado';
    case 'COMPLETED':
      return 'Completado';
  }
}

function formatFulfillmentMethod(method: RentalEmailFulfillmentMethod): string {
  switch (method) {
    case 'PICKUP':
      return 'Retiro en sucursal';
    case 'DELIVERY':
      return 'Entrega a domicilio';
  }
}
