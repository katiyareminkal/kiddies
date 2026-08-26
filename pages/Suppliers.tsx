import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Card, Button, Modal } from '../components/Shared';
import { formatCurrency } from '../utils/helpers';
import {
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Truck,
  Package,
  Building2,
  ExternalLink,
  FileText,
  IndianRupee,
  Trash2,
  ArrowRight,
  ImagePlus,
  Pencil,
  Eye,
  CreditCard,
  Boxes,
  Sparkles,
  Check,
  CheckCircle2,
  AlertCircle,
  Download,
  Printer,
  Info
} from 'lucide-react';
import { Supplier, SupplierBill } from '../types';

const Suppliers: React.FC = () => {
  const { suppliers = [], addSupplier, updateSupplier, deleteSupplier, products = [], supplierBills = [], addSupplierBill, updateSupplierBill, addPaymentToSupplierBill, deleteSupplierBill, settings } = useApp();
  const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];
  const safeProducts = Array.isArray(products) ? products : [];
  const safeSupplierBills = Array.isArray(supplierBills) ? supplierBills : [];

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Ledger State
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
  const [isEditBillOpen, setIsEditBillOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<SupplierBill | null>(null);
  const [viewingBillDetails, setViewingBillDetails] = useState<SupplierBill | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentBill, setPaymentBill] = useState<SupplierBill | null>(null);

  // Bill Form Dynamic State
  const [billItems, setBillItems] = useState<{ itemName: string; quantity: string; unitPrice: string; total: number }[]>([
    { itemName: '', quantity: '1', unitPrice: '', total: 0 }
  ]);
  const [billImageFile, setBillImageFile] = useState<File | null>(null);
  const [billDiscountType, setBillDiscountType] = useState<'NONE' | 'PERCENT' | 'FIXED'>('NONE');
  const [billDiscountValue, setBillDiscountValue] = useState<string>('0');
  const [billTaxType, setBillTaxType] = useState<'NONE' | 'GST' | 'SPLIT_GST'>('NONE');
  const [billTaxRate, setBillTaxRate] = useState<string>('12');
  const [billPaymentStatus, setBillPaymentStatus] = useState<'PAID' | 'PARTIAL' | 'UNPAID'>('UNPAID');
  const [billCustomPaidAmount, setBillCustomPaidAmount] = useState<string>('0');

  // In-Button Action States
  const [supplierSaveStatus, setSupplierSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [addBillStatus, setAddBillStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [editBillStatus, setEditBillStatus] = useState<'idle' | 'updating' | 'updated'>('idle');
  const [paymentSaveStatus, setPaymentSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Helper to compute bill summary amounts
  const computeBillSummary = (
    items: { total: number }[],
    discType: 'NONE' | 'PERCENT' | 'FIXED',
    discVal: number,
    tType: 'NONE' | 'GST' | 'SPLIT_GST',
    tRate: number
  ) => {
    const subtotal = items.reduce((acc, item) => acc + (Number(item.total) || 0), 0);
    let discountAmount = 0;
    if (discType === 'PERCENT') {
      discountAmount = (subtotal * Math.min(100, Math.max(0, discVal))) / 100;
    } else if (discType === 'FIXED') {
      discountAmount = Math.min(subtotal, Math.max(0, discVal));
    }
    const discountedTotal = Math.max(0, subtotal - discountAmount);

    let taxAmount = 0;
    if (tType !== 'NONE' && tRate > 0) {
      taxAmount = (discountedTotal * tRate) / 100;
    }
    const finalTotal = Math.round((discountedTotal + taxAmount) * 100) / 100;

    return {
      subtotal,
      discountAmount,
      discountedTotal,
      taxAmount,
      finalTotal,
      cgstAmount: tType === 'SPLIT_GST' ? taxAmount / 2 : 0,
      sgstAmount: tType === 'SPLIT_GST' ? taxAmount / 2 : 0,
      igstAmount: tType === 'GST' ? taxAmount : 0
    };
  };

  // Helper to trigger printable PDF download window for Purchase Bill
  const handleDownloadPurchaseBill = (bill: SupplierBill, supplierParam?: Supplier) => {
    const currentSupplier = supplierParam || suppliers.find(s => s.id === bill.supplierId) || selectedSupplier;
    const storeName = settings?.storeName || 'Kiddies Store';
    const storeAddress = settings?.address || settings?.storeAddress || '';
    const storePhone = settings?.phone || settings?.storePhone || '';
    const storeGst = settings?.gstin || '';

    const subtotal = bill.subtotal !== undefined && bill.subtotal > 0 
      ? bill.subtotal 
      : (bill.items || []).reduce((acc, i) => acc + (Number(i.total) || 0), 0);
    
    // Smart fallback for discountAmount & discountType
    let discountAmt = bill.discountAmount || 0;
    if (!discountAmt && bill.discountType && bill.discountValue) {
      if (bill.discountType === 'PERCENT') {
        discountAmt = (subtotal * bill.discountValue) / 100;
      } else if (bill.discountType === 'FIXED') {
        discountAmt = bill.discountValue;
      }
    }

    const taxableAmt = Math.max(0, subtotal - discountAmt);

    // Smart fallback for taxAmount & taxRate
    let taxAmt = bill.taxAmount || 0;
    let taxRate = bill.taxRate || 0;
    if (!taxAmt && bill.totalAmount > taxableAmt && taxableAmt > 0) {
      taxAmt = Math.round((bill.totalAmount - taxableAmt) * 100) / 100;
      if (!taxRate) {
        taxRate = Math.round((taxAmt / taxableAmt) * 100);
      }
    }

    const totalAmt = bill.totalAmount || (taxableAmt + taxAmt);
    const paidAmt = bill.paidAmount || 0;
    const dueAmt = Math.max(0, totalAmt - paidAmt);
    const halfRate = taxRate / 2;
    const isSplitGst = bill.taxType === 'SPLIT_GST' || (!bill.taxType && taxAmt > 0);
    const isIgst = bill.taxType === 'GST';

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase_Bill_${bill.billNumber}</title>
          <style>
            @page { size: A4; margin: 12mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 24px; font-size: 13px; background: #ffffff; }
            .bill-card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 24px; max-width: 800px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
            .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; border-b: 2px solid #01a9fb; padding-bottom: 16px; margin-bottom: 20px; }
            .brand-title { font-size: 24px; font-weight: 900; color: #fe569f; margin: 0; text-transform: uppercase; letter-spacing: -0.5px; }
            .invoice-type { font-size: 13px; font-weight: 800; color: #01a9fb; text-transform: uppercase; margin-top: 4px; letter-spacing: 0.5px; }
            .store-info { text-align: right; font-size: 11px; color: #475569; line-height: 1.5; }
            .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
            .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; }
            .info-box h4 { margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 800; letter-spacing: 0.5px; }
            .info-box p { margin: 3px 0; font-size: 12px; font-weight: 600; color: #0f172a; }
            .status-badge { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
            .status-PAID { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
            .status-PARTIAL { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
            .status-UNPAID { background: #ffe4e6; color: #be123c; border: 1px solid #fecdd3; }
            table.items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
            table.items-table th { background: #f1f5f9; color: #334155; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 10px 12px; border-bottom: 1px solid #cbd5e1; text-align: left; letter-spacing: 0.5px; }
            table.items-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 12px; font-weight: 600; color: #1e293b; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-mono { font-family: monospace; font-weight: 700; }
            .summary-container { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 10px; gap: 20px; }
            .notes-box { flex: 1; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px; font-size: 11px; color: #475569; }
            .tax-breakdown-card { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 8px 10px; margin-top: 8px; font-size: 11px; }
            .summary-table { width: 340px; border-collapse: collapse; }
            .summary-table td { padding: 6px 8px; font-size: 12px; font-weight: 600; }
            .summary-table .total-row td { border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; font-size: 14px; font-weight: 900; color: #0f172a; padding: 8px; }
            .footer-section { margin-top: 35px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-end; font-size: 10px; color: #64748b; }
            .sig-box { text-align: center; border-top: 1px solid #94a3b8; width: 170px; padding-top: 6px; font-weight: 800; color: #334155; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="bill-card">
            <div class="invoice-header">
              <div>
                <h1 class="brand-title">${storeName}</h1>
                <div class="invoice-type">PURCHASE BILL INVOICE VOUCHER</div>
              </div>
              <div class="store-info">
                <strong>${storeName}</strong><br/>
                ${storeAddress ? `${storeAddress}<br/>` : ''}
                ${storePhone ? `Phone: ${storePhone}<br/>` : ''}
                ${storeGst ? `GSTIN: ${storeGst}` : ''}
              </div>
            </div>

            <div class="details-grid">
              <div class="info-box">
                <h4>Vendor / Supplier Details</h4>
                <p style="font-size: 13px;"><strong>${currentSupplier?.name || 'Vendor Supplier'}</strong></p>
                ${currentSupplier?.contactPerson ? `<p>Contact Person: ${currentSupplier.contactPerson}</p>` : ''}
                ${currentSupplier?.phone ? `<p>Phone: ${currentSupplier.phone}</p>` : ''}
                ${currentSupplier?.email ? `<p>Email: ${currentSupplier.email}</p>` : ''}
                ${currentSupplier?.location ? `<p>Location: ${currentSupplier.location}</p>` : ''}
              </div>

              <div class="info-box">
                <h4>Bill Voucher Metadata</h4>
                <p>Bill / Invoice No: <strong style="font-family: monospace;">${bill.billNumber}</strong></p>
                <p>Invoice Date: <strong>${bill.date}</strong></p>
                <p>Tax Mode: <strong>${isSplitGst ? `CGST (${halfRate}%) + SGST (${halfRate}%)` : isIgst ? `IGST (${taxRate}%)` : 'Without Tax / 0% GST'}</strong></p>
                <p>Settlement Status: <span class="status-badge status-${bill.status}">${bill.status}</span></p>
              </div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 30px;">#</th>
                  <th>Item Description / SKU</th>
                  <th class="text-center" style="width: 60px;">Qty</th>
                  <th class="text-right" style="width: 100px;">Unit Rate</th>
                  <th class="text-right" style="width: 110px;">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                ${(bill.items && bill.items.length > 0)
                  ? bill.items.map((item, idx) => `
                    <tr>
                      <td class="font-mono">${idx + 1}</td>
                      <td><strong>${item.itemName}</strong></td>
                      <td class="text-center font-mono">${item.quantity}</td>
                      <td class="text-right font-mono">₹${Number(item.unitPrice).toFixed(2)}</td>
                      <td class="text-right font-mono">₹${Number(item.total).toFixed(2)}</td>
                    </tr>
                  `).join('')
                  : `
                    <tr>
                      <td colspan="5" class="text-center" style="color: #94a3b8; font-style: italic;">
                        Total Purchased Bill Amount: ₹${totalAmt.toFixed(2)}
                      </td>
                    </tr>
                  `
                }
              </tbody>
            </table>

            <div class="summary-container">
              <div class="notes-box">
                <strong>Remarks & Notes:</strong><br/>
                ${bill.notes || 'No special terms recorded on bill.'}

                ${taxAmt > 0 ? `
                  <div class="tax-breakdown-card">
                    <strong style="color: #0284c7;">GST Breakdown Detail:</strong><br/>
                    ${isSplitGst ? `
                      CGST (${halfRate}%): <strong>+₹${(taxAmt / 2).toFixed(2)}</strong><br/>
                      SGST (${halfRate}%): <strong>+₹${(taxAmt / 2).toFixed(2)}</strong><br/>
                      Total Tax: <strong>+₹${taxAmt.toFixed(2)}</strong>
                    ` : `
                      IGST Integrated Tax (${taxRate}%): <strong>+₹${taxAmt.toFixed(2)}</strong>
                    `}
                  </div>
                ` : ''}
              </div>

              <table class="summary-table">
                <tr>
                  <td style="color: #64748b;">Items Subtotal</td>
                  <td class="text-right font-mono">₹${subtotal.toFixed(2)}</td>
                </tr>
                ${discountAmt > 0 ? `
                  <tr style="color: #fe569f;">
                    <td>Discount (${bill.discountType === 'PERCENT' ? `${bill.discountValue}%` : bill.discountType === 'FIXED' ? 'Flat' : 'Discount'})</td>
                    <td class="text-right font-mono">-₹${discountAmt.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="color: #475569; font-weight: 700;">Taxable Amount</td>
                    <td class="text-right font-mono" style="font-weight: 700;">₹${taxableAmt.toFixed(2)}</td>
                  </tr>
                ` : ''}
                ${isSplitGst && taxAmt > 0 ? `
                  <tr style="color: #01a9fb;">
                    <td>CGST Tax (${halfRate}%)</td>
                    <td class="text-right font-mono">+₹${(taxAmt / 2).toFixed(2)}</td>
                  </tr>
                  <tr style="color: #01a9fb;">
                    <td>SGST Tax (${halfRate}%)</td>
                    <td class="text-right font-mono">+₹${(taxAmt / 2).toFixed(2)}</td>
                  </tr>
                ` : ''}
                ${isIgst && taxAmt > 0 ? `
                  <tr style="color: #01a9fb;">
                    <td>IGST Tax (${taxRate}%)</td>
                    <td class="text-right font-mono">+₹${taxAmt.toFixed(2)}</td>
                  </tr>
                ` : ''}
                <tr class="total-row">
                  <td>Net Payable Amount</td>
                  <td class="text-right font-mono">₹${totalAmt.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="color: #15803d;">Amount Paid</td>
                  <td class="text-right font-mono" style="color: #15803d; font-weight: 800;">₹${paidAmt.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="color: #be123c;">Balance Outstanding</td>
                  <td class="text-right font-mono" style="color: #be123c; font-weight: 800;">₹${dueAmt.toFixed(2)}</td>
                </tr>
              </table>
            </div>

            <div class="footer-section">
              <div>
                <p>System Generated Purchase Bill Voucher</p>
                <p>Printed on ${new Date().toLocaleString()}</p>
              </div>
              <div class="sig-box">
                Authorized Signatory
              </div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredSuppliers = safeSuppliers.filter(s =>
    (s?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s?.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSupplierStats = (supplierId: string) => {
    const supplierProducts = safeProducts.filter(p => p?.supplierId === supplierId);
    const totalItems = supplierProducts.reduce((acc, p) => acc + (Number(p?.saleStock) || 0) + (Number(p?.rentalStock) || 0), 0);
    const totalValue = supplierProducts.reduce((acc, p) => acc + ((Number(p?.purchasePrice) || 0) * ((Number(p?.saleStock) || 0) + (Number(p?.rentalStock) || 0))), 0);

    const bills = safeSupplierBills.filter(b => b?.supplierId === supplierId);
    const totalDue = bills.reduce((acc, b) => acc + Math.max(0, (Number(b?.totalAmount) || 0) - (Number(b?.paidAmount) || 0)), 0);

    return { productCount: supplierProducts.length, totalItems, totalValue, totalDue, bills };
  };

  const handleAddSupplier = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (supplierSaveStatus !== 'idle') return;
    setSupplierSaveStatus('saving');
    const formData = new FormData(e.currentTarget);
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, {
          name: formData.get('name') as string,
          contactPerson: formData.get('contactPerson') as string,
          phone: formData.get('phone') as string,
          email: formData.get('email') as string,
          address: formData.get('address') as string,
          location: formData.get('location') as string,
          category: formData.get('category') as string,
        });
      } else {
        await addSupplier({
          name: formData.get('name') as string,
          contactPerson: formData.get('contactPerson') as string,
          phone: formData.get('phone') as string,
          email: formData.get('email') as string,
          address: formData.get('address') as string,
          location: formData.get('location') as string,
          category: formData.get('category') as string,
        });
      }
      setSupplierSaveStatus('saved');
      setTimeout(() => {
        setIsAddModalOpen(false);
        setEditingSupplier(null);
        setSupplierSaveStatus('idle');
      }, 550);
    } catch (err: any) {
      console.error(err);
      setSupplierSaveStatus('saved');
      setTimeout(() => {
        setIsAddModalOpen(false);
        setEditingSupplier(null);
        setSupplierSaveStatus('idle');
      }, 550);
    }
  };

  const handleAddBill = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSupplier || addBillStatus !== 'idle') return;
    setAddBillStatus('saving');
    const formData = new FormData(e.currentTarget);

    const summary = computeBillSummary(
      billItems,
      billDiscountType,
      Number(billDiscountValue) || 0,
      billTaxType,
      Number(billTaxRate) || 0
    );

    let paid = 0;
    let status: 'UNPAID' | 'PARTIAL' | 'PAID' = 'UNPAID';
    if (billPaymentStatus === 'PAID') {
      paid = summary.finalTotal;
      status = 'PAID';
    } else if (billPaymentStatus === 'PARTIAL') {
      paid = Math.min(summary.finalTotal, Math.max(0, Number(billCustomPaidAmount) || 0));
      status = paid >= summary.finalTotal ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'UNPAID');
    } else {
      paid = 0;
      status = 'UNPAID';
    }

    const itemsForSubmit = billItems
      .filter(item => item.itemName.trim() !== '')
      .map(item => ({
        itemName: item.itemName,
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        total: item.total
      }));

    const billData = {
      supplierId: selectedSupplier.id,
      billNumber: formData.get('billNumber') as string,
      date: formData.get('date') as string,
      subtotal: summary.subtotal,
      discountType: billDiscountType !== 'NONE' ? billDiscountType : undefined,
      discountValue: billDiscountType !== 'NONE' ? Number(billDiscountValue) || 0 : undefined,
      discountAmount: summary.discountAmount,
      taxType: billTaxType,
      taxRate: billTaxType !== 'NONE' ? Number(billTaxRate) || 0 : undefined,
      taxAmount: summary.taxAmount,
      totalAmount: summary.finalTotal,
      paidAmount: paid,
      status,
      notes: formData.get('notes') as string,
      items: itemsForSubmit
    };
    const imageFile = billImageFile || undefined;

    try {
      await addSupplierBill(billData, imageFile);
      setAddBillStatus('saved');
      setTimeout(() => {
        setIsAddBillOpen(false);
        setIsEditBillOpen(false);
        setEditingBill(null);
        setViewingBillDetails(null);
        setIsLedgerOpen(false);
        setSelectedSupplier(null);
        setBillItems([{ itemName: '', quantity: '1', unitPrice: '', total: 0 }]);
        setBillDiscountType('NONE');
        setBillDiscountValue('0');
        setBillTaxType('NONE');
        setBillTaxRate('12');
        setBillPaymentStatus('UNPAID');
        setBillCustomPaidAmount('0');
        setBillImageFile(null);
        setAddBillStatus('idle');
      }, 550);
    } catch (err: any) {
      console.error('Failed to save bill:', err);
      setAddBillStatus('saved');
      setTimeout(() => {
        setIsAddBillOpen(false);
        setIsLedgerOpen(false);
        setSelectedSupplier(null);
        setAddBillStatus('idle');
      }, 550);
    }
  };

  const handleOpenEditBill = (bill: SupplierBill) => {
    setEditingBill(bill);
    const items = bill.items && bill.items.length > 0
      ? bill.items.map(i => ({ itemName: i.itemName, quantity: String(i.quantity), unitPrice: String(i.unitPrice), total: i.total }))
      : [{ itemName: '', quantity: '1', unitPrice: '', total: 0 }];
    setBillItems(items);

    const subtotal = bill.subtotal !== undefined && bill.subtotal > 0
      ? bill.subtotal
      : items.reduce((acc, i) => acc + (Number(i.total) || 0), 0);
    
    const discountAmt = bill.discountAmount || 0;
    const taxableAmt = Math.max(0, subtotal - discountAmt);
    const hasTaxDifference = bill.totalAmount > taxableAmt && taxableAmt > 0;
    const inferredTaxRate = bill.taxRate || (hasTaxDifference ? Math.round(((bill.totalAmount - taxableAmt) / taxableAmt) * 100) : 12);

    setBillDiscountType(bill.discountType || (discountAmt > 0 ? 'FIXED' : 'NONE'));
    setBillDiscountValue(String(bill.discountValue !== undefined ? bill.discountValue : (discountAmt || '0')));
    setBillTaxType(bill.taxType || (hasTaxDifference ? 'SPLIT_GST' : 'NONE'));
    setBillTaxRate(String(inferredTaxRate));
    setBillPaymentStatus(bill.status);
    setBillCustomPaidAmount(String(bill.paidAmount || '0'));
    setBillImageFile(null);
    setIsEditBillOpen(true);
  };

  const handleUpdateBill = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingBill || editBillStatus !== 'idle') return;
    setEditBillStatus('updating');
    const formData = new FormData(e.currentTarget);

    const summary = computeBillSummary(
      billItems,
      billDiscountType,
      Number(billDiscountValue) || 0,
      billTaxType,
      Number(billTaxRate) || 0
    );

    let paid = 0;
    let status: 'UNPAID' | 'PARTIAL' | 'PAID' = 'UNPAID';
    if (billPaymentStatus === 'PAID') {
      paid = summary.finalTotal;
      status = 'PAID';
    } else if (billPaymentStatus === 'PARTIAL') {
      paid = Math.min(summary.finalTotal, Math.max(0, Number(billCustomPaidAmount) || 0));
      status = paid >= summary.finalTotal ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'UNPAID');
    } else {
      paid = 0;
      status = 'UNPAID';
    }

    const itemsForSubmit = billItems
      .filter(item => item.itemName.trim() !== '')
      .map(item => ({
        itemName: item.itemName,
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        total: item.total
      }));

    const updateData = {
      supplierId: editingBill.supplierId,
      billNumber: formData.get('billNumber') as string,
      date: formData.get('date') as string,
      subtotal: summary.subtotal,
      discountType: billDiscountType !== 'NONE' ? billDiscountType : undefined,
      discountValue: billDiscountType !== 'NONE' ? Number(billDiscountValue) || 0 : undefined,
      discountAmount: summary.discountAmount,
      taxType: billTaxType,
      taxRate: billTaxType !== 'NONE' ? Number(billTaxRate) || 0 : undefined,
      taxAmount: summary.taxAmount,
      totalAmount: summary.finalTotal,
      paidAmount: paid,
      status,
      notes: formData.get('notes') as string,
      items: itemsForSubmit
    };
    const billId = editingBill.id;
    const imageFile = billImageFile || undefined;

    try {
      await updateSupplierBill(billId, updateData, imageFile);
      setEditBillStatus('updated');
      setTimeout(() => {
        setIsEditBillOpen(false);
        setIsAddBillOpen(false);
        setEditingBill(null);
        setViewingBillDetails(null);
        setIsLedgerOpen(false);
        setSelectedSupplier(null);
        setBillItems([{ itemName: '', quantity: '1', unitPrice: '', total: 0 }]);
        setBillDiscountType('NONE');
        setBillDiscountValue('0');
        setBillTaxType('NONE');
        setBillTaxRate('12');
        setBillPaymentStatus('UNPAID');
        setBillCustomPaidAmount('0');
        setBillImageFile(null);
        setEditBillStatus('idle');
      }, 550);
    } catch (err: any) {
      console.error('Failed to update bill:', err);
      setEditBillStatus('updated');
      setTimeout(() => {
        setIsEditBillOpen(false);
        setIsLedgerOpen(false);
        setSelectedSupplier(null);
        setEditBillStatus('idle');
      }, 550);
    }
  };

  const handleDeleteBill = async (billId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this purchase bill record?')) {
      try {
        await deleteSupplierBill(billId);
        setViewingBillDetails(null);
        setIsEditBillOpen(false);
        setEditingBill(null);
      } catch (err: any) {
        console.error('Failed to delete bill:', err);
      }
    }
  };

  const updateBillItem = (index: number, field: string, value: string) => {
    const newItems = [...billItems];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      const qty = Number(newItems[index].quantity) || 0;
      const price = Number(newItems[index].unitPrice) || 0;
      newItems[index].total = qty * price;
    }
    setBillItems(newItems);
  };

  const addBillItemRow = () => {
    setBillItems([...billItems, { itemName: '', quantity: '1', unitPrice: '', total: 0 }]);
  };

  const removeBillItemRow = (index: number) => {
    if (billItems.length > 1) {
      setBillItems(billItems.filter((_, i) => i !== index));
    }
  };

  const handleRecordPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!paymentBill || paymentSaveStatus !== 'idle') return;
    setPaymentSaveStatus('saving');
    try {
      const formData = new FormData(e.currentTarget);
      const amount = Number(formData.get('amount'));
      await addPaymentToSupplierBill(paymentBill.id, amount);
      setPaymentSaveStatus('saved');
      setTimeout(() => {
        setIsPaymentOpen(false);
        setPaymentBill(null);
        setPaymentSaveStatus('idle');
      }, 550);
    } catch (err: any) {
      console.error('Failed to record payment:', err);
      setPaymentSaveStatus('saved');
      setTimeout(() => {
        setIsPaymentOpen(false);
        setPaymentBill(null);
        setPaymentSaveStatus('idle');
      }, 550);
    }
  };

  const openLedger = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsLedgerOpen(true);
  };

  const totalVendorDue = safeSupplierBills.reduce((acc, b) => acc + Math.max(0, (Number(b?.totalAmount) || 0) - (Number(b?.paidAmount) || 0)), 0);
  const pendingBillsCount = safeSupplierBills.filter(b => b?.status !== 'PAID').length;
  const totalProcurementSpend = safeSupplierBills.reduce((acc, b) => acc + (Number(b?.totalAmount) || 0), 0);

  return (
    <div className="space-y-5 animate-nano pb-20 max-w-[1600px] mx-auto">
      {/* ── Executive Header ── */}
      <div className="bg-white border border-slate-200/80 rounded-md p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-[#fe569f] text-white flex items-center justify-center shadow-xs shrink-0">
            <Building2 size={20} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">Suppliers & Purchase Bills</h1>
              <span className="text-[10px] font-extrabold text-[#fe569f] bg-[#fe569f]/10 border border-[#fe569f]/30 px-2 py-0.5 rounded-md">
                {safeSuppliers.length} Active Vendors
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Manage procurement vendors, incoming purchase bills, and payment ledgers</p>
          </div>
        </div>

        <button
          onClick={() => { setEditingSupplier(null); setIsAddModalOpen(true); }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#fe569f] hover:bg-[#eb4890] text-white text-xs font-extrabold uppercase tracking-wider rounded-md shadow-xs transition-all active:scale-95"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>New Supplier</span>
        </button>
      </div>

      {/* ── Relevant KPI Cards with Info Icons ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        {/* Card 1: Registered Vendors */}
        <div className="bg-white hover:bg-slate-50/60 p-4 sm:p-4.5 rounded-xl border border-slate-200/90 hover:border-[#fe569f]/40 shadow-2xs transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <span>Active Vendors</span>
              <span className="text-slate-400 hover:text-slate-600 cursor-help" title="Total registered wholesale suppliers, distributors, and manufacturers in your store.">
                <Info size={12} strokeWidth={2.2} />
              </span>
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#fe569f]/10 text-[#fe569f] flex items-center justify-center font-black text-xs shrink-0">
              <Building2 size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">{safeSuppliers.length}</h3>
            <p className="text-[11px] font-extrabold text-[#fe569f] mt-1.5 flex items-center gap-1">
              <span>Procurement partners</span>
            </p>
          </div>
        </div>

        {/* Card 2: Recorded Purchase Bills */}
        <div className="bg-white hover:bg-slate-50/60 p-4 sm:p-4.5 rounded-xl border border-slate-200/90 hover:border-[#01a9fb]/40 shadow-2xs transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <span>Purchase Bills</span>
              <span className="text-slate-400 hover:text-slate-600 cursor-help" title="Total count of inward vendor purchase bills & GST invoices entered into your store ledger.">
                <Info size={12} strokeWidth={2.2} />
              </span>
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#01a9fb]/10 text-[#01a9fb] flex items-center justify-center font-black text-xs shrink-0">
              <FileText size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">{safeSupplierBills.length}</h3>
            <p className="text-[11px] font-extrabold text-[#01a9fb] mt-1.5">Inward vendor invoices</p>
          </div>
        </div>

        {/* Card 3: Total Outstanding Vendor Due */}
        <div className="bg-white hover:bg-slate-50/60 p-4 sm:p-4.5 rounded-xl border border-slate-200/90 hover:border-rose-300 shadow-2xs transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <span>Outstanding Due</span>
              <span className="text-slate-400 hover:text-slate-600 cursor-help" title="Total unpaid balance amount owed by your store across all pending vendor bills.">
                <Info size={12} strokeWidth={2.2} />
              </span>
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center font-black text-xs shrink-0">
              <CreditCard size={16} />
            </div>
          </div>
          <div>
            <h3 className={`text-2xl sm:text-3xl font-black tracking-tight leading-none font-mono ${totalVendorDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {formatCurrency(totalVendorDue)}
            </h3>
            <p className="text-[11px] font-extrabold text-rose-500 mt-1.5">
              {pendingBillsCount} {pendingBillsCount === 1 ? 'bill pending payment' : 'bills pending payment'}
            </p>
          </div>
        </div>

        {/* Card 4: Total Procurement Spend */}
        <div className="bg-white hover:bg-slate-50/60 p-4 sm:p-4.5 rounded-xl border border-slate-200/90 hover:border-emerald-300 shadow-2xs transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <span>Total Sourced Spend</span>
              <span className="text-slate-400 hover:text-slate-600 cursor-help" title="Total monetary value spent on inventory stock and goods purchased from vendors.">
                <Info size={12} strokeWidth={2.2} />
              </span>
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-black text-xs shrink-0">
              <Boxes size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none font-mono">{formatCurrency(totalProcurementSpend)}</h3>
            <p className="text-[11px] font-extrabold text-emerald-600 mt-1.5">Total stock purchase spend</p>
          </div>
        </div>
      </div>

      {/* ── Search Input ── */}
      <div className="relative group max-w-lg">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#fe569f] transition-colors" size={15} strokeWidth={2.5} />
        <input
          type="text"
          placeholder="Search suppliers by name or contact person..."
          className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200/80 rounded-md text-xs font-bold text-slate-900 outline-none focus:border-[#fe569f] focus:ring-2 focus:ring-[#fe569f]/10 transition-all shadow-xs placeholder:text-slate-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* ── Supplier Cards Grid (Minimalist Sleek Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
        {filteredSuppliers.map(supplier => {
          const stats = getSupplierStats(supplier.id);
          const hasDue = stats.totalDue > 0;

          return (
            <div
              key={supplier.id}
              onClick={() => openLedger(supplier)}
              className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between group cursor-pointer space-y-3"
            >
              <div className="space-y-2.5">
                {/* Header: Initial Avatar, Supplier Name, Category Badge & Action Icons */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                      {(supplier.name || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug group-hover:text-[#fe569f] transition-colors truncate" title={supplier.name}>
                        {supplier.name}
                      </h3>
                      <p className="text-[10px] font-semibold text-slate-400 truncate mt-0.5">
                        {supplier.contactPerson ? `Attn: ${supplier.contactPerson}` : (supplier.category || 'Vendor')}
                      </p>
                    </div>
                  </div>

                  {/* Header Edit & Delete Quick Icons */}
                  <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => { setEditingSupplier(supplier); setIsAddModalOpen(true); }}
                      className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit Supplier Profile"
                    >
                      <Pencil size={13} strokeWidth={2} />
                    </button>

                    {settings?.enableDeleteSuppliers && (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to permanently delete supplier "${supplier.name}"?`)) {
                            await deleteSupplier(supplier.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Supplier"
                      >
                        <Trash2 size={13} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Minimalist Contact & Location Details */}
                <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                  {supplier.phone && (
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 truncate">
                      <Phone size={12} strokeWidth={2} className="text-slate-400 shrink-0" />
                      <span className="truncate">{supplier.phone}</span>
                    </div>
                  )}

                  {supplier.email && (
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 truncate">
                      <Mail size={11} strokeWidth={2} className="text-slate-400 shrink-0" />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  )}

                  {supplier.location && (
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 truncate">
                      <MapPin size={11} strokeWidth={2} className="text-slate-400 shrink-0" />
                      <span className="truncate">{supplier.location}</span>
                    </div>
                  )}
                </div>

                {/* Minimalist Stats Summary Row */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
                  <span className="font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                    {stats.productCount} SKUs • {stats.bills.length} Bills
                  </span>

                  <span className={`font-mono font-black px-2 py-0.5 rounded-md border text-[10px] ${
                    hasDue ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {hasDue ? `Due: ${formatCurrency(stats.totalDue)}` : 'Clear'}
                  </span>
                </div>
              </div>

              {/* Minimalist Ledger Trigger Button */}
              <button
                type="button"
                onClick={() => openLedger(supplier)}
                className="w-full py-2 bg-slate-50 hover:bg-[#fe569f] text-slate-700 hover:text-white border border-slate-200/80 hover:border-[#fe569f] rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 shadow-2xs group-hover:bg-[#fe569f] group-hover:text-white group-hover:border-[#fe569f]"
              >
                <span>View Ledger</span>
                <ArrowRight size={12} strokeWidth={2.5} />
              </button>
            </div>
          );
        })}
      </div>

      {filteredSuppliers.length === 0 && (
        <div className="py-14 text-center bg-white rounded-[6px] border border-slate-200/80 shadow-xs">
          <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-[6px] flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Building2 size={22} strokeWidth={2} />
          </div>
          <p className="text-slate-700 text-sm font-extrabold">No suppliers found</p>
          <p className="text-slate-400 text-xs mt-0.5">Try searching with another vendor name</p>
        </div>
      )}

      {/* ── Add/Edit Supplier Modal ── */}
      <Modal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); setEditingSupplier(null); }} title={editingSupplier ? "Edit Supplier Profile" : "Register New Supplier"}>
        <form onSubmit={handleAddSupplier} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Company Name *</label>
            <input name="name" defaultValue={editingSupplier?.name || ''} required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-[6px] outline-none font-bold text-xs text-slate-900" placeholder="e.g. ABC Textiles Pvt Ltd" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Contact Person *</label>
              <input name="contactPerson" defaultValue={editingSupplier?.contactPerson || ''} required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-[6px] outline-none font-bold text-xs text-slate-900" placeholder="Name" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Phone *</label>
              <input
                name="phone"
                defaultValue={editingSupplier?.phone || ''}
                required
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={15}
                onInput={(e: React.FormEvent<HTMLInputElement>) => {
                  e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '');
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-[6px] outline-none font-bold text-xs text-slate-900 font-mono"
                placeholder="Phone number (digits only)"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Email Address</label>
            <input name="email" type="email" defaultValue={editingSupplier?.email || ''} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-[6px] outline-none font-bold text-xs text-slate-900" placeholder="email@company.com" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Location / City</label>
              <input name="location" defaultValue={editingSupplier?.location || ''} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-[6px] outline-none font-bold text-xs text-slate-900" placeholder="City or Region" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Category</label>
              <input name="category" defaultValue={editingSupplier?.category || ''} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-[6px] outline-none font-bold text-xs text-slate-900" placeholder="e.g. Traditional Wear, Western" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Address</label>
            <textarea name="address" defaultValue={editingSupplier?.address || ''} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-[6px] outline-none font-bold text-xs text-slate-900 h-16 resize-none" placeholder="Full office address"></textarea>
          </div>

          <div className="flex gap-2 pt-2">
            {editingSupplier && (
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm(`Are you sure you want to permanently delete supplier "${editingSupplier.name}"?`)) {
                    await deleteSupplier(editingSupplier.id);
                    setIsAddModalOpen(false);
                    setEditingSupplier(null);
                  }
                }}
                className="py-2.5 px-3 rounded-[6px] font-bold uppercase tracking-wider text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 flex items-center gap-1.5 transition-colors"
                title="Delete Supplier"
              >
                <Trash2 size={13} strokeWidth={2.2} />
                <span>Delete</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => { setIsAddModalOpen(false); setEditingSupplier(null); }}
              className="flex-1 py-2.5 rounded-[6px] font-bold uppercase tracking-wider text-xs text-slate-600 hover:bg-slate-50 border border-slate-200"
              disabled={supplierSaveStatus !== 'idle'}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={supplierSaveStatus !== 'idle'}
              className={`flex-1 py-2.5 rounded-[6px] font-extrabold uppercase tracking-wider text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 ${
                supplierSaveStatus === 'saved'
                  ? 'bg-emerald-600 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                  : supplierSaveStatus === 'saving'
                  ? 'bg-[#eb4890] text-white opacity-90 cursor-wait'
                  : 'bg-[#fe569f] hover:bg-[#eb4890] text-white'
              }`}
            >
              {supplierSaveStatus === 'saved' ? (
                <>
                  <Check size={16} strokeWidth={3} className="text-white animate-bounce" />
                  <span>{editingSupplier ? 'Updated!' : 'Saved!'}</span>
                </>
              ) : supplierSaveStatus === 'saving' ? (
                <span>{editingSupplier ? 'Updating...' : 'Saving...'}</span>
              ) : (
                <span>{editingSupplier ? 'Update Supplier' : 'Save Supplier'}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Ledger Modal ── */}
      {selectedSupplier && (
        <Modal isOpen={isLedgerOpen} onClose={() => { setIsLedgerOpen(false); setSelectedSupplier(null); }} title={`${selectedSupplier.name} — Purchase Bills Ledger`} size="xl">
          <div className="space-y-4 text-left">
            {/* Header Summary Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Building2 size={16} className="text-[#fe569f]" />
                  <span>Vendor Purchase Ledger</span>
                </h3>
                <p className="text-xs font-bold text-slate-500 mt-1">
                  Total Outstanding Balance: <span className="text-rose-600 font-extrabold font-mono text-sm">{formatCurrency(getSupplierStats(selectedSupplier.id).totalDue)}</span>
                </p>
              </div>
              <button
                onClick={() => setIsAddBillOpen(true)}
                className="px-4 py-2 bg-[#fe569f] hover:bg-[#eb4890] text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs shrink-0"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>Record Purchase Bill</span>
              </button>
            </div>

            {/* Bills List (Compact Sleek Rows - Line Items shown inside View Details modal) */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {getSupplierStats(selectedSupplier.id).bills.map(bill => {
                const isPaid = bill.status === 'PAID';
                const isPartial = bill.status === 'PARTIAL';
                const dueAmount = bill.totalAmount - bill.paidAmount;
                const itemCount = bill.items ? bill.items.length : 0;

                return (
                  <div key={bill.id} className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs hover:border-[#01a9fb]/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    {/* Left: Bill #, Date, Item Count, Status */}
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-black text-xs shrink-0">
                        <FileText size={17} className="text-slate-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-sm text-slate-900">#{bill.billNumber}</span>
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md border ${
                            isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            isPartial ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {bill.status}
                          </span>
                          {itemCount > 0 && (
                            <span className="px-2 py-0.5 text-[9px] font-extrabold text-slate-500 bg-slate-100 border border-slate-200 rounded-md">
                              {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                          Date: {new Date(bill.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    {/* Middle: Financial Quick Summary */}
                    <div className="flex items-center gap-4 text-right ml-auto sm:ml-0">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Net Total</span>
                        <span className="font-mono font-black text-xs sm:text-sm text-slate-900">{formatCurrency(bill.totalAmount)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Paid</span>
                        <span className="font-mono font-bold text-xs text-emerald-700">{formatCurrency(bill.paidAmount)}</span>
                      </div>
                      {dueAmount > 0 && (
                        <div>
                          <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider block">Due</span>
                          <span className="font-mono font-black text-xs sm:text-sm text-rose-600">{formatCurrency(dueAmount)}</span>
                        </div>
                      )}
                    </div>

                    {/* Right: Sleek Action Icons Bar */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => setViewingBillDetails(bill)}
                        className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-all flex items-center gap-1.5 shadow-2xs"
                        title="View Full Bill Details & Line Items"
                      >
                        <Eye size={14} className="text-slate-600" />
                        <span>View</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadPurchaseBill(bill, selectedSupplier || undefined)}
                        className="p-2 text-[#01a9fb] bg-[#01a9fb]/10 hover:bg-[#01a9fb]/20 border border-[#01a9fb]/30 rounded-lg transition-all"
                        title="Download PDF Voucher / Print Bill"
                      >
                        <Download size={14} strokeWidth={2.2} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditBill(bill)}
                        className="p-2 text-[#fe569f] bg-[#fe569f]/10 hover:bg-[#fe569f]/20 border border-[#fe569f]/30 rounded-lg transition-all"
                        title="Edit Purchase Bill"
                      >
                        <Pencil size={14} strokeWidth={2.2} />
                      </button>

                      {bill.status !== 'PAID' && (
                        <button
                          type="button"
                          onClick={() => { setPaymentBill(bill); setIsPaymentOpen(true); }}
                          className="px-2.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all shadow-2xs flex items-center gap-1"
                          title="Record Payment for Outstanding Due"
                        >
                          <CreditCard size={13} />
                          <span>Pay</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteBill(bill.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Bill Record"
                      >
                        <Trash2 size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {getSupplierStats(selectedSupplier.id).bills.length === 0 && (
                <div className="py-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  No purchase bills recorded for this vendor yet
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ── Add Bill Modal ── */}
      <Modal isOpen={isAddBillOpen} onClose={() => setIsAddBillOpen(false)} title="Record New Purchase Bill" size="lg" zIndex={110}>
        <form onSubmit={handleAddBill} className="space-y-4">
          {/* ── Section 1: Invoice Header Details ── */}
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
            <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-[#fe569f] text-white flex items-center justify-center text-[10px] font-extrabold">1</span>
              Invoice Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1">
                  Bill / Invoice Number <span className="text-rose-500 font-black">*</span>
                </label>
                <input
                  name="billNumber"
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-[#fe569f] rounded-lg outline-none font-extrabold text-xs text-slate-900 shadow-2xs placeholder:font-normal placeholder:text-slate-400"
                  placeholder="e.g. INV-2026-001"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1">
                  Invoice Date <span className="text-rose-500 font-black">*</span>
                </label>
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-[#fe569f] rounded-lg outline-none font-extrabold text-xs text-slate-900 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* ── Section 2: Itemized Line Items ── */}
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-[#01a9fb] text-white flex items-center justify-center text-[10px] font-extrabold">2</span>
                Purchase Items List
              </h4>
              <span className="text-[10px] font-extrabold text-[#01a9fb] bg-[#01a9fb]/10 border border-[#01a9fb]/30 px-2 py-0.5 rounded-md uppercase">
                {billItems.length} {billItems.length === 1 ? 'Item' : 'Items'} Added
              </span>
            </div>

            {/* Line Items Table Header */}
            <div className="hidden sm:flex items-center gap-2 px-2 text-[10px] font-black uppercase text-slate-400 tracking-wider">
              <span className="flex-1">Item Description / SKU</span>
              <span className="w-24 text-center">Qty</span>
              <span className="w-32 text-left">Unit Rate</span>
              <span className="w-24 text-right pr-2">Amount</span>
              <span className="w-7"></span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
              {billItems.map((item, index) => (
                <div key={index} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                  <input
                    type="text"
                    required
                    value={item.itemName}
                    onChange={e => updateBillItem(index, 'itemName', e.target.value)}
                    placeholder="Item description / SKU (e.g. Baby Frock 2-3Y)"
                    className="flex-1 px-2.5 py-1.5 bg-slate-50 focus:bg-white rounded-md border border-slate-200 focus:border-[#01a9fb] outline-none font-bold text-xs text-slate-900"
                  />
                  <input
                    type="number"
                    required
                    min="1"
                    value={item.quantity}
                    onChange={e => updateBillItem(index, 'quantity', e.target.value)}
                    placeholder="Qty"
                    title="Quantity"
                    className="w-24 min-w-[5.5rem] px-2 py-1.5 bg-slate-50 focus:bg-white rounded-md border border-slate-200 focus:border-[#01a9fb] outline-none font-black text-xs text-slate-900 text-center"
                  />
                  <div className="relative w-32 shrink-0">
                    <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={e => updateBillItem(index, 'unitPrice', e.target.value)}
                      placeholder="Rate / Pcs"
                      title="Unit Price"
                      className="w-full pl-6 pr-2 py-1.5 bg-slate-50 focus:bg-white rounded-md border border-slate-200 focus:border-[#01a9fb] outline-none font-extrabold text-xs text-slate-900"
                    />
                  </div>
                  <div className="w-24 text-right font-mono font-black text-xs text-slate-900 pr-1">
                    {formatCurrency(item.total)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBillItemRow(index)}
                    className={`p-1.5 rounded-md transition-colors ${billItems.length > 1 ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-200 cursor-not-allowed'}`}
                    title="Delete row"
                  >
                    <Trash2 size={13} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addBillItemRow}
              className="w-full py-2 border-2 border-dashed border-slate-300 hover:border-[#01a9fb] rounded-lg text-xs font-black uppercase tracking-wider text-slate-600 hover:text-[#01a9fb] hover:bg-[#01a9fb]/5 transition-all"
            >
              + Add Another Line Item
            </button>
          </div>

          {/* ── Section 3: Discounts & Taxes (Stacked 2-Line Cards) ── */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-[#fe569f] text-white flex items-center justify-center text-[10px] font-extrabold">3</span>
              Discounts & Taxes
            </h4>

            {/* 1. Discount Card */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
              {/* Row 1: Header + Mode Switcher */}
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                  Discount
                </span>
                <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => { setBillDiscountType('NONE'); setBillDiscountValue('0'); }}
                    className={`px-2.5 py-0.5 rounded-md transition-all ${billDiscountType === 'NONE' ? 'bg-slate-900 text-white font-black shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    No Discount
                  </button>
                  <button
                    type="button"
                    onClick={() => { setBillDiscountType('PERCENT'); if (billDiscountValue === '0') setBillDiscountValue('5'); }}
                    className={`px-2.5 py-0.5 rounded-md transition-all ${billDiscountType === 'PERCENT' ? 'bg-[#fe569f] text-white font-black shadow-xs' : 'text-slate-500 hover:text-[#fe569f]'}`}
                  >
                    % Rate
                  </button>
                  <button
                    type="button"
                    onClick={() => { setBillDiscountType('FIXED'); if (billDiscountValue === '0') setBillDiscountValue('100'); }}
                    className={`px-2.5 py-0.5 rounded-md transition-all ${billDiscountType === 'FIXED' ? 'bg-[#fe569f] text-white font-black shadow-xs' : 'text-slate-500 hover:text-[#fe569f]'}`}
                  >
                    ₹ Flat
                  </button>
                </div>
              </div>

              {/* Row 2: Input + Presets + Dynamic Deduction Summary */}
              {billDiscountType !== 'NONE' ? (
                <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                  <div className="relative w-44 shrink-0">
                    <input
                      type="number"
                      min="0"
                      step={billDiscountType === 'PERCENT' ? '0.5' : '1'}
                      value={billDiscountValue}
                      onChange={e => setBillDiscountValue(e.target.value)}
                      placeholder={billDiscountType === 'PERCENT' ? 'Discount %' : 'Discount ₹'}
                      className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-[#fe569f]/30 focus:bg-white focus:border-[#fe569f] rounded-lg outline-none font-black text-xs text-[#fe569f] shadow-2xs"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-[#fe569f] bg-[#fe569f]/10 px-1.5 py-0.5 rounded">
                      {billDiscountType === 'PERCENT' ? '%' : '₹'}
                    </span>
                  </div>

                  {billDiscountType === 'PERCENT' && (
                    <div className="flex items-center gap-1.5 flex-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">Presets:</span>
                      {['3', '5', '10', '15', '20'].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setBillDiscountValue(val)}
                          className={`px-2.5 py-1 rounded-md text-xs font-black transition-all ${billDiscountValue === val ? 'bg-[#fe569f] text-white shadow-2xs' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:border-[#fe569f]/40'}`}
                        >
                          {val}%
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Calculated Deduction Display */}
                  {(() => {
                    const summary = computeBillSummary(
                      billItems,
                      billDiscountType,
                      Number(billDiscountValue) || 0,
                      billTaxType,
                      Number(billTaxRate) || 0
                    );
                    return summary.discountAmount > 0 ? (
                      <div className="ml-auto text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Discount Deduction:</span>
                        <p className="text-xs font-black font-mono text-[#fe569f]">-{formatCurrency(summary.discountAmount)}</p>
                      </div>
                    ) : null;
                  })()}
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-medium italic">No discount applied to this bill.</p>
              )}
            </div>

            {/* 2. GST Card */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
              {/* Row 1: Header + Tax Mode Switcher */}
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                  GST
                </span>
                <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setBillTaxType('NONE')}
                    className={`px-2.5 py-0.5 rounded-md transition-all ${billTaxType === 'NONE' ? 'bg-slate-900 text-white font-black shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    Without GST
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillTaxType('SPLIT_GST')}
                    className={`px-2.5 py-0.5 rounded-md transition-all ${billTaxType === 'SPLIT_GST' ? 'bg-[#01a9fb] text-white font-black shadow-xs' : 'text-slate-500 hover:text-[#01a9fb]'}`}
                    title="CGST + SGST (Intrastate purchase)"
                  >
                    CGST + SGST
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillTaxType('GST')}
                    className={`px-2.5 py-0.5 rounded-md transition-all ${billTaxType === 'GST' ? 'bg-[#01a9fb] text-white font-black shadow-xs' : 'text-slate-500 hover:text-[#01a9fb]'}`}
                    title="IGST (Interstate vendor purchase)"
                  >
                    IGST / Full GST
                  </button>
                </div>
              </div>

              {/* Row 2: Slab Presets & Custom Rate + Explicit CGST/SGST amounts */}
              {billTaxType !== 'NONE' ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                    {/* Preset Slab Chips */}
                    <div className="flex items-center gap-1.5 flex-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">Slabs:</span>
                      {['5', '12', '18', '28'].map(rate => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setBillTaxRate(rate)}
                          className={`flex-1 py-1 text-xs font-black rounded-md border transition-all ${billTaxRate === rate ? 'bg-[#01a9fb] text-white shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-[#01a9fb]/40'}`}
                        >
                          {rate}%
                        </button>
                      ))}
                    </div>

                    {/* Custom Rate Input */}
                    <div className="relative w-28 shrink-0">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={billTaxRate}
                        onChange={e => setBillTaxRate(e.target.value)}
                        placeholder="Custom %"
                        title="Custom GST Rate %"
                        className="w-full pl-3 pr-7 py-1 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-lg outline-none font-black text-xs text-slate-900 text-center shadow-2xs"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 pointer-events-none">
                        %
                      </span>
                    </div>
                  </div>

                  {/* Explicit Calculated CGST and SGST Amount Cards */}
                  {(() => {
                    const summary = computeBillSummary(
                      billItems,
                      billDiscountType,
                      Number(billDiscountValue) || 0,
                      billTaxType,
                      Number(billTaxRate) || 0
                    );
                    const halfRate = (Number(billTaxRate) || 0) / 2;

                    if (billTaxType === 'SPLIT_GST') {
                      return (
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
                          <div className="p-2 bg-[#01a9fb]/10 rounded-lg border border-[#01a9fb]/20 flex items-center justify-between">
                            <span className="font-extrabold text-[#01a9fb]">CGST ({halfRate}%):</span>
                            <span className="font-black font-mono text-[#01a9fb]">+{formatCurrency(summary.cgstAmount)}</span>
                          </div>
                          <div className="p-2 bg-[#01a9fb]/10 rounded-lg border border-[#01a9fb]/20 flex items-center justify-between">
                            <span className="font-extrabold text-[#01a9fb]">SGST ({halfRate}%):</span>
                            <span className="font-black font-mono text-[#01a9fb]">+{formatCurrency(summary.sgstAmount)}</span>
                          </div>
                        </div>
                      );
                    } else if (billTaxType === 'GST') {
                      return (
                        <div className="p-2 bg-[#01a9fb]/10 rounded-lg border border-[#01a9fb]/20 flex items-center justify-between text-xs pt-1">
                          <span className="font-extrabold text-[#01a9fb]">IGST Integrated Tax ({billTaxRate}%):</span>
                          <span className="font-black font-mono text-[#01a9fb]">+{formatCurrency(summary.igstAmount)}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-medium italic">Purchased without tax (Composition scheme / 0% GST).</p>
              )}
            </div>
          </div>

          {/* ── Section 4: Settlement Mode & Full Financial Breakdown ── */}
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
            <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-[#01a9fb] text-white flex items-center justify-center text-[10px] font-extrabold">4</span>
              Payment & Settlement
            </h4>

            {/* Segmented Settlement Mode Pills */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setBillPaymentStatus('UNPAID')}
                className={`py-2 px-3 rounded-lg border text-center transition-all ${billPaymentStatus === 'UNPAID'
                  ? 'bg-rose-500 text-white border-rose-600 font-black shadow-xs'
                  : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700 font-bold'
                  }`}
              >
                <div className="text-xs uppercase tracking-wider">On Credit</div>
                <div className="text-[10px] opacity-80 font-medium">100% Unpaid</div>
              </button>

              <button
                type="button"
                onClick={() => setBillPaymentStatus('PAID')}
                className={`py-2 px-3 rounded-lg border text-center transition-all ${billPaymentStatus === 'PAID'
                  ? 'bg-emerald-600 text-white border-emerald-700 font-black shadow-xs'
                  : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700 font-bold'
                  }`}
              >
                <div className="text-xs uppercase tracking-wider">Fully Paid</div>
                <div className="text-[10px] opacity-80 font-medium">100% Settled</div>
              </button>

              <button
                type="button"
                onClick={() => setBillPaymentStatus('PARTIAL')}
                className={`py-2 px-3 rounded-lg border text-center transition-all ${billPaymentStatus === 'PARTIAL'
                  ? 'bg-amber-500 text-white border-amber-600 font-black shadow-xs'
                  : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700 font-bold'
                  }`}
              >
                <div className="text-xs uppercase tracking-wider">Partial / Adv</div>
                <div className="text-[10px] opacity-80 font-medium">Token Advance</div>
              </button>
            </div>

            {/* If Partial, advance input */}
            {billPaymentStatus === 'PARTIAL' && (
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 flex items-center gap-2">
                <label className="text-xs font-black uppercase text-amber-900 tracking-wider shrink-0">
                  Advance Amount Paid Now:
                </label>
                <div className="relative flex-1">
                  <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={billCustomPaidAmount}
                    onChange={e => setBillCustomPaidAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-white border border-amber-300 focus:border-amber-500 rounded-md outline-none font-black text-sm text-slate-900"
                    placeholder="Enter advance amount"
                  />
                </div>
              </div>
            )}

            {/* Full Financial Breakdown Table Card */}
            {(() => {
              const summary = computeBillSummary(
                billItems,
                billDiscountType,
                Number(billDiscountValue) || 0,
                billTaxType,
                Number(billTaxRate) || 0
              );
              let paidVal = 0;
              if (billPaymentStatus === 'PAID') paidVal = summary.finalTotal;
              else if (billPaymentStatus === 'PARTIAL') paidVal = Math.min(summary.finalTotal, Math.max(0, Number(billCustomPaidAmount) || 0));
              const dueVal = Math.max(0, summary.finalTotal - paidVal);

              return (
                <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-2.5 shadow-md">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                    <span>Calculated Summary Breakdown</span>
                    <span className="text-[#01a9fb] font-bold">Live Auto-Calculated</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Subtotal</span>
                      <span className="font-black font-mono text-white text-sm">{formatCurrency(summary.subtotal)}</span>
                    </div>

                    {summary.discountAmount > 0 && (
                      <div>
                        <span className="text-[#fe569f] font-bold block text-[10px] uppercase">Discount</span>
                        <span className="font-black font-mono text-[#fe569f] text-sm">-{formatCurrency(summary.discountAmount)}</span>
                      </div>
                    )}

                    {billTaxType === 'SPLIT_GST' && (
                      <>
                        <div>
                          <span className="text-[#01a9fb] font-bold block text-[10px] uppercase">CGST ({(Number(billTaxRate) || 0) / 2}%)</span>
                          <span className="font-black font-mono text-[#01a9fb] text-sm">+{formatCurrency(summary.cgstAmount)}</span>
                        </div>
                        <div>
                          <span className="text-[#01a9fb] font-bold block text-[10px] uppercase">SGST ({(Number(billTaxRate) || 0) / 2}%)</span>
                          <span className="font-black font-mono text-[#01a9fb] text-sm">+{formatCurrency(summary.sgstAmount)}</span>
                        </div>
                      </>
                    )}

                    {billTaxType === 'GST' && (
                      <div>
                        <span className="text-[#01a9fb] font-bold block text-[10px] uppercase">IGST ({billTaxRate}%)</span>
                        <span className="font-black font-mono text-[#01a9fb] text-sm">+{formatCurrency(summary.igstAmount)}</span>
                      </div>
                    )}
                  </div>

                  {/* Net Total, Paid & Balance Due Bar */}
                  <div className="pt-2 border-t border-slate-800 grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-slate-800/80 rounded-lg text-left">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Net Payable</span>
                      <p className="text-base font-black font-mono text-white">{formatCurrency(summary.finalTotal)}</p>
                    </div>
                    <div className="p-2 bg-emerald-950/60 rounded-lg border border-emerald-800/50">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Paid Now</span>
                      <p className="text-base font-black font-mono text-emerald-400">{formatCurrency(paidVal)}</p>
                    </div>
                    <div className="p-2 bg-rose-950/60 rounded-lg border border-rose-800/50 text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">Balance Due</span>
                      <p className="text-base font-black font-mono text-rose-400">{formatCurrency(dueVal)}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-slate-700 tracking-wider">Remarks / Notes</label>
              <input
                name="notes"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#fe569f] rounded-lg outline-none font-bold text-xs text-slate-900"
                placeholder="Optional notes / supplier terms"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-slate-700 tracking-wider">Bill Document / Scan (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setBillImageFile(e.target.files ? e.target.files[0] : null)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 file:mr-2 file:py-0.5 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-slate-900 file:text-white cursor-pointer"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsAddBillOpen(false);
                setBillItems([{ itemName: '', quantity: '1', unitPrice: '', total: 0 }]);
                setBillDiscountType('NONE');
                setBillDiscountValue('0');
                setBillTaxType('NONE');
                setBillTaxRate('12');
                setBillPaymentStatus('UNPAID');
                setBillCustomPaidAmount('0');
                setBillImageFile(null);
              }}
              className="flex-1 py-2.5 rounded-lg font-black uppercase tracking-wider text-xs text-slate-600 hover:bg-slate-50 border border-slate-200"
              disabled={addBillStatus !== 'idle'}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addBillStatus !== 'idle'}
              className={`flex-1 py-2.5 rounded-lg font-black uppercase tracking-wider text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 ${
                addBillStatus === 'saved'
                  ? 'bg-emerald-600 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                  : addBillStatus === 'saving'
                  ? 'bg-[#eb4890] text-white opacity-90 cursor-wait'
                  : 'bg-[#fe569f] hover:bg-[#eb4890] text-white'
              }`}
            >
              {addBillStatus === 'saved' ? (
                <>
                  <Check size={16} strokeWidth={3} className="text-white animate-bounce" />
                  <span>Saved!</span>
                </>
              ) : addBillStatus === 'saving' ? (
                <span>Saving...</span>
              ) : (
                <span>Save Purchase Bill</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Record Payment Modal ── */}
      {paymentBill && (
        <Modal isOpen={isPaymentOpen} onClose={() => { setIsPaymentOpen(false); setPaymentBill(null); }} title="Record Supplier Payment" zIndex={120}>
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="p-4 bg-slate-900 text-white rounded-lg space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Total Bill</span>
                <span>{formatCurrency(paymentBill.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-emerald-400">
                <span>Already Paid</span>
                <span>{formatCurrency(paymentBill.paidAmount)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <span className="text-xs font-bold text-slate-400">Balance Due</span>
                <span className="text-xl font-extrabold text-white font-mono">{formatCurrency(paymentBill.totalAmount - paymentBill.paidAmount)}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Payment Amount *</label>
              <div className="relative group">
                <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} strokeWidth={2.5} />
                <input
                  name="amount"
                  type="number"
                  max={paymentBill.totalAmount - paymentBill.paidAmount}
                  min={1}
                  required
                  autoFocus
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500 rounded-md outline-none font-extrabold text-slate-900 text-xs"
                  placeholder="Enter payment amount"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPaymentOpen(false)}
                className="flex-1 py-2.5 rounded-md font-extrabold uppercase tracking-wider text-xs border border-slate-200 text-slate-600 hover:bg-slate-50"
                disabled={paymentSaveStatus !== 'idle'}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={paymentSaveStatus !== 'idle'}
                className={`flex-1 py-2.5 rounded-md font-extrabold uppercase tracking-wider text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 ${
                  paymentSaveStatus === 'saved'
                    ? 'bg-emerald-600 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                    : paymentSaveStatus === 'saving'
                    ? 'bg-slate-800 text-white opacity-90 cursor-wait'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                {paymentSaveStatus === 'saved' ? (
                  <>
                    <Check size={15} strokeWidth={3} className="text-white animate-bounce" />
                    <span>Paid & Recorded!</span>
                  </>
                ) : paymentSaveStatus === 'saving' ? (
                  <span>Recording...</span>
                ) : (
                  <span>Record Payment</span>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Bill Modal ── */}
      {editingBill && (
        <Modal isOpen={isEditBillOpen} onClose={() => { setIsEditBillOpen(false); setEditingBill(null); setBillItems([{ itemName: '', quantity: '1', unitPrice: '', total: 0 }]); setBillImageFile(null); }} title={`Edit Purchase Bill #${editingBill.billNumber}`} size="lg" zIndex={110}>
          <form onSubmit={handleUpdateBill} className="space-y-4">
            {/* ── Section 1: Invoice Header Details ── */}
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
              <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-[#fe569f] text-white flex items-center justify-center text-[10px] font-extrabold">1</span>
                Invoice Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1">
                    Bill / Invoice Number <span className="text-rose-500 font-black">*</span>
                  </label>
                  <input
                    name="billNumber"
                    required
                    defaultValue={editingBill.billNumber}
                    className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-[#fe569f] rounded-lg outline-none font-extrabold text-xs text-slate-900 shadow-2xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1">
                    Invoice Date <span className="text-rose-500 font-black">*</span>
                  </label>
                  <input
                    name="date"
                    type="date"
                    required
                    defaultValue={editingBill.date}
                    className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-[#fe569f] rounded-lg outline-none font-extrabold text-xs text-slate-900 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* ── Section 2: Itemized Line Items ── */}
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-[#01a9fb] text-white flex items-center justify-center text-[10px] font-extrabold">2</span>
                  Purchase Items List
                </h4>
                <span className="text-[10px] font-extrabold text-[#01a9fb] bg-[#01a9fb]/10 border border-[#01a9fb]/30 px-2 py-0.5 rounded-md uppercase">
                  {billItems.length} {billItems.length === 1 ? 'Item' : 'Items'} Added
                </span>
              </div>

              {/* Line Items Table Header */}
              <div className="hidden sm:flex items-center gap-2 px-2 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                <span className="flex-1">Item Description / SKU</span>
                <span className="w-24 text-center">Qty</span>
                <span className="w-32 text-left">Unit Rate</span>
                <span className="w-24 text-right pr-2">Amount</span>
                <span className="w-7"></span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                {billItems.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                    <input
                      type="text"
                      required
                      value={item.itemName}
                      onChange={e => updateBillItem(index, 'itemName', e.target.value)}
                      placeholder="Item description / SKU (e.g. Baby Frock 2-3Y)"
                      className="flex-1 px-2.5 py-1.5 bg-slate-50 focus:bg-white rounded-md border border-slate-200 focus:border-[#01a9fb] outline-none font-bold text-xs text-slate-900"
                    />
                    <input
                      type="number"
                      required
                      min="1"
                      value={item.quantity}
                      onChange={e => updateBillItem(index, 'quantity', e.target.value)}
                      placeholder="Qty"
                      title="Quantity"
                      className="w-24 min-w-[5.5rem] px-2 py-1.5 bg-slate-50 focus:bg-white rounded-md border border-slate-200 focus:border-[#01a9fb] outline-none font-black text-xs text-slate-900 text-center"
                    />
                    <div className="relative w-32 shrink-0">
                      <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={e => updateBillItem(index, 'unitPrice', e.target.value)}
                        placeholder="Rate / Pcs"
                        title="Unit Price"
                        className="w-full pl-6 pr-2 py-1.5 bg-slate-50 focus:bg-white rounded-md border border-slate-200 focus:border-[#01a9fb] outline-none font-extrabold text-xs text-slate-900"
                      />
                    </div>
                    <div className="w-24 text-right font-mono font-black text-xs text-slate-900 pr-1">
                      {formatCurrency(item.total)}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBillItemRow(index)}
                      className={`p-1.5 rounded-md transition-colors ${billItems.length > 1 ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-200 cursor-not-allowed'}`}
                      title="Delete row"
                    >
                      <Trash2 size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addBillItemRow}
                className="w-full py-2 border-2 border-dashed border-slate-300 hover:border-[#01a9fb] rounded-lg text-xs font-black uppercase tracking-wider text-slate-600 hover:text-[#01a9fb] hover:bg-[#01a9fb]/5 transition-all"
              >
                + Add Another Line Item
              </button>
            </div>

            {/* ── Section 3: Discounts & Taxes (Stacked 2-Line Cards) ── */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-[#fe569f] text-white flex items-center justify-center text-[10px] font-extrabold">3</span>
                Discounts & Taxes
              </h4>

              {/* 1. Discount Card */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                {/* Row 1: Header + Mode Switcher */}
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                    Discount
                  </span>
                  <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => { setBillDiscountType('NONE'); setBillDiscountValue('0'); }}
                      className={`px-2.5 py-0.5 rounded-md transition-all ${billDiscountType === 'NONE' ? 'bg-slate-900 text-white font-black shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      No Discount
                    </button>
                    <button
                      type="button"
                      onClick={() => { setBillDiscountType('PERCENT'); if (billDiscountValue === '0') setBillDiscountValue('5'); }}
                      className={`px-2.5 py-0.5 rounded-md transition-all ${billDiscountType === 'PERCENT' ? 'bg-[#fe569f] text-white font-black shadow-xs' : 'text-slate-500 hover:text-[#fe569f]'}`}
                    >
                      % Rate
                    </button>
                    <button
                      type="button"
                      onClick={() => { setBillDiscountType('FIXED'); if (billDiscountValue === '0') setBillDiscountValue('100'); }}
                      className={`px-2.5 py-0.5 rounded-md transition-all ${billDiscountType === 'FIXED' ? 'bg-[#fe569f] text-white font-black shadow-xs' : 'text-slate-500 hover:text-[#fe569f]'}`}
                    >
                      ₹ Flat
                    </button>
                  </div>
                </div>

                {/* Row 2: Input + Presets + Dynamic Deduction Summary */}
                {billDiscountType !== 'NONE' ? (
                  <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                    <div className="relative w-44 shrink-0">
                      <input
                        type="number"
                        min="0"
                        step={billDiscountType === 'PERCENT' ? '0.5' : '1'}
                        value={billDiscountValue}
                        onChange={e => setBillDiscountValue(e.target.value)}
                        placeholder={billDiscountType === 'PERCENT' ? 'Discount %' : 'Discount ₹'}
                        className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-[#fe569f]/30 focus:bg-white focus:border-[#fe569f] rounded-lg outline-none font-black text-xs text-[#fe569f] shadow-2xs"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-[#fe569f] bg-[#fe569f]/10 px-1.5 py-0.5 rounded">
                        {billDiscountType === 'PERCENT' ? '%' : '₹'}
                      </span>
                    </div>

                    {billDiscountType === 'PERCENT' && (
                      <div className="flex items-center gap-1.5 flex-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">Presets:</span>
                        {['3', '5', '10', '15', '20'].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setBillDiscountValue(val)}
                            className={`px-2.5 py-1 rounded-md text-xs font-black transition-all ${billDiscountValue === val ? 'bg-[#fe569f] text-white shadow-2xs' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:border-[#fe569f]/40'}`}
                          >
                            {val}%
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Calculated Deduction Display */}
                    {(() => {
                      const summary = computeBillSummary(
                        billItems,
                        billDiscountType,
                        Number(billDiscountValue) || 0,
                        billTaxType,
                        Number(billTaxRate) || 0
                      );
                      return summary.discountAmount > 0 ? (
                        <div className="ml-auto text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Discount Deduction:</span>
                          <p className="text-xs font-black font-mono text-[#fe569f]">-{formatCurrency(summary.discountAmount)}</p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 font-medium italic">No discount applied to this bill.</p>
                )}
              </div>

              {/* 2. GST Tax Card with explicit CGST and SGST amounts */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                {/* Row 1: Header + Tax Mode Switcher */}
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                    GST
                  </span>
                  <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setBillTaxType('NONE')}
                      className={`px-2.5 py-0.5 rounded-md transition-all ${billTaxType === 'NONE' ? 'bg-slate-900 text-white font-black shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      Without GST
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillTaxType('SPLIT_GST')}
                      className={`px-2.5 py-0.5 rounded-md transition-all ${billTaxType === 'SPLIT_GST' ? 'bg-[#01a9fb] text-white font-black shadow-xs' : 'text-slate-500 hover:text-[#01a9fb]'}`}
                      title="CGST + SGST (Intrastate purchase)"
                    >
                      CGST + SGST
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillTaxType('GST')}
                      className={`px-2.5 py-0.5 rounded-md transition-all ${billTaxType === 'GST' ? 'bg-[#01a9fb] text-white font-black shadow-xs' : 'text-slate-500 hover:text-[#01a9fb]'}`}
                      title="IGST (Interstate vendor purchase)"
                    >
                      IGST / Full GST
                    </button>
                  </div>
                </div>

                {/* Row 2: Slab Presets & Custom Rate + Explicit CGST/SGST amounts */}
                {billTaxType !== 'NONE' ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                      {/* Preset Slab Chips */}
                      <div className="flex items-center gap-1.5 flex-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">Slabs:</span>
                        {['5', '12', '18', '28'].map(rate => (
                          <button
                            key={rate}
                            type="button"
                            onClick={() => setBillTaxRate(rate)}
                            className={`flex-1 py-1 text-xs font-black rounded-md border transition-all ${billTaxRate === rate ? 'bg-[#01a9fb] text-white shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-[#01a9fb]/40'}`}
                          >
                            {rate}%
                          </button>
                        ))}
                      </div>

                      {/* Custom Rate Input */}
                      <div className="relative w-28 shrink-0">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={billTaxRate}
                          onChange={e => setBillTaxRate(e.target.value)}
                          placeholder="Custom %"
                          title="Custom GST Rate %"
                          className="w-full pl-3 pr-7 py-1 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-lg outline-none font-black text-xs text-slate-900 text-center shadow-2xs"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>

                    {/* Explicit Calculated CGST and SGST Amount Cards */}
                    {(() => {
                      const summary = computeBillSummary(
                        billItems,
                        billDiscountType,
                        Number(billDiscountValue) || 0,
                        billTaxType,
                        Number(billTaxRate) || 0
                      );
                      const halfRate = (Number(billTaxRate) || 0) / 2;

                      if (billTaxType === 'SPLIT_GST') {
                        return (
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
                            <div className="p-2 bg-[#01a9fb]/10 rounded-lg border border-[#01a9fb]/20 flex items-center justify-between">
                              <span className="font-extrabold text-[#01a9fb]">CGST ({halfRate}%):</span>
                              <span className="font-black font-mono text-[#01a9fb]">+{formatCurrency(summary.cgstAmount)}</span>
                            </div>
                            <div className="p-2 bg-[#01a9fb]/10 rounded-lg border border-[#01a9fb]/20 flex items-center justify-between">
                              <span className="font-extrabold text-[#01a9fb]">SGST ({halfRate}%):</span>
                              <span className="font-black font-mono text-[#01a9fb]">+{formatCurrency(summary.sgstAmount)}</span>
                            </div>
                          </div>
                        );
                      } else if (billTaxType === 'GST') {
                        return (
                          <div className="p-2 bg-[#01a9fb]/10 rounded-lg border border-[#01a9fb]/20 flex items-center justify-between text-xs pt-1">
                            <span className="font-extrabold text-[#01a9fb]">IGST Integrated Tax ({billTaxRate}%):</span>
                            <span className="font-black font-mono text-[#01a9fb]">+{formatCurrency(summary.igstAmount)}</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 font-medium italic">Purchased without tax (Composition scheme / 0% GST).</p>
                )}
              </div>
            </div>

            {/* ── Section 4: Settlement Mode & Full Financial Breakdown ── */}
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
              <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-[#01a9fb] text-white flex items-center justify-center text-[10px] font-extrabold">4</span>
                Payment & Settlement
              </h4>

              {/* Segmented Settlement Mode Pills */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setBillPaymentStatus('UNPAID')}
                  className={`py-2 px-3 rounded-lg border text-center transition-all ${billPaymentStatus === 'UNPAID'
                    ? 'bg-rose-500 text-white border-rose-600 font-black shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700 font-bold'
                    }`}
                >
                  <div className="text-xs uppercase tracking-wider">On Credit</div>
                  <div className="text-[10px] opacity-80 font-medium">100% Unpaid</div>
                </button>

                <button
                  type="button"
                  onClick={() => setBillPaymentStatus('PAID')}
                  className={`py-2 px-3 rounded-lg border text-center transition-all ${billPaymentStatus === 'PAID'
                    ? 'bg-emerald-600 text-white border-emerald-700 font-black shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700 font-bold'
                    }`}
                >
                  <div className="text-xs uppercase tracking-wider">Fully Paid</div>
                  <div className="text-[10px] opacity-80 font-medium">100% Settled</div>
                </button>

                <button
                  type="button"
                  onClick={() => setBillPaymentStatus('PARTIAL')}
                  className={`py-2 px-3 rounded-lg border text-center transition-all ${billPaymentStatus === 'PARTIAL'
                    ? 'bg-amber-500 text-white border-amber-600 font-black shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700 font-bold'
                    }`}
                >
                  <div className="text-xs uppercase tracking-wider">Partial / Adv</div>
                  <div className="text-[10px] opacity-80 font-medium">Token Advance</div>
                </button>
              </div>

              {/* If Partial, advance input */}
              {billPaymentStatus === 'PARTIAL' && (
                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 flex items-center gap-2">
                  <label className="text-xs font-black uppercase text-amber-900 tracking-wider shrink-0">
                    Advance Amount Paid Now:
                  </label>
                  <div className="relative flex-1">
                    <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={billCustomPaidAmount}
                      onChange={e => setBillCustomPaidAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 bg-white border border-amber-300 focus:border-amber-500 rounded-md outline-none font-black text-sm text-slate-900"
                      placeholder="Enter advance amount"
                    />
                  </div>
                </div>
              )}

              {/* Full Financial Breakdown Table Card */}
              {(() => {
                const summary = computeBillSummary(
                  billItems,
                  billDiscountType,
                  Number(billDiscountValue) || 0,
                  billTaxType,
                  Number(billTaxRate) || 0
                );
                let paidVal = 0;
                if (billPaymentStatus === 'PAID') paidVal = summary.finalTotal;
                else if (billPaymentStatus === 'PARTIAL') paidVal = Math.min(summary.finalTotal, Math.max(0, Number(billCustomPaidAmount) || 0));
                const dueVal = Math.max(0, summary.finalTotal - paidVal);

                return (
                  <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-2.5 shadow-md">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                      <span>Calculated Summary Breakdown</span>
                      <span className="text-[#01a9fb] font-bold">Live Auto-Calculated</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 font-bold block text-[10px] uppercase">Subtotal</span>
                        <span className="font-black font-mono text-white text-sm">{formatCurrency(summary.subtotal)}</span>
                      </div>

                      {summary.discountAmount > 0 && (
                        <div>
                          <span className="text-[#fe569f] font-bold block text-[10px] uppercase">Discount</span>
                          <span className="font-black font-mono text-[#fe569f] text-sm">-{formatCurrency(summary.discountAmount)}</span>
                        </div>
                      )}

                      {billTaxType === 'SPLIT_GST' && (
                        <>
                          <div>
                            <span className="text-[#01a9fb] font-bold block text-[10px] uppercase">CGST ({(Number(billTaxRate) || 0) / 2}%)</span>
                            <span className="font-black font-mono text-[#01a9fb] text-sm">+{formatCurrency(summary.cgstAmount)}</span>
                          </div>
                          <div>
                            <span className="text-[#01a9fb] font-bold block text-[10px] uppercase">SGST ({(Number(billTaxRate) || 0) / 2}%)</span>
                            <span className="font-black font-mono text-[#01a9fb] text-sm">+{formatCurrency(summary.sgstAmount)}</span>
                          </div>
                        </>
                      )}

                      {billTaxType === 'GST' && (
                        <div>
                          <span className="text-[#01a9fb] font-bold block text-[10px] uppercase">IGST ({billTaxRate}%)</span>
                          <span className="font-black font-mono text-[#01a9fb] text-sm">+{formatCurrency(summary.igstAmount)}</span>
                        </div>
                      )}
                    </div>

                    {/* Net Total, Paid & Balance Due Bar */}
                    <div className="pt-2 border-t border-slate-800 grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-slate-800/80 rounded-lg text-left">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Net Payable</span>
                        <p className="text-base font-black font-mono text-white">{formatCurrency(summary.finalTotal)}</p>
                      </div>
                      <div className="p-2 bg-emerald-950/60 rounded-lg border border-emerald-800/50">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Paid Now</span>
                        <p className="text-base font-black font-mono text-emerald-400">{formatCurrency(paidVal)}</p>
                      </div>
                      <div className="p-2 bg-rose-950/60 rounded-lg border border-rose-800/50 text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">Balance Due</span>
                        <p className="text-base font-black font-mono text-rose-400">{formatCurrency(dueVal)}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-700 tracking-wider">Remarks / Notes</label>
                <input
                  name="notes"
                  defaultValue={editingBill.notes || ''}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#fe569f] rounded-lg outline-none font-bold text-xs text-slate-900"
                  placeholder="Optional notes / delivery remarks"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-700 tracking-wider">Bill Document / Scan (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBillImageFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 file:mr-2 file:py-0.5 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-slate-900 file:text-white cursor-pointer"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {editingBill && (
                <button
                  type="button"
                  onClick={() => handleDeleteBill(editingBill.id)}
                  className="py-2.5 px-3.5 rounded-lg font-black uppercase tracking-wider text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center gap-1.5 transition-colors shrink-0"
                  title="Delete Purchase Bill"
                  disabled={editBillStatus !== 'idle'}
                >
                  <Trash2 size={13} strokeWidth={2.2} />
                  <span>Delete</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsEditBillOpen(false);
                  setEditingBill(null);
                  setBillItems([{ itemName: '', quantity: '1', unitPrice: '', total: 0 }]);
                  setBillDiscountType('NONE');
                  setBillDiscountValue('0');
                  setBillTaxType('NONE');
                  setBillTaxRate('12');
                  setBillPaymentStatus('UNPAID');
                  setBillCustomPaidAmount('0');
                  setBillImageFile(null);
                }}
                className="flex-1 py-2.5 rounded-lg font-black uppercase tracking-wider text-xs text-slate-600 hover:bg-slate-50 border border-slate-200"
                disabled={editBillStatus !== 'idle'}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editBillStatus !== 'idle'}
                className={`flex-1 py-2.5 rounded-lg font-black uppercase tracking-wider text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 ${
                  editBillStatus === 'updated'
                    ? 'bg-emerald-600 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                    : editBillStatus === 'updating'
                    ? 'bg-[#eb4890] text-white opacity-90 cursor-wait'
                    : 'bg-[#fe569f] hover:bg-[#eb4890] text-white'
                }`}
              >
                {editBillStatus === 'updated' ? (
                  <>
                    <Check size={16} strokeWidth={3} className="text-white animate-bounce" />
                    <span>Updated!</span>
                  </>
                ) : editBillStatus === 'updating' ? (
                  <span>Updating...</span>
                ) : (
                  <span>Update Purchase Bill</span>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── View Bill Details Modal ── */}
      {viewingBillDetails && (
        <Modal
          isOpen={!!viewingBillDetails}
          onClose={() => setViewingBillDetails(null)}
          title={`Bill Details: #${viewingBillDetails.billNumber}`}
          size="lg"
          zIndex={120}
        >
          <div className="space-y-4 text-left">
            <div className="p-4 bg-slate-900 text-white rounded-lg flex justify-between items-center shadow-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Supplier Purchase Bill</span>
                <h3 className="text-base font-extrabold text-white tracking-tight">{viewingBillDetails.billNumber}</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Date: {viewingBillDetails.date} • {selectedSupplier?.name || 'Vendor'}</p>
              </div>
              <span className={`inline-block px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-md ${viewingBillDetails.status === 'PAID' ? 'bg-emerald-500 text-white' :
                viewingBillDetails.status === 'PARTIAL' ? 'bg-amber-500 text-white' :
                  'bg-rose-500 text-white'
                }`}>
                {viewingBillDetails.status}
              </span>
            </div>

            {viewingBillDetails.items && viewingBillDetails.items.length > 0 ? (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5">Item Description</th>
                      <th className="px-4 py-2.5 text-center">Qty</th>
                      <th className="px-4 py-2.5 text-right">Unit Price</th>
                      <th className="px-4 py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                    {viewingBillDetails.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 font-extrabold text-slate-900">{item.itemName}</td>
                        <td className="px-4 py-2.5 text-center font-mono">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-extrabold text-slate-900">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-md border border-slate-200 text-slate-400 text-xs italic text-center">
                No line items itemized on this bill.
              </div>
            )}

            {/* Bill Summary with Tax and Discount */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                {viewingBillDetails.subtotal !== undefined && (
                  <div>
                    <span className="text-slate-400 font-bold uppercase">Subtotal</span>
                    <p className="font-extrabold text-slate-900 font-mono">{formatCurrency(viewingBillDetails.subtotal)}</p>
                  </div>
                )}
                {!!viewingBillDetails.discountAmount && viewingBillDetails.discountAmount > 0 && (
                  <div>
                    <span className="text-purple-600 font-bold uppercase">Discount</span>
                    <p className="font-extrabold text-purple-700 font-mono">-{formatCurrency(viewingBillDetails.discountAmount)}</p>
                  </div>
                )}
                {viewingBillDetails.taxType === 'SPLIT_GST' && !!viewingBillDetails.taxAmount && viewingBillDetails.taxAmount > 0 && (
                  <>
                    <div>
                      <span className="text-slate-500 font-bold uppercase">CGST ({(viewingBillDetails.taxRate || 0) / 2}%)</span>
                      <p className="font-extrabold text-slate-800 font-mono">+{formatCurrency(viewingBillDetails.taxAmount / 2)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold uppercase">SGST ({(viewingBillDetails.taxRate || 0) / 2}%)</span>
                      <p className="font-extrabold text-slate-800 font-mono">+{formatCurrency(viewingBillDetails.taxAmount / 2)}</p>
                    </div>
                  </>
                )}
                {viewingBillDetails.taxType === 'GST' && !!viewingBillDetails.taxAmount && viewingBillDetails.taxAmount > 0 && (
                  <div>
                    <span className="text-slate-500 font-bold uppercase">GST / IGST ({viewingBillDetails.taxRate}%)</span>
                    <p className="font-extrabold text-slate-800 font-mono">+{formatCurrency(viewingBillDetails.taxAmount)}</p>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total Bill</span>
                  <p className="font-mono font-extrabold text-slate-900 text-sm">{formatCurrency(viewingBillDetails.totalAmount)}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Amount Paid</span>
                  <p className="font-mono font-extrabold text-emerald-700 text-sm">{formatCurrency(viewingBillDetails.paidAmount)}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Balance Due</span>
                  <p className="font-mono font-extrabold text-rose-600 text-sm">{formatCurrency(viewingBillDetails.totalAmount - viewingBillDetails.paidAmount)}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleDownloadPurchaseBill(viewingBillDetails, selectedSupplier || undefined)}
                className="flex-1 py-2.5 px-3 rounded-lg font-black uppercase tracking-wider text-xs bg-[#01a9fb] hover:bg-[#0096e0] text-white shadow-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Download size={14} strokeWidth={2.5} /> Download / Print PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  const b = viewingBillDetails;
                  setViewingBillDetails(null);
                  handleOpenEditBill(b);
                }}
                className="py-2.5 px-3 rounded-lg font-black uppercase tracking-wider text-xs text-[#fe569f] bg-[#fe569f]/10 border border-[#fe569f]/30 hover:bg-[#fe569f]/20 transition-colors flex items-center justify-center gap-1"
              >
                <Pencil size={13} /> Edit
              </button>
              {viewingBillDetails.status !== 'PAID' && (
                <button
                  type="button"
                  onClick={() => {
                    const b = viewingBillDetails;
                    setViewingBillDetails(null);
                    setPaymentBill(b);
                    setIsPaymentOpen(true);
                  }}
                  className="py-2.5 px-3 rounded-lg font-black uppercase tracking-wider text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-xs flex items-center justify-center gap-1"
                >
                  <CreditCard size={13} /> Pay Balance ({formatCurrency(viewingBillDetails.totalAmount - viewingBillDetails.paidAmount)})
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDeleteBill(viewingBillDetails.id)}
                className="py-2.5 px-3 rounded-lg font-black uppercase tracking-wider text-xs text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors flex items-center justify-center gap-1 shrink-0"
                title="Delete Purchase Bill"
              >
                <Trash2 size={13} strokeWidth={2.2} /> Delete
              </button>
              <button
                type="button"
                onClick={() => setViewingBillDetails(null)}
                className="py-2.5 px-4 rounded-lg font-extrabold uppercase tracking-wider text-xs text-slate-600 border border-slate-200 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Suppliers;
