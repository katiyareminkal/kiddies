import { format, parseISO } from 'date-fns';
import { Sale, Customer } from '../types';

export const exportSalesToFormattedExcel = (
  salesList: Sale[],
  customersList: Customer[],
  storeName = 'Kiddies - Premium Kids Wear'
) => {
  if (!salesList || salesList.length === 0) {
    alert('No sales records to export');
    return;
  }

  // Calculate totals for summary cards & footer
  const totalSalesCount = salesList.length;
  const totalRevenue = salesList.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  const totalPaid = salesList.reduce((acc, s) => acc + (s.paidAmount !== undefined ? s.paidAmount : s.totalAmount), 0);
  const totalDue = salesList.reduce((acc, s) => acc + Math.max(0, s.totalAmount - (s.paidAmount !== undefined ? s.paidAmount : s.totalAmount)), 0);
  const totalItemsCount = salesList.reduce((acc, s) => acc + s.items.reduce((sum, i) => sum + i.quantity, 0), 0);

  const formattedDateStr = format(new Date(), 'dd MMM yyyy, hh:mm a');

  // Construct styled HTML table format for Microsoft Excel
  const htmlContent = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="utf-8">
    <!--[if gte mso 9]>
    <xml>
      <x:ExcelWorkbook>
        <x:ExcelWorksheets>
          <x:ExcelWorksheet>
            <x:Name>Sales Report</x:Name>
            <x:WorksheetOptions>
              <x:DisplayGridlines/>
            </x:WorksheetOptions>
          </x:ExcelWorksheet>
        </x:ExcelWorksheets>
      </x:ExcelWorkbook>
    </xml>
    <![endif]-->
    <style>
      body {
        font-family: 'Segoe UI', Arial, sans-serif;
        margin: 20px;
        color: #0f172a;
        background-color: #ffffff;
      }
      .brand-header {
        margin-bottom: 20px;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 12px;
      }
      .brand-name {
        font-size: 20pt;
        font-weight: 900;
        color: #0f172a;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .report-title {
        font-size: 12pt;
        font-weight: 700;
        color: #8b5cf6;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-top: 4px;
      }
      .report-meta {
        font-size: 9pt;
        color: #64748b;
        margin-top: 6px;
      }
      
      .kpi-container {
        margin-top: 15px;
        margin-bottom: 25px;
        border-collapse: collapse;
      }
      .kpi-box {
        background-color: #f8fafc;
        border: 1px solid #cbd5e1;
        padding: 12px 18px;
        border-radius: 8px;
        min-width: 140px;
      }
      .kpi-title {
        font-size: 8pt;
        font-weight: 800;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .kpi-val {
        font-size: 14pt;
        font-weight: 900;
        color: #0f172a;
        margin-top: 4px;
        font-family: 'Courier New', monospace;
      }

      .sales-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 15px;
      }
      .sales-table th {
        background-color: #0f172a;
        color: #ffffff;
        font-size: 9pt;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 11px 14px;
        border: 1px solid #0f172a;
        text-align: left;
      }
      .sales-table th.num { text-align: right; }
      .sales-table th.center { text-align: center; }

      .sales-table td {
        padding: 10px 14px;
        border: 1px solid #e2e8f0;
        font-size: 9.5pt;
        vertical-align: middle;
        color: #334155;
      }
      .sales-table tr.even { background-color: #f8fafc; }
      .sales-table tr.odd { background-color: #ffffff; }

      .inv-code {
        font-weight: 800;
        color: #0f172a;
        font-family: 'Courier New', monospace;
      }
      .cust-name {
        font-weight: 700;
        color: #1e293b;
      }
      .cust-phone {
        font-size: 9pt;
        color: #64748b;
        font-family: 'Courier New', monospace;
      }
      .items-summary {
        font-size: 9pt;
        color: #475569;
        line-height: 1.4;
      }
      .amount-num {
        text-align: right;
        font-family: 'Courier New', monospace;
        font-weight: 800;
      }
      .text-center { text-align: center; }

      .badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 8pt;
        font-weight: 800;
        text-transform: uppercase;
        text-align: center;
      }
      .badge-paid { background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
      .badge-partial { background-color: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
      .badge-due { background-color: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
      .badge-completed { background-color: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
      .badge-pending { background-color: #fef9c3; color: #a16207; border: 1px solid #fef08a; }
      .badge-cancelled { background-color: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }

      .table-footer td {
        background-color: #0f172a;
        color: #ffffff;
        font-weight: 900;
        font-size: 10pt;
        text-transform: uppercase;
        padding: 12px 14px;
        border: 1px solid #0f172a;
      }
      .table-footer td.num {
        font-family: 'Courier New', monospace;
        font-size: 11pt;
        color: #38bdf8;
        text-align: right;
      }
    </style>
  </head>
  <body>
    <div class="brand-header">
      <div class="brand-name">${storeName}</div>
      <div class="report-title">Sales Transactions & Financial Statement</div>
      <div class="report-meta">Report Generated: <strong>${formattedDateStr}</strong> | Total Records: <strong>${totalSalesCount} Transactions</strong></div>
    </div>

    <!-- Executive KPI Summary Table -->
    <table class="kpi-container" cellspacing="8">
      <tr>
        <td class="kpi-box">
          <div class="kpi-title">Total Orders</div>
          <div class="kpi-val">${totalSalesCount}</div>
        </td>
        <td class="kpi-box">
          <div class="kpi-title">Total Revenue</div>
          <div class="kpi-val">₹ ${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </td>
        <td class="kpi-box">
          <div class="kpi-title">Amount Paid</div>
          <div class="kpi-val" style="color: #15803d;">₹ ${totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </td>
        <td class="kpi-box">
          <div class="kpi-title">Pending Due</div>
          <div class="kpi-val" style="color: ${totalDue > 0 ? '#b91c1c' : '#64748b'};">₹ ${totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </td>
        <td class="kpi-box">
          <div class="kpi-title">Total Items Sold</div>
          <div class="kpi-val">${totalItemsCount} pcs</div>
        </td>
      </tr>
    </table>

    <!-- Detailed Sales Data Table -->
    <table class="sales-table">
      <thead>
        <tr>
          <th style="width: 120px;">Invoice #</th>
          <th style="width: 140px;">Date & Time</th>
          <th style="width: 160px;">Customer Name</th>
          <th style="width: 110px;">Contact Phone</th>
          <th style="width: 260px;">Items Purchased</th>
          <th class="center" style="width: 60px;">Qty</th>
          <th class="num" style="width: 120px;">Total Amount (₹)</th>
          <th class="num" style="width: 120px;">Paid Amount (₹)</th>
          <th class="num" style="width: 120px;">Due Balance (₹)</th>
          <th class="center" style="width: 110px;">Payment Method</th>
          <th class="center" style="width: 110px;">Payment Status</th>
          <th class="center" style="width: 110px;">Order Status</th>
        </tr>
      </thead>
      <tbody>
        ${salesList.map((s, idx) => {
          const cust = customersList.find(c => c.id === s.customerId);
          const custName = cust?.name || 'Walk-in Guest';
          const custPhone = cust?.phone || '-';
          const dateFormatted = format(parseISO(s.date), 'yyyy-MM-dd HH:mm');
          const itemsSummary = s.items.map(i => `${i.quantity}x ${i.customName || i.name || 'Item'}`).join(', ');
          const itemCount = s.items.reduce((sum, i) => sum + i.quantity, 0);
          const paidAmt = s.paidAmount !== undefined ? s.paidAmount : s.totalAmount;
          const dueAmt = Math.max(0, s.totalAmount - paidAmt);
          
          let payStatusBadgeClass = 'badge-paid';
          let payStatusText = s.paymentStatus || 'PAID';
          if (s.paymentStatus === 'PARTIAL' || (dueAmt > 0 && paidAmt > 0)) {
            payStatusBadgeClass = 'badge-partial';
            payStatusText = 'PARTIAL';
          } else if (s.paymentStatus === 'UNPAID' || dueAmt > 0) {
            payStatusBadgeClass = 'badge-due';
            payStatusText = 'DUE';
          }

          let orderStatusBadgeClass = 'badge-completed';
          if (s.orderStatus === 'PENDING') orderStatusBadgeClass = 'badge-pending';
          else if (s.orderStatus === 'CANCELLED') orderStatusBadgeClass = 'badge-cancelled';

          return `
            <tr class="${idx % 2 === 0 ? 'even' : 'odd'}">
              <td class="inv-code">${s.invoiceNumber}</td>
              <td>${dateFormatted}</td>
              <td class="cust-name">${custName}</td>
              <td class="cust-phone">${custPhone}</td>
              <td class="items-summary">${itemsSummary}</td>
              <td class="text-center font-bold">${itemCount}</td>
              <td class="amount-num">₹ ${s.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td class="amount-num" style="color: #15803d;">₹ ${paidAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td class="amount-num" style="color: ${dueAmt > 0 ? '#b91c1c' : '#64748b'};">₹ ${dueAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td class="text-center font-bold">${s.paymentMethod}</td>
              <td class="text-center"><span class="badge ${payStatusBadgeClass}">${payStatusText}</span></td>
              <td class="text-center"><span class="badge ${orderStatusBadgeClass}">${s.orderStatus}</span></td>
            </tr>
          `;
        }).join('')}
      </tbody>
      <tfoot>
        <tr class="table-footer">
          <td colspan="5" style="text-align: right;">TOTALS:</td>
          <td class="text-center">${totalItemsCount}</td>
          <td class="num">₹ ${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="num">₹ ${totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="num">₹ ${totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td colspan="3"></td>
        </tr>
      </tfoot>
    </table>
  </body>
  </html>
  `;

  // Download Blob as .xls for native Excel / Google Sheets styling support
  const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Sales_Report_${format(new Date(), 'yyyy-MM-dd')}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportSalesToCSV = (
  salesList: Sale[],
  customersList: Customer[]
) => {
  if (!salesList || salesList.length === 0) {
    alert('No sales records to export');
    return;
  }
  const headers = [
    'Invoice Number',
    'Date & Time',
    'Customer Name',
    'Customer Phone',
    'Items Purchased',
    'Total Items Qty',
    'Total Amount (INR)',
    'Paid Amount (INR)',
    'Due Amount (INR)',
    'Channel',
    'Payment Method',
    'Payment Status',
    'Order Status'
  ];

  const rows = salesList.map(s => {
    const cust = customersList.find(c => c.id === s.customerId);
    const itemsStr = s.items.map(i => `${i.quantity}x ${i.customName || i.name || 'Item'}`).join('; ');
    const paidAmt = s.paidAmount !== undefined ? s.paidAmount : s.totalAmount;
    const dueAmt = Math.max(0, s.totalAmount - paidAmt);
    return [
      `"${s.invoiceNumber}"`,
      `"${format(parseISO(s.date), 'yyyy-MM-dd HH:mm')}"`,
      `"${cust?.name || 'Walk-in Guest'}"`,
      `"${cust?.phone || ''}"`,
      `"${itemsStr}"`,
      s.items.reduce((sum, item) => sum + item.quantity, 0),
      s.totalAmount,
      paidAmt,
      dueAmt,
      s.channel,
      s.paymentMethod,
      s.paymentStatus || (dueAmt > 0 ? 'PARTIAL' : 'PAID'),
      s.orderStatus
    ];
  });

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Sales_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
