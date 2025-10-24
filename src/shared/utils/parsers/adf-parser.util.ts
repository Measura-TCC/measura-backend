export function adfToPlainText(adf: any): string {
  if (!adf) {
    return '';
  }

  if (typeof adf === 'string') {
    return adf;
  }

  if (adf.type === 'text') {
    return adf.text || '';
  }

  if (adf.content && Array.isArray(adf.content)) {
    return adf.content.map((node: any) => adfToPlainText(node)).join(' ');
  }

  return '';
}
