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
  material?: string;
  gender?: string;
  styleCode?: string;
  subCategory?: string;
  labelSize?: '50x30' | '30x50';
}

export const cleanSizeLabel = (size?: string): string => {
  if (!size) return '';
  return size.replace(/\s*\([^)]*\)|\s*\[[^\]]*\]|\s*\{[^}]*\}/g, '').trim() || size.trim();
};

export const cleanSku = (sku?: string): string => {
  if (!sku) return '';
  return sku.replace(/\s*\([^)]*\)|\s*\[[^\]]*\]|\s*\{[^}]*\}/g, '').trim();
};

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
  id: 'default_30x50_v8',
  name: 'Default 30x50 Vertical (Thermal Optimized)',
  labelWidth: 30,
  labelHeight: 50,
  elements: [
    // Top Section - SIZE Header
    { id: 'size_line_l', type: 'line', x: 3.5, y: 3.5, width: 5.5, height: 0.35, borderStyle: 'solid', visible: true },
    { id: 'size_lbl', type: 'text', x: 15.0, y: 2.2, fontSize: 5.5, isBold: true, align: 'center', visible: true, staticText: 'SIZE' },
    { id: 'size_line_r', type: 'line', x: 21.0, y: 3.5, width: 5.5, height: 0.35, borderStyle: 'solid', visible: true },
    
    // Size Box & Value
    { id: 'size_box', type: 'rect', x: 3.5, y: 5.2, width: 23.0, height: 13.0, borderRadius: 1.5, borderStyle: 'solid', visible: true },
    { id: 'size', type: 'text', x: 15.0, y: 7.5, fontSize: 18.0, isBold: true, align: 'center', visible: true, staticText: '' },
    
    // Color Box & Value
    { id: 'color_box', type: 'rect', x: 3.5, y: 19.5, width: 23.0, height: 6.8, borderRadius: 1.2, borderStyle: 'solid', visible: true },
    { id: 'color', type: 'text', x: 15.0, y: 21.4, fontSize: 7.5, isBold: true, align: 'center', visible: true, staticText: '' },

    // Middle Dashed Divider
    { id: 'div_mid', type: 'line', x: 2.5, y: 27.8, width: 25.0, height: 0.35, borderStyle: 'dashed', visible: true },

    // SubCategory & SKU & Code Section
    { id: 'subCategory', type: 'text', x: 15.0, y: 29.5, fontSize: 7.5, isBold: true, align: 'center', visible: true, staticText: '' },
    { id: 'sku', type: 'text', x: 15.0, y: 33.5, fontSize: 7.0, isBold: true, align: 'center', visible: true, staticText: 'SKU : ' },
    { id: 'div_r1', type: 'line', x: 3.5, y: 37.2, width: 23.0, height: 0.35, borderStyle: 'solid', visible: true },
    { id: 'code', type: 'text', x: 15.0, y: 39.0, fontSize: 7.0, isBold: true, align: 'center', visible: true, staticText: 'CODE : ' },

    // Bottom Price Box
    { id: 'price_box', type: 'rect', x: 2.5, y: 42.5, width: 25.0, height: 6.5, borderRadius: 1.5, borderStyle: 'solid', visible: true },
    { id: 'rs_lbl', type: 'text', x: 4.0, y: 44.5, fontSize: 8.5, isBold: true, align: 'left', visible: true, staticText: 'Rs.' },
    { id: 'div_price', type: 'line', x: 10.0, y: 42.5, width: 0, height: 6.5, borderStyle: 'solid', visible: true },
    { id: 'price', type: 'text', x: 17.5, y: 43.8, fontSize: 12.0, isBold: true, align: 'center', visible: true, staticText: '' }
  ]
};

