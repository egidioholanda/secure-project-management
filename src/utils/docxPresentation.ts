export interface DocxPlaceholders {
  projeto?: string;
  cliente?: string;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/**
 * Converts a .docx file (fetched from `fileUrl`) into HTML, substituting
 * {{projeto}} / {{cliente}} placeholders with the values for a given proposal.
 */
export const convertDocxToHtml = async (
  fileUrl: string,
  placeholders: DocxPlaceholders
): Promise<string> => {
  const mammoth = await import("mammoth");
  const response = await fetch(fileUrl);
  const arrayBuffer = await response.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });

  let html = result.value;
  if (placeholders.projeto !== undefined) {
    html = html.replace(/\{\{\s*projeto\s*\}\}/gi, escapeHtml(placeholders.projeto));
  }
  if (placeholders.cliente !== undefined) {
    html = html.replace(/\{\{\s*cliente\s*\}\}/gi, escapeHtml(placeholders.cliente));
  }

  return html;
};
