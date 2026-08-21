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
  try {
    const wb = XLSX.utils.book_new();

    const addSheet = (arr: any[], sheetName: string) => {
      // Avoid crashes on empty lists by putting a placeholder row
      const rows = arr && Array.isArray(arr) && arr.length > 0 ? arr.map(item => {
        // Flatten arrays or objects to make it readable in Excel
        const flattened: Record<string, any> = {};
        if (item && typeof item === 'object') {
          Object.entries(item).forEach(([key, val]) => {
            if (Array.isArray(val)) {
              flattened[key] = val.map(v => (typeof v === 'object' ? JSON.stringify(v) : v)).join(', ');
            } else if (val && typeof val === 'object') {
              flattened[key] = JSON.stringify(val);
            } else {
              flattened[key] = val;
            }
          });
        }
        return flattened;
      }) : [{ Info: 'No records found' }];

      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    };

    addSheet(data.products || [], "Products");
    addSheet(data.sales || [], "Sales");
    addSheet(data.rentals || [], "Rentals");
    addSheet(data.customers || [], "Customers");
    addSheet(data.suppliers || [], "Suppliers");
    addSheet(data.stockLogs || [], "Stock Logs");

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `Kiddies_Backup_${dateStr}.xlsx`;
    
    // Generate binary array buffer and trigger download via standard HTML5 Blob
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);

    return true;
  } catch (error) {
    console.error("Excel backup failed:", error);
    return false;
  }
};
