import * as XLSX from 'xlsx';

export interface BackupData {
  products: any[];
  sales: any[];
  rentals: any[];
  customers: any[];
  suppliers: any[];
  stockLogs: any[];
}

export const exportToExcel = (data: BackupData) => {
  const wb = XLSX.utils.book_new();

  const addSheet = (arr: any[], sheetName: string) => {
    // Avoid crashes on empty lists by putting a placeholder row
    const rows = arr && arr.length > 0 ? arr.map(item => {
      // Flatten arrays or objects to make it readable in Excel
      const flattened: Record<string, any> = {};
      Object.entries(item).forEach(([key, val]) => {
        if (Array.isArray(val)) {
          flattened[key] = val.join(', ');
        } else if (val && typeof val === 'object') {
          flattened[key] = JSON.stringify(val);
        } else {
          flattened[key] = val;
        }
      });
      return flattened;
    }) : [{ Info: 'No records found' }];

    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  };

  addSheet(data.products, "Products");
  addSheet(data.sales, "Sales");
  addSheet(data.rentals, "Rentals");
  addSheet(data.customers, "Customers");
  addSheet(data.suppliers, "Suppliers");
  addSheet(data.stockLogs, "Stock Logs");

  const fileName = `Kiddies_Daily_Backup_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
