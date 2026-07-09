import { jsPDF } from 'jspdf';
import { getCode39Sequence } from './barcode';

export interface LabelProduct {
  name: string;
  sku: string;
  barcode?: string;
  sellingPrice: number;
  purchasePrice?: number;
  size?: string;
  color?: string;
  styleCode?: string;
  labelSize?: '50x30' | '30x50';
}

export interface LabelElement {
  id: string;
  type: 'text' | 'barcode' | 'line' | 'rect' | 'image';
  x: number; // in mm
  y: number; // in mm
  width?: number; // for line/rect/barcode modules
  height?: number; // for line/rect/barcode
  fontSize?: number; // for text
  isBold?: boolean; // for text
  align?: 'left' | 'center' | 'right'; // for text
  fontFamily?: 'helvetica' | 'times' | 'courier';
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  borderRadius?: number;
  rotation?: number; // angle in degrees
  visible: boolean;
  staticText?: string; // for custom static elements
  imageBase64?: string;
}

export interface LabelTemplate {
  id: string;
  name: string;
  labelWidth: number; // in mm
  labelHeight: number; // in mm
  elements: LabelElement[];
}

export const DEFAULT_TEMPLATE_30x50: LabelTemplate = {
  id: 'default_30x50',
  name: 'Default 30x50 Portrait',
  labelWidth: 30,
  labelHeight: 50,
  elements: [
    { id: 'storeName', type: 'text', x: 15, y: 5, fontSize: 6, isBold: true, align: 'center', visible: true, staticText: 'KIDDIES' },
    { id: 'name', type: 'text', x: 15, y: 9, fontSize: 5, isBold: false, align: 'center', visible: true },
    { id: 'size', type: 'text', x: 15, y: 13, fontSize: 5, isBold: false, align: 'center', visible: true, staticText: 'SIZE: ' },
    { id: 'color', type: 'text', x: 15, y: 16, fontSize: 5, isBold: false, align: 'center', visible: true, staticText: 'COLOR: ' },
    { id: 'style', type: 'text', x: 15, y: 19, fontSize: 5, isBold: false, align: 'center', visible: true, staticText: 'STYLE: ' },
    { id: 'price', type: 'text', x: 15, y: 24, fontSize: 8, isBold: true, align: 'center', visible: true, staticText: 'Rs. ' },
    { id: 'code', type: 'text', x: 15, y: 28, fontSize: 5, isBold: true, align: 'center', visible: true, staticText: 'CODE: 91' },
    { id: 'barcode', type: 'barcode', x: 15, y: 32, width: 0.16, height: 7, visible: true },
    { id: 'barcodeText', type: 'text', x: 15, y: 42, fontSize: 4.5, isBold: false, align: 'center', visible: true },
    { id: 'sku', type: 'text', x: 15, y: 45, fontSize: 4.5, isBold: false, align: 'center', visible: true, staticText: 'SKU: ' },
  ]
};

export const DEFAULT_TEMPLATE_50x30: LabelTemplate = {
  id: 'default_50x30',
  name: 'Default 50x30 Landscape',
  labelWidth: 50,
  labelHeight: 30,
  elements: [
    { id: 'storeName', type: 'text', x: 25, y: 4, fontSize: 7, isBold: true, align: 'center', visible: true, staticText: 'KIDDIES PREMIUM' },
    { id: 'name', type: 'text', x: 25, y: 7.5, fontSize: 6, isBold: false, align: 'center', visible: true },
    { id: 'price', type: 'text', x: 25, y: 12, fontSize: 9, isBold: true, align: 'center', visible: true, staticText: 'MRP: Rs. ' },
    { id: 'barcode', type: 'barcode', x: 25, y: 14, width: 0.23, height: 7, visible: true },
    { id: 'style', type: 'text', x: 25, y: 22.5, fontSize: 5, isBold: false, align: 'center', visible: true, staticText: 'STYLE: ' },
    { id: 'barcodeText', type: 'text', x: 25, y: 25, fontSize: 5, isBold: false, align: 'center', visible: true },
    { id: 'sku', type: 'text', x: 25, y: 27.5, fontSize: 5, isBold: false, align: 'center', visible: true, staticText: 'SKU: ' },
  ]
};

