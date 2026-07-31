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
  subCategory?: string;
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
  staticText?: string; // for custom static elements or prefix
  customValue?: string; // custom number / text value override
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
  id: 'default_30x50_v4',
  name: 'Default 30x50 Vertical v4',
  labelWidth: 30,
  labelHeight: 50,
  elements: [
    // Top Section - SIZE Header
    { id: 'size_line_l', type: 'line', x: 4, y: 4, width: 5, height: 0.2, borderStyle: 'solid', visible: true },
    { id: 'size_lbl', type: 'text', x: 15, y: 3.5, fontSize: 5, isBold: true, align: 'center', visible: true, staticText: 'SIZE' },
    { id: 'size_line_r', type: 'line', x: 21, y: 4, width: 5, height: 0.2, borderStyle: 'solid', visible: true },
    
    // Size Box & Value
    { id: 'size_box', type: 'rect', x: 5, y: 6.5, width: 20, height: 12, borderRadius: 1.5, borderStyle: 'solid', visible: true },
    { id: 'size', type: 'text', x: 15, y: 10.5, fontSize: 16, isBold: true, align: 'center', visible: true, staticText: '' },
    
    // Color Box & Value
    { id: 'color_box', type: 'rect', x: 5, y: 19.5, width: 20, height: 6.5, borderRadius: 1, borderStyle: 'solid', visible: true },
    { id: 'color', type: 'text', x: 15, y: 22.2, fontSize: 7, isBold: true, align: 'center', visible: true, staticText: '' },

    // Middle Dashed Divider
    { id: 'div_mid', type: 'line', x: 3, y: 27.5, width: 24, height: 0.2, borderStyle: 'dashed', visible: true },

    // SKU & Code Section
    { id: 'sku', type: 'text', x: 15, y: 30.5, fontSize: 7, isBold: true, align: 'center', visible: true, staticText: 'SKU : ' },
    { id: 'div_r1', type: 'line', x: 5, y: 33.5, width: 20, height: 0.2, borderStyle: 'solid', visible: true },
    { id: 'code', type: 'text', x: 15, y: 36.5, fontSize: 7, isBold: true, align: 'center', visible: true, staticText: 'CODE : ' },

    // Bottom Price Box
    { id: 'price_box', type: 'rect', x: 3, y: 40.5, width: 24, height: 7.5, borderRadius: 1.5, borderStyle: 'solid', visible: true },
    { id: 'rs_lbl', type: 'text', x: 4.2, y: 43.2, fontSize: 8.5, isBold: true, align: 'left', visible: true, staticText: 'Rs.' },
    { id: 'div_price', type: 'line', x: 10.5, y: 40.5, width: 0, height: 7.5, borderStyle: 'solid', visible: true },
    { id: 'price', type: 'text', x: 18, y: 43.0, fontSize: 11, isBold: true, align: 'center', visible: true, staticText: '' }
  ]
};

export const DEFAULT_TEMPLATE_50x30: LabelTemplate = {
  id: 'default_50x30_v4',
  name: 'Default 50x30 Designer v4',
  labelWidth: 50,
  labelHeight: 30,
  elements: [
    // --- Left Section (Size & Category) ---
    { id: 'size_line_l', type: 'line', x: 2, y: 4, width: 4, height: 0.2, borderStyle: 'solid', visible: true },
    { id: 'size_lbl', type: 'text', x: 9, y: 3.5, fontSize: 5, isBold: true, align: 'center', visible: true, staticText: 'SIZE' },
    { id: 'size_line_r', type: 'line', x: 12, y: 4, width: 4, height: 0.2, borderStyle: 'solid', visible: true },
    
    // Size Box & Value
    { id: 'size_box', type: 'rect', x: 2, y: 7, width: 14, height: 11, borderRadius: 1.5, borderStyle: 'solid', visible: true },
    { id: 'size', type: 'text', x: 9, y: 11, fontSize: 16, isBold: true, align: 'center', visible: true, staticText: '' },
    
    // Color Box & Value
    { id: 'color_box', type: 'rect', x: 1.5, y: 20, width: 15, height: 7, borderRadius: 1, borderStyle: 'solid', visible: true },
    { id: 'color', type: 'text', x: 9, y: 22.8, fontSize: 7, isBold: true, align: 'center', visible: true, staticText: '' },

    // --- Vertical Divider ---
    { id: 'div_vert', type: 'line', x: 18, y: 2, width: 0, height: 26, borderStyle: 'dashed', visible: true },

    // --- Right Section ---
    // SKU
    { id: 'sku', type: 'text', x: 34, y: 4.5, fontSize: 7, isBold: true, align: 'center', visible: true, staticText: 'SKU : ' },
    
    // Horizontal Solid Divider
    { id: 'div_r1', type: 'line', x: 20, y: 9.5, width: 28, height: 0.2, borderStyle: 'solid', visible: true },
    
    // Code
    { id: 'code', type: 'text', x: 34, y: 12.5, fontSize: 7, isBold: true, align: 'center', visible: true, staticText: 'CODE : ' },
    
    // Horizontal Dashed Divider
    { id: 'div_r2', type: 'line', x: 20, y: 17.5, width: 28, height: 0.2, borderStyle: 'dashed', visible: true },

    // Price Box
    { id: 'price_box', type: 'rect', x: 20, y: 20, width: 28, height: 8, borderRadius: 1.5, borderStyle: 'solid', visible: true },
    // Rs Text
    { id: 'rs_lbl', type: 'text', x: 21.2, y: 23.0, fontSize: 9, isBold: true, align: 'left', visible: true, staticText: 'Rs.' },
    // Vertical Divider inside price box
    { id: 'div_price', type: 'line', x: 27.5, y: 20, width: 0, height: 8, borderStyle: 'solid', visible: true },
    // Price Value
    { id: 'price', type: 'text', x: 38.5, y: 22.5, fontSize: 12, isBold: true, align: 'center', visible: true, staticText: '' }
  ]
};

