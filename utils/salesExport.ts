import * as XLSX from 'xlsx';
import { Sale, Customer } from '../types';
import { startOfDay, subDays, startOfWeek, startOfMonth, startOfYear, isAfter, parseISO } from 'date-fns';

export type DatePresetTimeframe = 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom' | string;

export const filterSalesByTimeframe = (
  sales: Sale[],
  timeframe: DatePresetTimeframe
): { filtered: Sale[]; label: string } => {
  const now = new Date();
  const todayStart = startOfDay(now);

  let filtered = [...sales];
  let label = 'Sales Report';

  switch (timeframe.toLowerCase()) {
    case 'today':
      filtered = sales.filter(s => {
        try {
          return s.date && isAfter(parseISO(s.date), todayStart);
        } catch {
          return false;
        }
      });
      label = "Today's Sales Report";
      break;

    case 'yesterday': {
      const yesterdayStart = startOfDay(subDays(now, 1));
      filtered = sales.filter(s => {
        try {
          const d = parseISO(s.date);
          return isAfter(d, yesterdayStart) && !isAfter(d, todayStart);
        } catch {
          return false;
        }
      });
      label = "Yesterday's Sales Report";
      break;
    }

    case 'week': {
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      filtered = sales.filter(s => {
        try {
          return s.date && isAfter(parseISO(s.date), weekStart);
        } catch {
          return false;
        }
      });
      label = 'This Week Sales Report';
      break;
    }

    case 'month': {
      const monthStart = startOfMonth(now);
      filtered = sales.filter(s => {
        try {
          return s.date && isAfter(parseISO(s.date), monthStart);
        } catch {
          return false;
        }
      });
      label = 'This Month Sales Report';
      break;
    }

    case 'quarter': {
      const quarterStart = subDays(now, 90);
      filtered = sales.filter(s => {
        try {
          return s.date && isAfter(parseISO(s.date), quarterStart);
        } catch {
          return false;
        }
      });
      label = 'Quarterly Sales Report';
      break;
    }

    case 'year': {
      const yearStart = startOfYear(now);
      filtered = sales.filter(s => {
        try {
          return s.date && isAfter(parseISO(s.date), yearStart);
        } catch {
          return false;
        }
      });
      label = 'This Year Sales Report';
      break;
    }

    case 'all':
    default:
      label = 'All Time Sales Report';
      break;
  }

  return { filtered, label };
};

export const exportSalesToFormattedExcel = (
  targetList: Sale[],
  customers: Customer[],
  store: string,
  label: string
): void => {
  try {
    const customerMap = new Map<string, string>();
    customers.forEach(c => customerMap.set(c.id, c.name));

    const rows = targetList.map(s => {
      const custName = customerMap.get(s.customerId) || 'Walk-in Customer';
      const itemsDesc = (s.items || [])
        .map(i => `${i.name || 'Product'} (x${i.quantity})`)
        .join('; ');
      const due = Math.max(0, (s.totalAmount || 0) - (s.paidAmount || 0));

      return {
        'Invoice #': s.invoiceNumber,
        'Date': s.date ? new Date(s.date).toLocaleDateString('en-IN') : '',
        'Customer': custName,
        'Items': itemsDesc,
        'Payment Method': s.paymentMethod,
        'Payment Status': s.paymentStatus,
        'Channel': s.channel,
        'Discount (₹)': s.discount || 0,
        'Tax (₹)': s.taxTotal || 0,
        'Total Amount (₹)': s.totalAmount || 0,
        'Paid Amount (₹)': s.paidAmount || 0,
        'Balance Due (₹)': due
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Auto-fit column widths
    const colWidths = [
      { wch: 14 },
      { wch: 12 },
      { wch: 20 },
      { wch: 30 },
      { wch: 16 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 }
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');

    const cleanLabel = (label || 'Sales_Report').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${cleanLabel}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  } catch (error) {
    console.error('Error exporting sales to Excel:', error);
  }
};

export const exportSalesToCSV = (
  targetList: Sale[],
  customers: Customer[],
  label: string
): void => {
  try {
    const customerMap = new Map<string, string>();
    customers.forEach(c => customerMap.set(c.id, c.name));

    const headers = [
      'Invoice #',
      'Date',
      'Customer',
      'Items',
      'Payment Method',
      'Payment Status',
      'Channel',
      'Discount',
      'Tax',
      'Total Amount',
      'Paid Amount',
      'Balance Due'
    ];

    const escapeCSV = (str: string | number) => {
      const s = String(str ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const csvLines = [headers.join(',')];

    targetList.forEach(s => {
      const custName = customerMap.get(s.customerId) || 'Walk-in Customer';
      const itemsDesc = (s.items || [])
        .map(i => `${i.name || 'Product'} (x${i.quantity})`)
        .join('; ');
      const due = Math.max(0, (s.totalAmount || 0) - (s.paidAmount || 0));

      const row = [
        escapeCSV(s.invoiceNumber),
        escapeCSV(s.date ? new Date(s.date).toLocaleDateString('en-IN') : ''),
        escapeCSV(custName),
        escapeCSV(itemsDesc),
        escapeCSV(s.paymentMethod),
        escapeCSV(s.paymentStatus),
        escapeCSV(s.channel),
        escapeCSV(s.discount || 0),
        escapeCSV(s.taxTotal || 0),
        escapeCSV(s.totalAmount || 0),
        escapeCSV(s.paidAmount || 0),
        escapeCSV(due)
      ];
      csvLines.push(row.join(','));
    });

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const cleanLabel = (label || 'Sales_Report').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${cleanLabel}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting sales to CSV:', error);
  }
};
