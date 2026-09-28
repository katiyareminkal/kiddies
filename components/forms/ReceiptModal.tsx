import React, { useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Printer,
  Download,
  Image as ImageIcon,
  FileText,
  MessageCircle,
  X,
  Check,
  Loader2,
  ChevronDown,
  Share2,
  Phone,
  Store,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Sale, Customer, StoreProfile, PaymentStatus } from '../../types';
import { useApp } from '../../store/AppContext';
import { formatCurrency } from '../../utils/helpers';
import { cleanWhatsAppNumber, sendSaleReceiptWhatsApp } from '../../utils/whatsapp';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  customer?: Customer;
  storeProfile?: StoreProfile;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  customer,
  storeProfile: propStoreProfile
}) => {
  const { storeProfile: contextStoreProfile } = useApp();
  const storeProfile = propStoreProfile || contextStoreProfile;
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [whatsappDropdownOpen, setWhatsappDropdownOpen] = useState(false);
  const [printDropdownOpen, setPrintDropdownOpen] = useState(false);

  if (!isOpen || !sale) return null;

  const storeName = storeProfile?.storeName || 'Kiddies';
  const storeAddress = storeProfile?.address || '';
  const storePhone = storeProfile?.phone || '';
  const storeGstin = storeProfile?.gstin || '';
  const storeEmail = storeProfile?.email || '';
  const storeLogo = storeProfile?.logo || storeProfile?.logoUrl || '';

  const dueAmount = Math.max(0, (sale.totalAmount || 0) - (sale.paidAmount || 0));

  const showNotification = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 3500);
  };

  // Helper to generate canvas from receiptRef
  const getReceiptCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!receiptRef.current) return null;
    return await html2canvas(receiptRef.current, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false
    });
  };

  // 1. Direct Browser Print
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !receiptRef.current) {
      window.print();
      return;
    }

    const receiptHtml = receiptRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${sale.invoiceNumber}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @page {
              margin: 0;
              size: 80mm auto;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, monospace;
              margin: 0;
              padding: 10px;
              color: #000;
              background: #fff;
              font-size: 11px;
            }
            .receipt-print-wrapper {
              width: 100%;
              max-width: 78mm;
              margin: 0 auto;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              padding: 3px 0;
            }
            .dashed-line {
              border-bottom: 1px dashed #000;
              margin: 6px 0;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .barcode-line {
              display: inline-block;
              height: 28px;
              background-color: #000;
              margin: 0 1px;
            }
          </style>
        </head>
        <body>
          <div class="receipt-print-wrapper">
            ${receiptHtml}
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // 2. Download as Image (PNG)
  const handleDownloadImage = async () => {
    setIsProcessing('img');
    try {
      const canvas = await getReceiptCanvas();
      if (!canvas) throw new Error('Could not capture receipt');

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Receipt-${sale.invoiceNumber}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showNotification('Receipt image downloaded successfully!');
    } catch (err) {
      console.error('Error generating receipt image:', err);
      alert('Failed to download receipt image');
    } finally {
      setIsProcessing(null);
    }
  };

  // 3. Download as PDF
  const handleDownloadPDF = async () => {
    setIsProcessing('pdf');
    try {
      const canvas = await getReceiptCanvas();
      if (!canvas) throw new Error('Could not capture receipt');

      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = 80; // 80mm thermal width
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight + 6]
      });

      pdf.addImage(imgData, 'PNG', 0, 3, pdfWidth, pdfHeight);
      pdf.save(`Receipt-${sale.invoiceNumber}.pdf`);

      showNotification('Receipt PDF downloaded successfully!');
    } catch (err) {
      console.error('Error generating receipt PDF:', err);
      alert('Failed to download receipt PDF');
    } finally {
      setIsProcessing(null);
    }
  };

  // 4. WhatsApp Share as Image
  const handleWhatsAppShareImage = async () => {
    setIsProcessing('wa-img');
    setWhatsappDropdownOpen(false);
    try {
      const canvas = await getReceiptCanvas();
      if (!canvas) throw new Error('Could not capture receipt');

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        const file = new File([blob], `Receipt-${sale.invoiceNumber}.png`, { type: 'image/png' });

        if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `Receipt #${sale.invoiceNumber}`,
              text: `Tax Invoice #${sale.invoiceNumber} from ${storeName} for ${customer?.name || 'Customer'}`
            });
            showNotification('Shared receipt image via WhatsApp!');
            return;
          } catch (shareErr: any) {
            if (shareErr.name === 'AbortError') return;
            console.warn('Native file share failed, falling back:', shareErr);
          }
        }
      }

      // Fallback: auto-download image & open WhatsApp chat
      await handleDownloadImage();
      const cleanPhone = cleanWhatsAppNumber(customer?.phone);
      const text = `*${storeName}*\n🧾 Receipt: #${sale.invoiceNumber}\nTotal: ${formatCurrency(sale.netPayout ?? sale.totalAmount)}\n_Receipt image downloaded to your device. Please attach it here._`;
      const url = cleanPhone
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
        : `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      showNotification('Image downloaded! Opening WhatsApp to send...');
    } catch (err) {
      console.error('Error sharing image on WhatsApp:', err);
      alert('Failed to share image on WhatsApp');
    } finally {
      setIsProcessing(null);
    }
  };

  // 5. WhatsApp Share as PDF
  const handleWhatsAppSharePDF = async () => {
    setIsProcessing('wa-pdf');
    setWhatsappDropdownOpen(false);
    try {
      const canvas = await getReceiptCanvas();
      if (!canvas) throw new Error('Could not capture receipt');

      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = 80;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight + 6]
      });

      pdf.addImage(imgData, 'PNG', 0, 3, pdfWidth, pdfHeight);
      const pdfBlob = pdf.output('blob');
      const file = new File([pdfBlob], `Receipt-${sale.invoiceNumber}.pdf`, { type: 'application/pdf' });

      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Receipt #${sale.invoiceNumber}`,
            text: `Tax Invoice PDF #${sale.invoiceNumber} from ${storeName} for ${customer?.name || 'Customer'}`
          });
          showNotification('Shared receipt PDF via WhatsApp!');
          return;
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') return;
          console.warn('Native PDF share failed, falling back:', shareErr);
        }
      }

      // Fallback: Download PDF & open WhatsApp chat
      pdf.save(`Receipt-${sale.invoiceNumber}.pdf`);
      const cleanPhone = cleanWhatsAppNumber(customer?.phone);
      const text = `*${storeName}*\n🧾 Receipt: #${sale.invoiceNumber}\nTotal: ${formatCurrency(sale.netPayout ?? sale.totalAmount)}\n_Receipt PDF downloaded. Please attach it here._`;
      const url = cleanPhone
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
        : `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      showNotification('PDF downloaded! Opening WhatsApp to send...');
    } catch (err) {
      console.error('Error sharing PDF on WhatsApp:', err);
      alert('Failed to share PDF on WhatsApp');
    } finally {
      setIsProcessing(null);
    }
  };

  // 6. WhatsApp Share as Text
  const handleWhatsAppShareText = () => {
    setWhatsappDropdownOpen(false);
    sendSaleReceiptWhatsApp(customer, sale, storeProfile);
    showNotification('Opening WhatsApp with text invoice...');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-100 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header Bar */}
        <div className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#01a9fb]/10 text-[#01a9fb] flex items-center justify-center shrink-0">
              <Printer size={16} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight">
                Tax Receipt & Bill
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                {sale.invoiceNumber}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Banner Notification if triggered */}
        {feedbackMessage && (
          <div className="bg-emerald-500 text-white text-[11px] font-bold py-1.5 px-4 text-center animate-in slide-in-from-top-2 duration-150 flex items-center justify-center gap-1.5 shrink-0">
            <Check size={13} strokeWidth={3} />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Scrollable Receipt Preview Container */}
        <div className="flex-1 overflow-y-auto p-4 flex justify-center bg-slate-200/60 hide-scrollbar">
          {/* Printable / Renderable POS Receipt Sheet */}
          <div
            ref={receiptRef}
            className="bg-white w-[340px] sm:w-[360px] p-5 rounded-lg shadow-md border border-slate-200 text-slate-900 font-mono text-[11px] leading-snug select-text shrink-0"
            style={{ minHeight: '480px' }}
          >
            {/* Store Branding Header */}
            <div className="text-center pb-2">
              {storeLogo ? (
                <div className="flex justify-center mb-1.5">
                  <img
                    src={storeLogo}
                    alt={storeName}
                    className="max-h-12 max-w-[140px] object-contain mx-auto"
                    crossOrigin="anonymous"
                  />
                </div>
              ) : null}
              <div className="flex items-center justify-center gap-1.5 mb-1 text-slate-800">
                {!storeLogo && <Store size={14} className="text-[#01a9fb]" />}
                <span className="font-extrabold tracking-tight text-xs uppercase">{storeName}</span>
              </div>
              {storeAddress && <p className="text-[9px] text-slate-500 leading-tight max-w-[280px] mx-auto">{storeAddress}</p>}
              {storePhone && <p className="text-[9px] text-slate-500 mt-0.5">Ph: {storePhone}</p>}
              {storeEmail && <p className="text-[9px] text-slate-500 mt-0.5">Email: {storeEmail}</p>}
              {storeGstin && <p className="text-[9px] text-slate-400 mt-0.5">GSTIN: {storeGstin}</p>}
            </div>

            <div className="border-b border-dashed border-slate-300 my-2" />

            {/* Receipt Meta & Invoice Details */}
            <div className="text-[10px] space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-600">INVOICE NO:</span>
                <span className="font-black text-slate-900">{sale.invoiceNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-600">DATE & TIME:</span>
                <span className="font-semibold text-slate-800">
                  {sale.date ? format(parseISO(sale.date), 'dd MMM yyyy, hh:mm a') : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-600">CUSTOMER:</span>
                <span className="font-bold text-slate-900 truncate max-w-[180px] text-right">
                  {customer?.name || 'Walk-in Customer'}
                </span>
              </div>
              {customer?.phone && (
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-600">PHONE:</span>
                  <span className="text-slate-800">{customer.phone}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-600">CHANNEL / MODE:</span>
                <span className="font-bold text-slate-800">{sale.channel || 'IN_STORE'} • {sale.paymentMethod}</span>
              </div>
            </div>

            <div className="border-b border-dashed border-slate-300 my-2" />

            {/* Items Table */}
            <table className="w-full text-left my-2 border-collapse">
              <thead>
                <tr className="border-b border-dashed border-slate-400 text-[9px] font-black uppercase text-slate-600">
                  <th className="py-1 text-left">Item</th>
                  <th className="py-1 text-center">Qty</th>
                  <th className="py-1 text-right">Rate</th>
                  <th className="py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-slate-200 text-[10px]">
                {(sale.items || []).map((item, idx) => (
                  <tr key={idx} className="align-top">
                    <td className="py-1.5 pr-1">
                      <p className="font-bold text-slate-900 leading-tight">{item.name}</p>
                      {(item.returnedQuantity || 0) > 0 && (
                        <p className="text-[8px] text-rose-600 font-bold">({item.returnedQuantity} Returned)</p>
                      )}
                    </td>
                    <td className="py-1.5 text-center font-bold text-slate-800">{item.quantity}</td>
                    <td className="py-1.5 text-right text-slate-600">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-1.5 text-right font-bold text-slate-900">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-b border-dashed border-slate-300 my-2" />

            {/* Financial Summary */}
            <div className="text-[10px] space-y-1 pt-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Subtotal:</span>
                <span className="font-bold text-slate-800">{formatCurrency(sale.totalAmount)}</span>
              </div>

              {(sale.discount || 0) > 0 && (
                <div className="flex justify-between items-center text-rose-600">
                  <span className="font-bold">Discount:</span>
                  <span className="font-bold">-{formatCurrency(sale.discount)}</span>
                </div>
              )}

              {(sale.taxTotal || 0) > 0 && (
                <div className="flex justify-between items-center text-slate-600">
                  <span>Taxes (GST):</span>
                  <span className="font-bold">{formatCurrency(sale.taxTotal)}</span>
                </div>
              )}

              {/* Total Row */}
              <div className="flex justify-between items-center py-1.5 border-y-2 border-dashed border-slate-800 my-1">
                <span className="font-black text-xs uppercase tracking-wider text-slate-900">GRAND TOTAL</span>
                <span className="font-black text-sm text-slate-900">
                  {formatCurrency(sale.netPayout ?? sale.totalAmount)}
                </span>
              </div>

              {/* Payment Details */}
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-slate-600 font-medium">Amount Paid:</span>
                <span className="font-bold text-emerald-700">{formatCurrency(sale.paidAmount || 0)}</span>
              </div>

              {dueAmount > 0 && (
                <div className="flex justify-between items-center text-rose-600">
                  <span className="font-black">Balance Due:</span>
                  <span className="font-black text-xs">{formatCurrency(dueAmount)}</span>
                </div>
              )}

              {sale.splitPayments && sale.splitPayments.length > 0 && (
                <div className="bg-slate-50 p-1.5 rounded border border-slate-200 mt-1 space-y-0.5 text-[9px]">
                  <p className="font-bold text-slate-500 uppercase tracking-wider">Payment Breakdown:</p>
                  {sale.splitPayments.map((sp, idx) => (
                    <div key={idx} className="flex justify-between text-slate-700">
                      <span>{sp.method}:</span>
                      <span className="font-mono font-bold">{formatCurrency(sp.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {sale.cashTendered !== undefined && sale.cashTendered > 0 && (
                <div className="flex justify-between items-center text-slate-500 text-[9px]">
                  <span>Cash Tendered:</span>
                  <span>{formatCurrency(sale.cashTendered)}</span>
                </div>
              )}

              {sale.changeDue !== undefined && sale.changeDue > 0 && (
                <div className="flex justify-between items-center text-slate-500 text-[9px]">
                  <span>Change Returned:</span>
                  <span className="font-bold text-slate-800">{formatCurrency(sale.changeDue)}</span>
                </div>
              )}
            </div>

            <div className="border-b border-dashed border-slate-300 my-3" />

            {/* Barcode / Graphic verification */}
            <div className="text-center py-1">
              <div className="flex justify-center items-center h-8 gap-0.5 px-4 overflow-hidden opacity-85">
                {[1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 4, 2, 3, 1, 2, 4, 1, 3, 2, 1, 3, 4, 2, 1, 3, 2].map((w, i) => (
                  <span
                    key={i}
                    style={{ width: `${w}px` }}
                    className="h-full bg-slate-900 inline-block"
                  />
                ))}
              </div>
              <p className="text-[8px] font-mono tracking-widest text-slate-500 mt-1 font-bold">
                *{sale.invoiceNumber}*
              </p>
            </div>

            {/* Terms & Footer Note */}
            <div className="text-center text-[8px] text-slate-500 pt-2 space-y-0.5">
              <p className="font-bold text-slate-700">Thank you for shopping at Kiddies!</p>
              <p>Exchange valid within 7 days with intact tags & original bill.</p>
              <p className="text-slate-400">Computer Generated Invoice</p>
            </div>
          </div>
        </div>

        {/* Footer Actions: Print & Download (IMG / PDF) & WhatsApp Share (IMG / PDF / Text) */}
        <div className="bg-white p-3 sm:p-4 border-t border-slate-200 shrink-0 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            
            {/* 1. Print Receipt with Format Options Dropdown */}
            <div className="relative">
              <div className="flex rounded-lg overflow-hidden border border-slate-300 shadow-xs">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                  title="Print Thermal / Paper Receipt"
                >
                  <Printer size={14} className="shrink-0 text-slate-300" />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrintDropdownOpen(!printDropdownOpen);
                    setWhatsappDropdownOpen(false);
                  }}
                  className="px-2.5 bg-slate-800 hover:bg-slate-700 text-white border-l border-slate-700 flex items-center justify-center transition-colors"
                  title="More Print & Download Options"
                >
                  <ChevronDown size={14} className={`transition-transform duration-200 ${printDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Print Dropdown Menu */}
              {printDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setPrintDropdownOpen(false)} />
                  <div className="absolute bottom-full mb-1.5 left-0 z-40 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 text-xs font-bold text-slate-700 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      Print & Save Options
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPrintDropdownOpen(false);
                        handlePrint();
                      }}
                      className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-50 text-slate-800 transition-colors"
                    >
                      <Printer size={14} className="text-slate-600" />
                      <div>
                        <p className="leading-tight">Print Receipt</p>
                        <p className="text-[9px] text-slate-400 font-normal">Thermal POS / Standard Paper</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing !== null}
                      onClick={() => {
                        setPrintDropdownOpen(false);
                        handleDownloadImage();
                      }}
                      className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-50 text-slate-800 transition-colors"
                    >
                      <ImageIcon size={14} className="text-[#01a9fb]" />
                      <div>
                        <p className="leading-tight">Download as Image</p>
                        <p className="text-[9px] text-slate-400 font-normal">High-res PNG image (.png)</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing !== null}
                      onClick={() => {
                        setPrintDropdownOpen(false);
                        handleDownloadPDF();
                      }}
                      className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-50 text-slate-800 transition-colors"
                    >
                      <FileText size={14} className="text-rose-500" />
                      <div>
                        <p className="leading-tight">Download as PDF</p>
                        <p className="text-[9px] text-slate-400 font-normal">Thermal 80mm Roll Document (.pdf)</p>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* 2. WhatsApp Share with Option to Share IMG / PDF / Text */}
            <div className="relative">
              <div className="flex rounded-lg overflow-hidden border border-emerald-300 shadow-xs">
                <button
                  type="button"
                  onClick={() => {
                    setWhatsappDropdownOpen(!whatsappDropdownOpen);
                    setPrintDropdownOpen(false);
                  }}
                  disabled={isProcessing !== null}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                  title="Share Bill via WhatsApp"
                >
                  {isProcessing?.startsWith('wa') ? (
                    <Loader2 size={14} className="animate-spin text-white" />
                  ) : (
                    <MessageCircle size={14} className="shrink-0 text-emerald-200" />
                  )}
                  <span>Share WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWhatsappDropdownOpen(!whatsappDropdownOpen);
                    setPrintDropdownOpen(false);
                  }}
                  className="px-2.5 bg-emerald-700 hover:bg-emerald-800 text-white border-l border-emerald-600 flex items-center justify-center transition-colors"
                  title="Choose what format to share"
                >
                  <ChevronDown size={14} className={`transition-transform duration-200 ${whatsappDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* WhatsApp Share Options Dropdown */}
              {whatsappDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setWhatsappDropdownOpen(false)} />
                  <div className="absolute bottom-full mb-1.5 right-0 z-40 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 text-xs font-bold text-slate-700 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      Share to WhatsApp As:
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleWhatsAppShareImage}
                      className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-emerald-50 text-slate-800 hover:text-emerald-700 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <ImageIcon size={13} />
                      </div>
                      <div>
                        <p className="leading-tight font-extrabold text-emerald-800">Share as Image (PNG)</p>
                        <p className="text-[9px] text-slate-400 font-normal">Full receipt visual card (.png)</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handleWhatsAppSharePDF}
                      className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-rose-50 text-slate-800 hover:text-rose-700 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                        <FileText size={13} />
                      </div>
                      <div>
                        <p className="leading-tight font-extrabold text-rose-800">Share as PDF Document</p>
                        <p className="text-[9px] text-slate-400 font-normal">Formatted 80mm e-bill (.pdf)</p>
                      </div>
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      type="button"
                      onClick={handleWhatsAppShareText}
                      className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-50 text-slate-700 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <MessageCircle size={13} />
                      </div>
                      <div>
                        <p className="leading-tight">Share as Text Message</p>
                        <p className="text-[9px] text-slate-400 font-normal">Quick itemized chat text</p>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Quick Download Buttons row */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Quick Download:</span>
              <button
                type="button"
                disabled={isProcessing !== null}
                onClick={handleDownloadImage}
                className="px-2.5 py-1 bg-slate-100 hover:bg-[#01a9fb]/10 hover:text-[#01a9fb] text-slate-700 rounded-md text-[10px] font-extrabold flex items-center gap-1 transition-colors border border-slate-200"
              >
                {isProcessing === 'img' ? <Loader2 size={11} className="animate-spin" /> : <ImageIcon size={11} />}
                <span>Image (PNG)</span>
              </button>
              <button
                type="button"
                disabled={isProcessing !== null}
                onClick={handleDownloadPDF}
                className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 rounded-md text-[10px] font-extrabold flex items-center gap-1 transition-colors border border-slate-200"
              >
                {isProcessing === 'pdf' ? <Loader2 size={11} className="animate-spin" /> : <FileText size={11} />}
                <span>PDF</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-600 underline"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