export const DEFAULT_TEMPLATE_50x30: LabelTemplate = {
  id: 'default_50x30_v8',
  name: 'Default 50x30 Designer (Thermal Optimized)',
  labelWidth: 50,
  labelHeight: 30,
  elements: [
    // --- Left Section (Size & Color) ---
    { id: 'size_line_l', type: 'line', x: 2.0, y: 3.2, width: 3.5, height: 0.35, borderStyle: 'solid', visible: true },
    { id: 'size_lbl', type: 'text', x: 9.0, y: 1.8, fontSize: 5.5, isBold: true, align: 'center', visible: true, staticText: 'SIZE' },
    { id: 'size_line_r', type: 'line', x: 12.5, y: 3.2, width: 3.5, height: 0.35, borderStyle: 'solid', visible: true },
    
    // Size Box & Value
    { id: 'size_box', type: 'rect', x: 1.5, y: 4.8, width: 15.0, height: 13.0, borderRadius: 1.5, borderStyle: 'solid', visible: true },
    { id: 'size', type: 'text', x: 9.0, y: 7.5, fontSize: 18.0, isBold: true, align: 'center', visible: true, staticText: '' },
    
    // Color Box & Value
    { id: 'color_box', type: 'rect', x: 1.5, y: 19.2, width: 15.0, height: 8.5, borderRadius: 1.2, borderStyle: 'solid', visible: true },
    { id: 'color', type: 'text', x: 9.0, y: 22.0, fontSize: 7.5, isBold: true, align: 'center', visible: true, staticText: '' },

    // --- Vertical Divider ---
    { id: 'div_vert', type: 'line', x: 18.2, y: 2.0, width: 0, height: 26.0, borderStyle: 'dashed', visible: true },

    // --- Right Section ---
    // Sub Category
    { id: 'subCategory', type: 'text', x: 34.0, y: 2.0, fontSize: 7.0, isBold: true, align: 'center', visible: true, staticText: '' },
    // SKU
    { id: 'sku', type: 'text', x: 34.0, y: 5.8, fontSize: 6.5, isBold: true, align: 'center', visible: true, staticText: 'SKU : ' },
    
    // Horizontal Solid Divider
    { id: 'div_r1', type: 'line', x: 20.0, y: 9.6, width: 28.0, height: 0.35, borderStyle: 'solid', visible: true },
    
    // Code
    { id: 'code', type: 'text', x: 34.0, y: 12.0, fontSize: 7.0, isBold: true, align: 'center', visible: true, staticText: 'CODE : ' },
    
    // Horizontal Dashed Divider
    { id: 'div_r2', type: 'line', x: 20.0, y: 16.0, width: 28.0, height: 0.35, borderStyle: 'dashed', visible: true },

    // Price Box
    { id: 'price_box', type: 'rect', x: 20.0, y: 18.5, width: 28.0, height: 9.2, borderRadius: 1.5, borderStyle: 'solid', visible: true },
    // Rs Text
    { id: 'rs_lbl', type: 'text', x: 21.5, y: 21.5, fontSize: 9.0, isBold: true, align: 'left', visible: true, staticText: 'Rs.' },
    // Vertical Divider inside price box
    { id: 'div_price', type: 'line', x: 27.5, y: 18.5, width: 0, height: 9.2, borderStyle: 'solid', visible: true },
    // Price Value
    { id: 'price', type: 'text', x: 38.5, y: 20.5, fontSize: 13.5, isBold: true, align: 'center', visible: true, staticText: '' }
  ]
};

export const ensureSubCategoryElement = (tpl?: LabelTemplate | null): LabelTemplate => {
  if (!tpl || typeof tpl !== 'object' || !Array.isArray(tpl.elements)) {
    return DEFAULT_TEMPLATE_50x30;
  }
  if (tpl.elements.some(e => e && e.id === 'subCategory')) {
    return tpl;
  }
  const isPortrait = (tpl.labelHeight || 30) >= (tpl.labelWidth || 50);
  const skuElement = tpl.elements.find(e => e && e.id === 'sku');
  const x = skuElement ? skuElement.x : (isPortrait ? 15.0 : 34.0);
  const y = skuElement ? Math.max(1, skuElement.y - 3.5) : (isPortrait ? 29.5 : 2.0);

  const subCatEl: LabelElement = {
    id: 'subCategory',
    type: 'text',
    x,
    y,
    fontSize: isPortrait ? 7.5 : 7.0,
    isBold: true,
    align: 'center',
    visible: true,
    staticText: ''
  };

  const updatedElements = [...tpl.elements];
  const skuIdx = updatedElements.findIndex(e => e && e.id === 'sku');
  if (skuIdx >= 0) {
    updatedElements.splice(skuIdx, 0, subCatEl);
  } else {
    updatedElements.push(subCatEl);
  }

  return {
    ...tpl,
    elements: updatedElements
  };
};

export const adaptTemplateToDimensions = (
  baseTemplate?: LabelTemplate | null,
  newW: number = 50,
  newH: number = 30
): LabelTemplate => {
  const safeW = Number(newW) > 5 ? Number(newW) : 50;
  const safeH = Number(newH) > 5 ? Number(newH) : 30;
  let template = ensureSubCategoryElement(baseTemplate || DEFAULT_TEMPLATE_50x30);
  
  const isTargetLandscape = safeW >= safeH;
  const isBaseLandscape = (template.labelWidth || 50) >= (template.labelHeight || 30);

  // Auto-switch base template orientation if orientation changed
  if (isTargetLandscape !== isBaseLandscape) {
    template = ensureSubCategoryElement(isTargetLandscape ? DEFAULT_TEMPLATE_50x30 : DEFAULT_TEMPLATE_30x50);
  }

  const baseW = template.labelWidth || (isTargetLandscape ? 50 : 30);
  const baseH = template.labelHeight || (isTargetLandscape ? 30 : 50);
  const scaleX = safeW / baseW;
  const scaleY = safeH / baseH;
  const scaleFont = Math.min(scaleX, scaleY);

  const adaptedElements: LabelElement[] = (template.elements || []).map(el => {
    if (!el) return null as any;
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
  }).filter(Boolean);

  return {
    id: `adapted_${safeW}x${safeH}_${template.id || 'default'}`,
    name: `${template.name || 'Custom'} (${safeW}×${safeH}mm)`,
    labelWidth: safeW,
    labelHeight: safeH,
    elements: adaptedElements
  };
};

