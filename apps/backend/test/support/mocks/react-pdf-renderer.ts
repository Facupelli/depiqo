export async function renderToBuffer(): Promise<Buffer> {
  return Buffer.from('test-pdf');
}

export const Document = 'Document';
export const Page = 'Page';
export const Text = 'Text';
export const View = 'View';
export const Image = 'Image';
export const StyleSheet = { create: <T>(styles: T): T => styles };
