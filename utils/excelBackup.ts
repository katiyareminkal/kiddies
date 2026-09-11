import * as XLSX from 'xlsx';
import { Product, Sale, Rental, Customer, Supplier, StockLog } from '../types';

interface BackupData {
  products?: Product[];
  sales?: Sale[];
  rentals?: Rental[];
  customers?: Customer[];
  suppliers?: Supplier[];
  stockLogs?: StockLog[];
}

export const exportToExcel = (data: BackupData): boolean => {
  try {
    const wb = XLSX.utils.book_new();

    if (data.products && data.products.length > 0) {
      const wsProducts = XLSX.utils.json_to_sheet(data.products.map(p => ({
        ID: p.id,
        Name: p.name,
        SKU: p.sku,
        Barcode: p.barcode || '',
        Category: p.category,
        SubCategory: p.subCategory || '',
        PurchasePrice: p.purchasePrice,
        SellingPrice: p.sellingPrice,
        RentalPrice: p.rentalPrice || 0,
        SaleStock: p.saleStock,
        RentalStock: p.rentalStock,
        Sizes: (p.sizes || []).join(', '),
        Color: p.color || ''
      })));
      XLSX.utils.book_append_sheet(wb, wsProducts, 'Products');
    }

    if (data.sales && data.sales.length > 0) {
      const wsSales = XLSX.utils.json_to_sheet(data.sales.map(s => ({
        InvoiceNumber: s.invoiceNumber,
        Date: s.date,
        CustomerID: s.customerId,
        TotalAmount: s.totalAmount,
        Discount: s.discount || 0,
        Tax: s.taxTotal || 0,
        PaidAmount: s.paidAmount || 0,
        PaymentStatus: s.paymentStatus,
        PaymentMethod: s.paymentMethod,
        Channel: s.channel,
        ItemsCount: s.items?.length || 0
      })));
      XLSX.utils.book_append_sheet(wb, wsSales, 'Sales');
    }

    if (data.rentals && data.rentals.length > 0) {
      const wsRentals = XLSX.utils.json_to_sheet(data.rentals.map(r => ({
        InvoiceNumber: r.invoiceNumber,
        Date: r.date,
        CustomerID: r.customerId,
        ProductID: r.productId,
        Status: r.status,
        DailyRate: r.dailyRate,
        StartDate: r.startDate,
        TotalRent: r.totalRentAmount,
        Deposit: r.securityDeposit,
        LateFee: r.lateFee || 0,
        ExpectedReturn: r.expectedReturnDate,
        ActualReturn: r.actualReturnDate || ''
      })));
      XLSX.utils.book_append_sheet(wb, wsRentals, 'Rentals');
    }

    if (data.customers && data.customers.length > 0) {
      const wsCustomers = XLSX.utils.json_to_sheet(data.customers.map(c => ({
        ID: c.id,
        Name: c.name,
        Phone: c.phone,
        Email: c.email || '',
        Address: c.address || '',
        GSTIN: c.gstin || ''
      })));
      XLSX.utils.book_append_sheet(wb, wsCustomers, 'Customers');
    }

    if (data.suppliers && data.suppliers.length > 0) {
      const wsSuppliers = XLSX.utils.json_to_sheet(data.suppliers.map(s => ({
        ID: s.id,
        Name: s.name,
        Phone: s.phone,
        Email: s.email || '',
        Address: s.address || ''
      })));
      XLSX.utils.book_append_sheet(wb, wsSuppliers, 'Suppliers');
    }

    if (data.stockLogs && data.stockLogs.length > 0) {
      const wsLogs = XLSX.utils.json_to_sheet(data.stockLogs.map(l => ({
        ID: l.id,
        Date: l.date,
        ProductID: l.productId,
        Pool: l.pool,
        Quantity: l.quantity,
        Type: l.type,
        Reason: l.reason
      })));
      XLSX.utils.book_append_sheet(wb, wsLogs, 'StockLogs');
    }

    // Ensure at least one sheet exists
    if (wb.SheetNames.length === 0) {
      const wsEmpty = XLSX.utils.json_to_sheet([{ Message: 'No data to export' }]);
      XLSX.utils.book_append_sheet(wb, wsEmpty, 'Empty');
    }

    const fileName = `Kiddies_Backup_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    return true;
  } catch (error) {
    console.error('Error generating Excel backup:', error);
    return false;
  }
};
