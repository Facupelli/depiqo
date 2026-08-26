import { Column, Heading, Row, Section, Text } from 'react-email';
import * as React from 'react';

import { RentalEmailFulfillmentMethod, RentalEmailStatus } from '../../../../application/ports/email-renderer.port';

import { emailTheme } from '../../react-email/email-theme';

type RentalCreatedByCustomerEmailContentProps = {
  rentalNumber: number | string;
  customerEmail: string;
  status: RentalEmailStatus;
  fulfillmentMethod: RentalEmailFulfillmentMethod;
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;
  locationName?: string;
  timezone?: string;
};

const styles = {
  introTitle: {
    margin: '0 0 10px',
    fontSize: '40px',
    lineHeight: '44px',
    fontWeight: 700,
    color: emailTheme.colors.text,
  },
  introText: {
    margin: '0 0 32px',
    fontSize: '18px',
    lineHeight: '28px',
    color: emailTheme.colors.mutedText,
  },
  card: {
    marginBottom: '28px',
    padding: '24px 28px',
    borderRadius: '16px',
    backgroundColor: emailTheme.colors.mutedSurface,
    border: `1px solid ${emailTheme.colors.border}`,
  },
  cardLabel: {
    margin: '0 0 8px',
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
  cardValue: {
    margin: 0,
    fontSize: '18px',
    lineHeight: '28px',
    fontWeight: 600,
    color: emailTheme.colors.text,
  },
  dividerColumn: {
    borderLeft: `1px solid ${emailTheme.colors.border}`,
    paddingLeft: '24px',
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
  detailValueAccent: {
    margin: 0,
    fontSize: '18px',
    lineHeight: '28px',
    color: emailTheme.colors.primary,
  },
  detailSubvalue: {
    margin: '4px 0 0',
    fontSize: '16px',
    lineHeight: '24px',
    color: emailTheme.colors.mutedText,
  },
  closingText: {
    margin: '24px 0 0',
    fontSize: '18px',
    lineHeight: '28px',
    color: emailTheme.colors.text,
  },
};

export function RentalCreatedByCustomerEmailContent({
  rentalNumber,
  customerEmail,
  status,
  fulfillmentMethod,
  pickupDate,
  pickupTime,
  returnDate,
  returnTime,
  locationName,
  timezone,
}: RentalCreatedByCustomerEmailContentProps) {
  return (
    <>
      <Heading as="h1" style={styles.introTitle}>
        Nueva rental-order creada
      </Heading>
      <Text style={styles.introText}>Se registró una nueva rental-order en el sistema.</Text>

      <Section style={styles.card}>
        <Row>
          <Column width="48%">
            <Text style={styles.cardLabel}>Rental-order</Text>
            <Text style={styles.cardPrimaryValue}>#{rentalNumber}</Text>
          </Column>
          <Column width="52%" style={styles.dividerColumn}>
            <Text style={styles.cardLabel}>Cliente</Text>
            <Text style={styles.cardValue}>{customerEmail}</Text>
          </Column>
        </Row>
      </Section>

      <DetailRow label="Estado" value={formatRentalStatus(status)} accent />
      <DetailRow label="Método de entrega" value={formatFulfillmentMethod(fulfillmentMethod)} />
      <DetailRow label="Retiro" value={pickupDate} secondaryValue={pickupTime} />
      <DetailRow label="Devolución" value={returnDate} secondaryValue={returnTime} />
      {locationName ? <DetailRow label="Ubicación" value={locationName} /> : null}
      {timezone ? <DetailRow label="Zona horaria" value={timezone} /> : null}

      <Text style={styles.closingText}>
        Revisá la rental-order para confirmar disponibilidad y coordinar la operación.
      </Text>
    </>
  );
}

type DetailRowProps = {
  label: string;
  value: string;
  secondaryValue?: string;
  accent?: boolean;
};

function DetailRow({ label, value, secondaryValue, accent = false }: DetailRowProps) {
  return (
    <Section style={styles.detailRow}>
      <Row>
        <Column width="42%">
          <Text style={styles.detailLabel}>{label}</Text>
        </Column>
        <Column width="58%">
          <Text style={accent ? styles.detailValueAccent : styles.detailValue}>{value}</Text>
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
