import jsPDF from 'jspdf';

export interface LabelElement {
  id: string;
  type: 'text' | 'line' | 'rect' | 'image' | 'barcode';
  x: number;
  y: number;
  width?: number;
  height?: number;
  visible?: boolean;
  staticText?: string;
  customValue?: string;
  fontSize?: number;
  align?: 'left' | 'center' | 'right';
  fontFamily?: string;
  isBold?: boolean;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  borderRadius?: number;
  imageBase64?: string;
  rotation?: number;
}

export interface LabelTemplate {
  id?: string;
  name?: string;
  labelWidth: number;
  labelHeight: number;
  elements: LabelElement[];
}

export interface LabelProduct {
  id?: string;
  name?: string;
  sku?: string;
  barcode?: string;
  sellingPrice?: number;
  purchasePrice?: number;
  color?: string;
  material?: string;
  gender?: string;
  size?: string;
  styleCode?: string;
  subCategory?: string;
  labelSize?: '50x30' | '30x50' | string;
  clothingType?: string;
  [key: string]: any;
}

export const cleanSku = (sku?: string): string => {
  return (sku || '').trim();
};

export const cleanSizeLabel = (size?: string): string => {
  return (size || '').trim();
};

export const getEffectiveGender = (product?: any): string => {
  if (!product) return '';
  return product.gender || product.clothingType || '';
};

export const ensureSubCategoryElement = (template: LabelTemplate): LabelTemplate => {
  if (!template || !Array.isArray(template.elements)) return template;
  const hasSubCat = template.elements.some(e => e.id === 'subCategory');
  if (hasSubCat) return template;
  return {
    ...template,
    elements: [
      ...template.elements,
      {
        id: 'subCategory',
        type: 'text',
        x: 28,
        y: 7.5,
        fontSize: 4.5,
        align: 'left',
        visible: false,
        fontFamily: 'helvetica'
      }
    ]
  };
};

export const adaptTemplateToDimensions = (
  tpl: LabelTemplate,
  width: number,
  height: number
): LabelTemplate => {
  if (!tpl) return tpl;
  if (tpl.labelWidth === width && tpl.labelHeight === height) return tpl;
  const scaleX = width / (tpl.labelWidth || 50);
  const scaleY = height / (tpl.labelHeight || 30);

  return {
    ...tpl,
    labelWidth: width,
    labelHeight: height,
    elements: (tpl.elements || []).map(el => ({
      ...el,
      x: Number((el.x * scaleX).toFixed(2)),
      y: Number((el.y * scaleY).toFixed(2)),
      width: el.width !== undefined ? Number((el.width * scaleX).toFixed(2)) : undefined,
      height: el.height !== undefined ? Number((el.height * scaleY).toFixed(2)) : undefined,
      fontSize: el.fontSize !== undefined ? Math.max(3, Number((el.fontSize * Math.min(scaleX, scaleY)).toFixed(1))) : undefined
    }))
  };
};

export const DEFAULT_TEMPLATE_50x30: LabelTemplate = {
  id: 'default_50x30',
  name: '50x30 Designer (Default)',
  labelWidth: 50,
  labelHeight: 30,
  elements: [
    { id: 'name', type: 'text', x: 25, y: 3.5, align: 'center', fontSize: 6.5, isBold: true, visible: true, fontFamily: 'helvetica' },
    { id: 'sku', type: 'text', x: 3, y: 7.5, align: 'left', fontSize: 5, visible: true, fontFamily: 'helvetica' },
    { id: 'subCategory', type: 'text', x: 28, y: 7.5, align: 'left', fontSize: 4.5, visible: false, fontFamily: 'helvetica' },
    { id: 'size_lbl', type: 'text', x: 3, y: 11, align: 'left', fontSize: 4.5, staticText: 'SIZE: ', visible: true, fontFamily: 'helvetica' },
    { id: 'size', type: 'text', x: 13, y: 11, align: 'left', fontSize: 5, isBold: true, visible: true, fontFamily: 'helvetica' },
    { id: 'color', type: 'text', x: 28, y: 11, align: 'left', fontSize: 4.5, visible: true, fontFamily: 'helvetica' },
    { id: 'rs_lbl', type: 'text', x: 3, y: 15, align: 'left', fontSize: 5, staticText: 'MRP: ₹', visible: true, fontFamily: 'helvetica' },
    { id: 'price', type: 'text', x: 16, y: 15, align: 'left', fontSize: 6, isBold: true, visible: true, fontFamily: 'helvetica' },
    { id: 'code', type: 'text', x: 36, y: 15, align: 'left', fontSize: 4.5, visible: true, fontFamily: 'courier' },
    { id: 'barcode', type: 'barcode', x: 25, y: 18.5, width: 0.18, height: 6.5, visible: true },
    { id: 'barcodeText', type: 'text', x: 25, y: 27.5, align: 'center', fontSize: 4.5, visible: true, fontFamily: 'courier' }
  ]
};