export const getEffectiveGender = (product: { gender?: string; category?: string; subCategory?: string }): string => {
  const g = (product.gender || '').trim();
  if (g) return g;

  const cat = (product.category || '').toLowerCase();
  const sub = (product.subCategory || '').toLowerCase();
  
  if (cat.includes('boy') || sub.includes('boy')) return 'Boys';
  if (cat.includes('girl') || sub.includes('girl') || cat.includes('frock') || cat.includes('gown')) return 'Girls';
  if (cat.includes('baby') || cat.includes('infant') || sub.includes('romper')) return 'Babies';
  
  return '';
};

export const generateDynamicLabelPDF = (products: LabelProduct | LabelProduct[], rawTemplate: LabelTemplate) => {
  const productArray = Array.isArray(products) ? products : [products];
  if (productArray.length === 0) return;

  const template = ensureSubCategoryElement(rawTemplate);

  const doc = new jsPDF({
    orientation: template.labelWidth > template.labelHeight ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [template.labelWidth, template.labelHeight]
  });

  productArray.forEach((product, index) => {
    if (index > 0) doc.addPage();

    template.elements.filter(e => e.visible).forEach(el => {
      // Setup styles with pure high-contrast black for thermal printers
      doc.setDrawColor(0, 0, 0);
      doc.setFillColor(0, 0, 0);

      if (el.type === 'text') {
        doc.setFont(el.fontFamily || template.elements.find(e => e.fontFamily)?.fontFamily || 'helvetica', 'bold');
        doc.setFontSize(el.fontSize || 6.5);
        doc.setTextColor(0, 0, 0);

        let val = el.customValue !== undefined ? el.customValue : '';
        if (!val) {
          if (el.id === 'name') val = (product.name || '').slice(0, 23).toUpperCase();
          else if (el.id === 'size' && product.size) val = cleanSizeLabel(product.size).toUpperCase();
          else if (el.id === 'color') {
            const fallbackColor = (product.color || product.material || getEffectiveGender(product) || '').trim();
            if (fallbackColor) val = fallbackColor.toUpperCase().slice(0, 12);
          }
          else if (el.id === 'style' && product.styleCode) val = product.styleCode.toUpperCase();
          else if (el.id === 'price') val = Number(product.sellingPrice || 0).toFixed(2);
          else if (el.id === 'code' && product.purchasePrice) val = '91' + (product.purchasePrice * 2);
          else if (el.id === 'sku') val = cleanSku(product.sku || '').toUpperCase();
          else if (el.id === 'barcodeText') val = cleanSku(product.barcode || product.sku || '').toUpperCase();
          else if (el.id === 'subCategory' && product.subCategory) val = (product.subCategory || '').toUpperCase().slice(0, 15);
        }

        const prefix = el.staticText || '';
        const text = prefix + val;

        if (text) {
          // Adjust y coordinate for baseline offset in jsPDF (approx 0.72 of the font height in mm)
          const fontSizeInMm = (el.fontSize || 6.5) * 0.352778;
          const baselineY = el.y + (fontSizeInMm * 0.72);
          
          // jsPDF uses negative angles for clockwise rotation
          doc.text(text, el.x, baselineY, { align: el.align || 'left', angle: -(el.rotation || 0) });
        }
      } else if (el.type === 'barcode') {
        const codeValue = cleanSku(product.barcode || product.sku);
        const barcodeSeq = getCode39Sequence(codeValue);
        const modWidth = el.width || 0.16;
        const bHeight = el.height || 7;
        const totalW = barcodeSeq.length * modWidth;

        const rot = ((el.rotation || 0) % 360 + 360) % 360; // Normalize to 0-359
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
            doc.setLineWidth(0.35);
            doc.line(el.x, el.y, el.x, el.y + el.height);
          } else {
            // horizontal line
            const thickness = (el.height && el.height <= 1) ? el.height : 0.35;
            doc.setLineWidth(thickness);
            doc.line(el.x, el.y, el.x + (el.width || 10), el.y);
          }
        } else {
          doc.setLineWidth(0.45);
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
