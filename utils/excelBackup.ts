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
      if (typeof val === 'boolean') return val ? 'YES' : 'NO';
      if (Array.isArray(val)) {
        return val.map(v => (typeof v === 'object' ? (v.name || v.productName || v.itemName || JSON.stringify(v)) : String(v))).join('; ');
      }
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    };

    // 1. Map Products
    const mappedProducts = (data.products || []).map(p => ({
      'Product Name': p.name || '',
      'SKU': p.sku || '',
      'Barcode': p.barcode || '',
      'Category': p.category || '',
      'Sub Category': p.subCategory || '',
      'Gender': p.gender || '',
      'Sizes': Array.isArray(p.sizes) ? p.sizes.join(', ') : (p.sizes || ''),
      'Purchase Price (₹)': p.purchasePrice || 0,
      'Selling Price (₹)': p.sellingPrice || 0,
      'Rental Daily Rate (₹)': p.rentalPrice || 0,
      'Sale Stock (Pcs)': p.saleStock || 0,
      'Rental Stock (Pcs)': p.rentalStock || 0,
      'Total Stock': (p.saleStock || 0) + (p.rentalStock || 0),
      'Min Stock Alert': p.minStockAlert || 0,
      'Purpose': p.purpose || '',
      'Created Date': p.createdAt ? String(p.createdAt).slice(0, 10) : ''
    }));

    // 2. Map Sales
    const mappedSales = (data.sales || []).map(s => {
      const itemsDesc = Array.isArray(s.items)
        ? s.items.map((i: any) => `${i.productName || i.name || 'Item'} (x${i.quantity || 1} @ ₹${i.price || i.unitPrice || 0})`).join(' | ')
        : '';
      const totalQty = Array.isArray(s.items) ? s.items.reduce((sum: number, i: any) => sum + (Number(i.quantity) || 1), 0) : 1;
      const paid = s.paidAmount !== undefined ? Number(s.paidAmount) : Number(s.totalAmount || 0);
      const due = Math.max(0, Number(s.totalAmount || 0) - paid);

      return {
        'Invoice Number': s.invoiceNumber || s.id || '',
        'Date & Time': s.date || '',
        'Customer Name': s.customerName || (s.customer && s.customer.name) || 'Walk-in Customer',
        'Customer Phone': s.customerPhone || (s.customer && s.customer.phone) || '',
        'Purchased Items': itemsDesc,
        'Item Count': totalQty,
        'Subtotal (₹)': s.subtotal || s.totalAmount || 0,
        'Discount (₹)': s.discount || 0,
        'Tax (₹)': s.taxAmount || 0,
        'Total Amount (₹)': s.totalAmount || 0,
        'Paid Amount (₹)': paid,
        'Due Amount (₹)': due,
        'Payment Method': s.paymentMethod || 'CASH',
        'Payment Status': s.paymentStatus || (due === 0 ? 'PAID' : 'DUE'),
        'Channel': s.salesChannel || 'IN_STORE',
        'Cashier': s.cashierName || 'Admin'
      };
    });

    // 3. Map Rentals
    const mappedRentals = (data.rentals || []).map(r => ({
      'Rental Invoice': r.invoiceNumber || r.id || '',
      'Start Date': r.startDate || r.date || '',
      'Expected Return': r.expectedReturnDate || '',
      'Actual Return': r.actualReturnDate || 'Not Returned',
      'Daily Rate (₹)': r.dailyRate || 0,
      'Security Deposit (₹)': r.securityDeposit || 0,
      'Total Rent (₹)': r.totalRentAmount || 0,
      'Paid Amount (₹)': r.paidAmount || 0,
      'Late Fee (₹)': r.lateFee || 0,
      'Status': r.status || 'ACTIVE',
      'Payment Status': r.paymentStatus || 'UNPAID'
    }));

    // 4. Map Customers
    const mappedCustomers = (data.customers || []).map(c => ({
      'Customer Name': c.name || '',
      'Phone': c.phone || '',
      'Email': c.email || '',
      'Address': c.address || '',
      'GSTIN': c.gstin || '',
      'Created Date': c.createdAt ? String(c.createdAt).slice(0, 10) : ''
    }));

    // 5. Map Suppliers
    const mappedSuppliers = (data.suppliers || []).map(sup => ({
      'Supplier Name': sup.name || '',
      'Contact Person': sup.contactPerson || '',
      'Phone': sup.phone || '',
      'Email': sup.email || '',
      'Address': sup.address || '',
      'GSTIN': sup.gstin || ''
    }));

    // 6. Map Stock Logs
    const mappedStockLogs = (data.stockLogs || []).map(sl => ({
      'Date': sl.date || '',
      'Product ID': sl.productId || '',
      'Pool': sl.pool || '',
      'Movement Type': sl.type || '',
      'Quantity': sl.quantity || 0,
      'Reason / Note': sl.reason || ''
    }));

    const buildTableHTML = (arr: any[], sheetTitle: string) => {
      if (!arr || arr.length === 0) {
        return `
          <h3 style="font-family: Arial, sans-serif; color: #0f172a; margin-top: 24px; font-size: 13pt;">${sheetTitle} (0 records)</h3>
          <p style="color:#64748b; font-style: italic; font-size: 10pt;">No records available</p>
        `;
      }

      const keys = Object.keys(arr[0]);

      return `
        <h3 style="font-family: Arial, sans-serif; color: #0f172a; margin-top: 24px; font-size: 13pt;">${sheetTitle} (${arr.length} records)</h3>
        <table border="1" style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 9.5pt; width: 100%; margin-bottom: 25px;">
          <thead>
            <tr style="background-color: #0f172a; color: #ffffff; font-weight: bold;">
              ${keys.map(k => `<th style="padding: 7px 10px; text-align: left; border: 1px solid #334155;">${k}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${arr.map((item, idx) => `
              <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                ${keys.map(k => `<td style="padding: 6px 10px; border: 1px solid #cbd5e1;">${sanitizeVal(item[k])}</td>`).join('')}
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
                <x:Name>Store Data Backup</x:Name>
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
        <div style="margin-bottom: 15px; border-bottom: 2px solid #01a9fb; padding-bottom: 10px;">
          <h1 style="color: #01a9fb; font-size: 18pt; margin: 0;">KIDDIES - Full Store Data Backup</h1>
          <p style="color: #64748b; font-size: 10pt; margin: 4px 0 0 0;">Generated: ${new Date().toLocaleString('en-IN')}</p>
        </div>
        ${buildTableHTML(mappedProducts, 'Products Catalog')}
        ${buildTableHTML(mappedSales, 'Sales Transactions')}
        ${buildTableHTML(mappedRentals, 'Rentals & Bookings')}
        ${buildTableHTML(mappedCustomers, 'Customers Directory')}
        ${buildTableHTML(mappedSuppliers, 'Suppliers')}
        ${buildTableHTML(mappedStockLogs, 'Stock Inventory Logs')}
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