export const DEFAULT_TEMPLATE_30x50: LabelTemplate = {
  id: 'default_30x50',
  name: '30x50 Portrait',
  labelWidth: 30,
  labelHeight: 50,
  elements: [
    { id: 'name', type: 'text', x: 15, y: 4.5, align: 'center', fontSize: 6, isBold: true, visible: true, fontFamily: 'helvetica' },
    { id: 'sku', type: 'text', x: 15, y: 9, align: 'center', fontSize: 5, visible: true, fontFamily: 'helvetica' },
    { id: 'color', type: 'text', x: 15, y: 13, align: 'center', fontSize: 4.5, visible: true, fontFamily: 'helvetica' },
    { id: 'size_box', type: 'rect', x: 8, y: 16, width: 14, height: 6, borderRadius: 1, visible: true },
    { id: 'size', type: 'text', x: 15, y: 17.5, align: 'center', fontSize: 5.5, isBold: true, visible: true, fontFamily: 'helvetica' },
    { id: 'price', type: 'text', x: 15, y: 26, align: 'center', fontSize: 7, isBold: true, staticText: '₹', visible: true, fontFamily: 'helvetica' },
    { id: 'code', type: 'text', x: 15, y: 31, align: 'center', fontSize: 4.5, visible: true, fontFamily: 'courier' },
    { id: 'barcode', type: 'barcode', x: 15, y: 35.5, width: 0.16, height: 8, visible: true },
    { id: 'barcodeText', type: 'text', x: 15, y: 46, align: 'center', fontSize: 4, visible: true, fontFamily: 'courier' },
    { id: 'subCategory', type: 'text', x: 15, y: 33.5, align: 'center', fontSize: 4, visible: false, fontFamily: 'helvetica' }
  ]
};

export const generateDynamicLabelPDF = (
  productsInput: LabelProduct[] | LabelProduct,
  template: LabelTemplate
): void => {
  try {
    const products = Array.isArray(productsInput) ? productsInput : [productsInput];
    if (products.length === 0) return;

    const orientation = template.labelWidth >= template.labelHeight ? 'landscape' : 'portrait';
    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: [template.labelWidth, template.labelHeight]
    });

    products.forEach((product, prodIdx) => {
      if (prodIdx > 0) {
        doc.addPage([template.labelWidth, template.labelHeight], orientation);
      }

      (template.elements || []).forEach(el => {
        if (el.visible === false) return;

        if (el.type === 'text') {
          let val = el.customValue !== undefined ? el.customValue : '';
          if (!val) {
            if (el.id === 'name') val = (product.name || '').slice(0, 24).toUpperCase();
            else if (el.id === 'size') val = cleanSizeLabel(product.size || 'FREE').toUpperCase();
            else if (el.id === 'color') {
              const displayColor = (product.color || product.material || getEffectiveGender(product) || '').trim();
              if (displayColor) val = displayColor.toUpperCase().slice(0, 14);
            }
            else if (el.id === 'style') val = (product.styleCode || '').toUpperCase();
            else if (el.id === 'price') val = Number(product.sellingPrice || 0).toFixed(2);
            else if (el.id === 'code') val = '91' + ((product.purchasePrice || 0) * 2).toString();
            else if (el.id === 'sku') val = cleanSku(product.sku || '').toUpperCase();
            else if (el.id === 'barcodeText') val = cleanSku(product.barcode || product.sku || '').toUpperCase();
            else if (el.id === 'subCategory' && product.subCategory) val = (product.subCategory || '').toUpperCase().slice(0, 12);
          }

          const prefix = el.staticText || '';
          const displayText = prefix + val;
          if (!displayText.trim()) return;

          const fontSize = el.fontSize || 6;
          doc.setFontSize(fontSize);
          const fontStyle = el.isBold ? 'bold' : 'normal';
          const font = el.fontFamily === 'courier' ? 'courier' : el.fontFamily === 'times' ? 'times' : 'helvetica';
          doc.setFont(font, fontStyle);
          doc.setTextColor(30, 41, 59);

          const align = el.align || 'left';
          doc.text(displayText, el.x, el.y, { align });
        } else if (el.type === 'line') {
          doc.setDrawColor(30, 41, 59);
          doc.setLineWidth(el.height && el.height <= 1 ? el.height : 0.2);
          if (el.width === 0 && el.height !== undefined) {
            doc.line(el.x, el.y, el.x, el.y + el.height);
          } else {
            const w = el.width || 10;
            doc.line(el.x, el.y, el.x + w, el.y);
          }
        } else if (el.type === 'rect') {
          doc.setDrawColor(30, 41, 59);
          doc.setLineWidth(0.2);
          const w = el.width || 10;
          const h = el.height || 10;
          if (el.borderRadius && el.borderRadius > 0) {
            doc.roundedRect(el.x, el.y, w, h, el.borderRadius, el.borderRadius, 'S');
          } else {
            doc.rect(el.x, el.y, w, h, 'S');
          }
        } else if (el.type === 'image' && el.imageBase64) {
          try {
            const w = el.width || 10;
            const h = el.height || 10;
            doc.addImage(el.imageBase64, 'PNG', el.x, el.y, w, h);
          } catch (imgErr) {
            console.warn('Failed to add image to PDF label:', imgErr);
          }
        } else if (el.type === 'barcode') {
          // Draw standard barcode bars
          const barcodeVal = cleanSku(product.barcode || product.sku || 'KIDDIES');
          const barW = el.width || 0.18;
          const barH = el.height || 7;
          const totalBars = 35;
          const startX = el.x - (totalBars * barW) / 2;

          doc.setFillColor(30, 41, 59);
          for (let i = 0; i < totalBars; i++) {
            // Pattern generator based on barcode characters
            const charCode = barcodeVal.charCodeAt(i % barcodeVal.length) || 65;
            const isThick = ((charCode + i * 3) % 4) === 0;
            const skip = ((charCode + i * 5) % 7) === 0;
            if (!skip) {
              const currentW = isThick ? barW * 1.6 : barW;
              doc.rect(startX + i * barW, el.y, currentW, barH, 'F');
            }
          }
        }
      });
    });

    const fileName = `Labels_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  } catch (err) {
    console.error('Error generating PDF label:', err);
  }
};
