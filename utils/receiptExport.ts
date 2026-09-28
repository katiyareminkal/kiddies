import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { cleanWhatsAppNumber } from './whatsapp';
import { formatCurrency } from './helpers';

/**
 * High-quality raster canvas capture of a receipt DOM node
 */
export const captureReceiptCanvas = async (element: HTMLElement): Promise<HTMLCanvasElement> => {
  return await html2canvas(element, {
    scale: 3, // High DPI for crystal clear text
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false
  });
};

/**
 * Downloads receipt as high-res PNG image
 */
export const downloadReceiptAsImage = async (
  element: HTMLElement,
  invoiceNumber: string
): Promise<void> => {
  const canvas = await captureReceiptCanvas(element);
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `Receipt-${invoiceNumber || 'Invoice'}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Downloads receipt as standard 80mm thermal roll PDF
 */
export const downloadReceiptAsPDF = async (
  element: HTMLElement,
  invoiceNumber: string
): Promise<void> => {
  const canvas = await captureReceiptCanvas(element);
  const imgData = canvas.toDataURL('image/png');

  // 80mm POS thermal roll width
  const pdfWidth = 80;
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pdfWidth, pdfHeight + 6]
  });

  pdf.addImage(imgData, 'PNG', 0, 3, pdfWidth, pdfHeight);
  pdf.save(`Receipt-${invoiceNumber || 'Invoice'}.pdf`);
};

/**
 * Shares receipt to WhatsApp as Image, PDF, or formatted text
 */
export const shareReceiptToWhatsApp = async (
  element: HTMLElement | null,
  invoiceNumber: string,
  shareType: 'image' | 'pdf' | 'text',
  customerPhone?: string,
  customerName?: string,
  storeName?: string,
  totalAmount?: number
): Promise<{ success: boolean; message: string }> => {
  const sName = storeName || 'Kiddies – Kids Wear & Baby Clothing';
  const cPhone = cleanWhatsAppNumber(customerPhone);
  const formattedTotal = totalAmount !== undefined ? formatCurrency(totalAmount) : '';

  if (shareType === 'text' || !element) {
    let text = `*${sName}*\n🧾 Receipt: #${invoiceNumber}\nCustomer: ${customerName || 'Valued Customer'}\n`;
    if (formattedTotal) text += `Total Amount: ${formattedTotal}\n`;
    text += `\nThank you for shopping with us!`;

    const url = cPhone
      ? `https://wa.me/${cPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    return { success: true, message: 'Opened WhatsApp with text invoice' };
  }

  if (shareType === 'image') {
    const canvas = await captureReceiptCanvas(element);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    
    if (blob) {
      const file = new File([blob], `Receipt-${invoiceNumber}.png`, { type: 'image/png' });
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Receipt #${invoiceNumber}`,
            text: `Receipt #${invoiceNumber} from ${sName}`
          });
          return { success: true, message: 'Receipt image shared via WhatsApp' };
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') {
            return { success: true, message: 'Share cancelled' };
          }
          console.warn('Native share failed, using fallback:', shareErr);
        }
      }
    }

    // Fallback for desktop: auto download image and open WhatsApp chat
    await downloadReceiptAsImage(element, invoiceNumber);
    const fallbackText = `*${sName}*\n🧾 Tax Receipt: #${invoiceNumber}\nTotal: ${formattedTotal}\n_Receipt image downloaded to your device. Please attach it in this chat._`;
    const fallbackUrl = cPhone
      ? `https://wa.me/${cPhone}?text=${encodeURIComponent(fallbackText)}`
      : `https://wa.me/?text=${encodeURIComponent(fallbackText)}`;
    window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
    return { success: true, message: 'Image downloaded! Opening WhatsApp to attach...' };
  }

  if (shareType === 'pdf') {
    const canvas = await captureReceiptCanvas(element);
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
    const file = new File([pdfBlob], `Receipt-${invoiceNumber}.pdf`, { type: 'application/pdf' });

    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Receipt #${invoiceNumber}`,
          text: `Tax Invoice PDF #${invoiceNumber} from ${sName}`
        });
        return { success: true, message: 'Receipt PDF shared via WhatsApp' };
      } catch (shareErr: any) {
        if (shareErr.name === 'AbortError') {
          return { success: true, message: 'Share cancelled' };
        }
        console.warn('Native share failed, using fallback:', shareErr);
      }
    }

    // Fallback: auto download PDF and open WhatsApp chat
    pdf.save(`Receipt-${invoiceNumber}.pdf`);
    const fallbackText = `*${sName}*\n🧾 Tax Receipt: #${invoiceNumber}\nTotal: ${formattedTotal}\n_Receipt PDF downloaded to your device. Please attach it in this chat._`;
    const fallbackUrl = cPhone
      ? `https://wa.me/${cPhone}?text=${encodeURIComponent(fallbackText)}`
      : `https://wa.me/?text=${encodeURIComponent(fallbackText)}`;
    window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
    return { success: true, message: 'PDF downloaded! Opening WhatsApp to attach...' };
  }

  return { success: false, message: 'Unknown share type' };
};

/**
 * Triggers standard / thermal printer window
 */
export const printReceiptDirect = (element: HTMLElement, invoiceNumber: string): void => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.print();
    return;
  }

  const receiptHtml = element.innerHTML;
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt - ${invoiceNumber}</title>
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
