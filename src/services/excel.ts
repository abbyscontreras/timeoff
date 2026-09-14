import ExcelJS from 'exceljs';

export type ExportRow = {
  user: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  chargeCode: string;
  hours: number;
};

export async function buildPayrollWorkbook(rows: ExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Payroll Summary');

  worksheet.columns = [
    { header: 'User', key: 'user', width: 24 },
    { header: 'Pay Period Start', key: 'payPeriodStart', width: 18 },
    { header: 'Pay Period End', key: 'payPeriodEnd', width: 18 },
    { header: 'Charge Code', key: 'chargeCode', width: 18 },
    { header: 'Hours', key: 'hours', width: 10 }
  ];

  rows.forEach((row) => worksheet.addRow(row));
  const data = await workbook.xlsx.writeBuffer();
  return Buffer.from(data as ArrayBuffer);
}

export async function parseWorkbook(buffer: Buffer): Promise<Record<string, unknown>[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headers = (sheet.getRow(1).values as string[]).slice(1);
  const parsed: Record<string, unknown>[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const item: Record<string, unknown> = {};
    headers.forEach((header, i) => {
      if (!header) return;
      item[header] = row.getCell(i + 2).value as unknown;
    });
    parsed.push(item);
  });

  return parsed;
}