export const generateDynamicLabelPDF = (products: LabelProduct | LabelProduct[], template: LabelTemplate) => {
  const productArray = Array.isArray(products) ? products : [products];
  if (productArray.length === 0) return;

  const doc = new jsPDF({
    orientation: template.labelWidth > template.labelHeight ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [template.labelWidth, template.labelHeight]
  });

  productArray.forEach((product, index) => {
    if (index > 0) doc.addPage();

    template.elements.filter(e => e.visible).forEach(el => {
      // Setup styles
      if (el.type === 'text') {
        doc.setFont(el.fontFamily || template.elements.find(e => e.fontFamily)?.fontFamily || 'helvetica', el.isBold ? 'bold' : 'normal');
        doc.setFontSize(el.fontSize || 6);
        doc.setTextColor(0, 0, 0);

        let text = '';
        if (el.id === 'storeName' || el.id.startsWith('custom_text')) {
          text = el.staticText || '';
        } else if (el.id === 'name') {
          text = product.name.slice(0, 23).toUpperCase();
        } else if (el.id === 'size' && product.size) {
          text = (el.staticText || '') + product.size.toUpperCase();
        } else if (el.id === 'color' && product.color) {
          text = (el.staticText || '') + product.color.toUpperCase();
        } else if (el.id === 'style' && product.styleCode) {
          text = (el.staticText || '') + product.styleCode.toUpperCase();
        } else if (el.id === 'price') {
          text = (el.staticText || '') + Number(product.sellingPrice).toFixed(2);
        } else if (el.id === 'code' && product.purchasePrice) {
          text = (el.staticText || '') + (product.purchasePrice * 2);
        } else if (el.id === 'sku') {
          text = (el.staticText || '') + product.sku.toUpperCase();
        } else if (el.id === 'barcodeText') {
          text = (product.barcode || product.sku).toUpperCase();
        }

        if (text) {
          // jsPDF uses negative angles for clockwise rotation
          doc.text(text, el.x, el.y, { align: el.align || 'left', angle: -(el.rotation || 0) });
        }
      } else if (el.type === 'barcode') {
        const codeValue = product.barcode || product.sku;
        const barcodeSeq = getCode39Sequence(codeValue);
        const modWidth = el.width || 0.16;
        const bHeight = el.height || 7;
        const totalW = barcodeSeq.length * modWidth;
        // if el.x is center, we shift by totalW/2
        const startX = el.x - (totalW / 2);

        const rot = ((el.rotation || 0) % 360 + 360) % 360; // Normalize to 0-359
        doc.setFillColor(0, 0, 0);
        for (let i = 0; i < barcodeSeq.length; i++) {
          if (barcodeSeq[i] === '1') {
            const barOffset = i * modWidth - (totalW / 2);
            if (rot === 0) {
              doc.rect(el.x + barOffset, el.y, modWidth, bHeight, 'F');
            } else if (rot === 90) {
              doc.rect(el.x - bHeight, el.y + barOffset, bHeight, modWidth, 'F');
            } else if (rot === 180) {
              doc.rect(el.x - barOffset - modWidth, el.y - bHeight, modWidth, bHeight, 'F');
            } else if (rot === 270) {
              doc.rect(el.x, el.y - barOffset - modWidth, bHeight, modWidth, 'F');
            } else {
              // Fallback to 0
              doc.rect(el.x + barOffset, el.y, modWidth, bHeight, 'F');
            }
          }
        }
      } else if (el.type === 'line' || el.type === 'rect') {
        doc.setLineWidth(el.type === 'line' ? (el.height || 0.5) : 0.5);

        if (el.borderStyle === 'dashed') {
          doc.setLineDashPattern([2, 2], 0);
        } else if (el.borderStyle === 'dotted') {
          doc.setLineDashPattern([0.5, 1], 0);
        } else {
          doc.setLineDashPattern([], 0); // Solid
        }

        if (el.type === 'line') {
          doc.line(el.x, el.y, el.x + (el.width || 10), el.y);
        } else {
          if (el.borderRadius && el.borderRadius > 0) {
            doc.roundedRect(el.x, el.y, el.width || 10, el.height || 10, el.borderRadius, el.borderRadius, 'S');
          } else {
            doc.rect(el.x, el.y, el.width || 10, el.height || 10, 'S');
          }
        }

        doc.setLineDashPattern([], 0); // Reset for next elements
      }
    });
  });

  const saveName = productArray.length === 1 ? `Label_${productArray[0].sku.toUpperCase()}.pdf` : `Labels_${productArray[0].sku.toUpperCase()}_Multiple.pdf`;
  doc.save(saveName);
};
