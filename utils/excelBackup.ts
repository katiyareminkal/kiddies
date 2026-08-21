import * as XLSX from 'xlsx';

export interface BackupData {
  products: any[];
  sales: any[];
  rentals: any[];
  customers: any[];
  suppliers: any[];
  stockLogs: any[];
}

export const exportToExcel = (data: BackupData): boolean => {
  try {
    const sanitizeVal = (val: any) => {
      if (val === null || val === undefined) return '';
      if (Array.isArray(val)) return val.map(v => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(', ');
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    };

    const buildTableHTML = (arr: any[], sheetTitle: string) => {
      if (!arr || !Array.isArray(arr) || arr.length === 0) {
        return `<p style="color:#64748b;">No records found for ${sheetTitle}</p>`;
      }

      // Collect all unique keys
      const keys = Array.from(
        new Set(
          arr.reduce((acc: string[], item) => {
            if (item && typeof item === 'object') {
              acc.push(...Object.keys(item));
            }
            return acc;
          }, [])
        )
      );

      return `
        <h2 style="font-family: Arial, sans-serif; color: #0f172a; margin-top: 20px; font-size: 14pt;">${sheetTitle} (${arr.length} records)</h2>
        <table border="1" style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 10pt; width: 100%; margin-bottom: 30px;">
          <thead>
            <tr style="background-color: #f1f5f9; color: #334155; font-weight: bold;">
              ${keys.map(k => `<th style="padding: 8px 12px; text-align: left; border: 1px solid #cbd5e1;">${k}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${arr.map((item, idx) => `
              <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                ${keys.map(k => `<td style="padding: 6px 10px; border: 1px solid #e2e8f0;">${sanitizeVal(item[k])}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    };

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Database Backup</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body style="padding: 20px; font-family: Arial, sans-serif;">
        <h1 style="color: #01a9fb; font-size: 18pt; margin-bottom: 4px;">KIDDIES - Full Store Backup</h1>
        <p style="color: #64748b; font-size: 10pt; margin-top: 0;">Export Date: ${new Date().toLocaleString('en-IN')}</p>
        <hr style="border: 1px solid #e2e8f0; margin: 15px 0;" />
        ${buildTableHTML(data.products, 'Products Catalog')}
        ${buildTableHTML(data.sales, 'Sales Invoices')}
        ${buildTableHTML(data.rentals, 'Rental Orders')}
        ${buildTableHTML(data.customers, 'Customer Ledger')}
        ${buildTableHTML(data.suppliers, 'Suppliers Directory')}
        ${buildTableHTML(data.stockLogs, 'Stock Movements Log')}
      </body>
      </html>
    `;

    const fileName = `Kiddies_Backup_${new Date().toISOString().slice(0, 10)}.xls`;
    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 200);

    return true;
  } catch (error) {
    console.error("Backup export error:", error);
    return false;
  }
};
