import { StyleSheet } from '@react-pdf/renderer';

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
