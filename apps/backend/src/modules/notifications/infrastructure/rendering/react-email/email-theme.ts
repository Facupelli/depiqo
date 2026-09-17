import type { CSSProperties } from 'react';

export const emailTheme = {
  colors: {
    pageBackground: '#f4f4f7',
    cardBackground: '#ffffff',
    mutedSurface: '#f7f8fc',
    border: '#e5e7eb',
    text: '#111827',
    mutedText: '#6b7280',
    primary: '#2563eb',
  },
  fontFamily: 'Inter, Arial, Helvetica, sans-serif',
  width: '680px',
};

export const sharedEmailStyles = {
  body: {
    margin: 0,
    backgroundColor: emailTheme.colors.pageBackground,
    fontFamily: emailTheme.fontFamily,
    color: emailTheme.colors.text,
  },
  page: {
    width: '100%',
    padding: '32px 16px',
  },
  container: {
    maxWidth: emailTheme.width,
    margin: '0 auto',
    backgroundColor: emailTheme.colors.cardBackground,
    borderRadius: '20px',
    border: `1px solid ${emailTheme.colors.border}`,
    overflow: 'hidden',
  },
  sectionPadding: {
    padding: '32px 36px',
  },
  headerBrand: {
    margin: 0,
    fontSize: '34px',
    lineHeight: '40px',
    fontWeight: 700,
    color: emailTheme.colors.text,
  },
  headerLabel: {
    margin: 0,
    fontSize: '12px',
    lineHeight: '18px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: emailTheme.colors.mutedText,
    textAlign: 'right',
  },
  divider: {
    borderColor: emailTheme.colors.border,
    margin: 0,
  },
  footerBrand: {
    margin: '0 0 6px',
    fontSize: '14px',
    lineHeight: '20px',
    fontWeight: 600,
    color: emailTheme.colors.text,
  },
  footerDescription: {
    margin: 0,
    fontSize: '14px',
    lineHeight: '22px',
    color: emailTheme.colors.mutedText,
  },
  footerNotice: {
    margin: 0,
    fontSize: '14px',
    lineHeight: '22px',
    color: emailTheme.colors.mutedText,
    textAlign: 'right',
  },
} satisfies Record<string, CSSProperties>;
