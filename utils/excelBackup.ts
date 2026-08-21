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
    const wb = XLSX.utils.book_new();

    const sanitizeRows = (arr: any[]) => {
      if (!arr || !Array.isArray(arr) || arr.length === 0) {
        return [{ Info: 'No records found' }];
      }

      return arr.map(item => {
        const flattened: Record<string, any> = {};
        if (item && typeof item === 'object') {
          Object.entries(item).forEach(([key, val]) => {
            if (val === null || val === undefined) {
              flattened[key] = '';
            } else if (Array.isArray(val)) {
              flattened[key] = val.map(v => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(', ');
            } else if (typeof val === 'object') {
              flattened[key] = JSON.stringify(val);
            } else {
              flattened[key] = val;
            }
          });
        }
        return flattened;
      });
    };

    const addSheet = (arr: any[], sheetName: string) => {
      try {
        const rows = sanitizeRows(arr);
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      } catch (err) {
        console.warn(`Failed to add sheet ${sheetName}:`, err);
      }
    };

    addSheet(data.products || [], "Products");
    addSheet(data.sales || [], "Sales");
    addSheet(data.rentals || [], "Rentals");
    addSheet(data.customers || [], "Customers");
    addSheet(data.suppliers || [], "Suppliers");
    addSheet(data.stockLogs || [], "Stock Logs");

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `Kiddies_Backup_${dateStr}.xlsx`;

    try {
      // Primary direct file write
      XLSX.writeFile(wb, fileName);
      return true;
    } catch (writeErr) {
      console.warn("Direct XLSX.writeFile failed, attempting Blob download:", writeErr);
      
      // Fallback via Blob
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
      }, 200);
      return true;
    }
  } catch (error) {
    console.error("Excel backup failed:", error);
    
    // Emergency JSON fallback so data is NEVER lost
    try {
      const dataStr = JSON.stringify(data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Kiddies_Backup_Emergency_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 200);
      return true;
    } catch (e) {
      console.error("Emergency backup also failed:", e);
      return false;
    }
  }
};