export const adaptTemplateToDimensions = (
  baseTemplate: LabelTemplate,
  newW: number,
  newH: number
): LabelTemplate => {
  let template = baseTemplate;
  const isTargetLandscape = newW >= newH;
  const isBaseLandscape = template.labelWidth >= template.labelHeight;

  // Auto-switch base template orientation if orientation changed
  if (isTargetLandscape !== isBaseLandscape) {
    template = isTargetLandscape ? DEFAULT_TEMPLATE_50x30 : DEFAULT_TEMPLATE_30x50;
  }

  const scaleX = newW / template.labelWidth;
  const scaleY = newH / template.labelHeight;
  const scaleFont = Math.min(scaleX, scaleY);

  const adaptedElements: LabelElement[] = template.elements.map(el => {
    const newEl: LabelElement = {
      ...el,
      x: Number((el.x * scaleX).toFixed(2)),
      y: Number((el.y * scaleY).toFixed(2))
    };

    if (el.width !== undefined) {
      // For vertical lines (width === 0), adjust height
      if (el.type === 'line' && el.width === 0 && el.height !== undefined) {
        newEl.height = Number((el.height * scaleY).toFixed(2));
      } else if (el.width > 0) {
        newEl.width = Number((el.width * scaleX).toFixed(2));
      }
    }

    if (el.height !== undefined && el.height > 0 && el.type !== 'line') {
      newEl.height = Number((el.height * scaleY).toFixed(2));
    }

    if (el.fontSize !== undefined) {
      newEl.fontSize = Number((el.fontSize * scaleFont).toFixed(2));
    }

    if (el.borderRadius !== undefined) {
      newEl.borderRadius = Number((el.borderRadius * scaleFont).toFixed(2));
    }

    return newEl;
  });

  return {
    id: `adapted_${newW}x${newH}_${template.id}`,
    name: `${template.name} (${newW}×${newH}mm)`,
    labelWidth: newW,
    labelHeight: newH,
    elements: adaptedElements
  };
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

        let val = el.customValue !== undefined ? el.customValue : '';
        if (!val) {
          if (el.id === 'name') val = (product.name || '').slice(0, 23).toUpperCase();
          else if (el.id === 'size' && product.size) val = product.size.toUpperCase();
          else if (el.id === 'color' && product.color) val = product.color.toUpperCase().slice(0, 10);
          else if (el.id === 'style' && product.styleCode) val = product.styleCode.toUpperCase();
          else if (el.id === 'price') val = Number(product.sellingPrice || 0).toFixed(2);
          else if (el.id === 'code' && product.purchasePrice) val = '91' + (product.purchasePrice * 2);
          else if (el.id === 'sku') val = (product.sku || '').toUpperCase();
          else if (el.id === 'barcodeText') val = (product.barcode || product.sku || '').toUpperCase();
          else if (el.id === 'subCategory' && product.subCategory) val = (product.subCategory || '').toUpperCase().slice(0, 10);
        }

        const prefix = el.staticText || '';
        const text = prefix + val;

        if (text) {
          // Adjust y coordinate for baseline offset in jsPDF (approx 0.72 of the font height in mm)
          const fontSizeInMm = (el.fontSize || 6) * 0.352778;
          const baselineY = el.y + (fontSizeInMm * 0.72);
          
          // jsPDF uses negative angles for clockwise rotation
          doc.text(text, el.x, baselineY, { align: el.align || 'left', angle: -(el.rotation || 0) });
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
        if (el.borderStyle === 'dashed') {
          doc.setLineDashPattern([1.5, 1.5], 0);
        } else if (el.borderStyle === 'dotted') {
          doc.setLineDashPattern([0.5, 1], 0);
        } else {
          doc.setLineDashPattern([], 0); // Solid
        }

        if (el.type === 'line') {
          if (el.width === 0 && el.height !== undefined) {
            // vertical line
            doc.setLineWidth(0.2);
            doc.line(el.x, el.y, el.x, el.y + el.height);
          } else {
            // horizontal line
            const thickness = (el.height && el.height <= 1) ? el.height : 0.2;
            doc.setLineWidth(thickness);
            doc.line(el.x, el.y, el.x + (el.width || 10), el.y);
          }
        } else {
          doc.setLineWidth(0.3);
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
