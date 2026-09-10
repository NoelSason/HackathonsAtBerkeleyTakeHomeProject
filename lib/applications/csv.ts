/**
 * Escapes one CSV cell.
 *
 * Quoting anything containing a comma, a quote or a newline is the format's
 * own requirement. The leading apostrophe on a cell starting with =, +, - or
 * @ is the less obvious one: spreadsheets treat those as formulas, so an
 * applicant who types `=1+1` into an essay would otherwise have it executed
 * when an organizer opens the file.
 *
 * Order matters. The apostrophe goes on before the quoting check, so a value
 * that needs both ends up as "'=1+1,x" with the apostrophe inside the quotes,
 * which is what a spreadsheet expects.
 */
export function cell(value: string | number | null): string {
  if (value === null) return "";

  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replaceAll('"', '""')}"`;

  return text;
}
