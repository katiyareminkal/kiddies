import React, { useState, useMemo, useRef } from 'react';
import { Modal } from '../Shared';
import { Tag, Download, Edit2, Check, LayoutGrid, Layers, Image as ImageIcon, Sparkles, FolderX } from 'lucide-react';
import html2canvas from 'html2canvas';
import { Product } from '../../types';
import { 
  LabelProduct, 
  LabelTemplate, 
  LabelElement, 
  DEFAULT_TEMPLATE_50x30, 
  DEFAULT_TEMPLATE_30x50, 
  generateDynamicLabelPDF 
} from '../../utils/pdfLabel';

const MM_TO_PX = 3.7795275591;

interface TagPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onOpenDesigner: (template: LabelTemplate, selectedSizes: string[]) => void;
}

export const TagPrintModal: React.FC<TagPrintModalProps> = ({
  isOpen,
  onClose,
  product,
  onOpenDesigner
}) => {
  if (!product) return null;

  const previewRef = useRef<HTMLDivElement>(null);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);

  // Available Sizes
  const availableSizes = useMemo(() => {
    return product.sizes && product.sizes.length > 0 ? product.sizes : ['FREE'];
  }, [product]);

  const [selectedSizes, setSelectedSizes] = useState<string[]>(() => [...availableSizes]);

  // Built-in Presets
  const builtInPresets = useMemo(() => [
    { id: 'default_50x30', name: '50x30 Designer (Default)', template: DEFAULT_TEMPLATE_50x30, isBuiltIn: true },
    { id: 'default_30x50', name: '30x50 Portrait', template: DEFAULT_TEMPLATE_30x50, isBuiltIn: true }
  ], []);

  // Custom User Presets
  const customPresets = useMemo(() => {
    const list: { id: string; name: string; template: LabelTemplate; isBuiltIn?: boolean }[] = [];
    try {
      const saved = localStorage.getItem('kiddies_saved_layouts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any, idx: number) => {
            if (item && item.template && item.name) {
              list.push({
                id: `custom_${idx}_${item.name}`,
                name: item.name,
                template: item.template
              });
            }
          });
        }
      }
    } catch (e) {}
    return list;
  }, []);

  // All combined presets array for indexing
  const allPresets = useMemo(() => [...builtInPresets, ...customPresets], [builtInPresets, customPresets]);

  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const activePreset = allPresets[selectedIndex] || allPresets[0];

  const toggleSize = (size: string) => {
    if (selectedSizes.includes(size)) {
      if (selectedSizes.length === 1) return; // Keep at least one
      setSelectedSizes(selectedSizes.filter(s => s !== size));
    } else {
      setSelectedSizes([...selectedSizes, size]);
    }
  };

  const toggleAllSizes = () => {
    if (selectedSizes.length === availableSizes.length) {
      setSelectedSizes([availableSizes[0]]);
    } else {
      setSelectedSizes([...availableSizes]);
    }
  };

  // Prepare preview product data
  const previewSize = selectedSizes[0] || availableSizes[0] || 'FREE';
  const siblings = (product as any).variants && (product as any).variants.length > 0
    ? (product as any).variants
    : [product];

  const matchedVariant = siblings.find((v: Product) => (v.sizes || [])[0]?.toUpperCase() === previewSize.toUpperCase()) || product;

  const previewProductData: LabelProduct = {
    name: matchedVariant.name || product.name,
    sku: matchedVariant.sku || product.sku,
    barcode: matchedVariant.barcode || product.barcode || '',
    sellingPrice: matchedVariant.sellingPrice || product.sellingPrice,
    purchasePrice: matchedVariant.purchasePrice || product.purchasePrice,
    color: matchedVariant.color || product.color || '',
    size: previewSize,
    styleCode: '',
    subCategory: matchedVariant.subCategory || product.subCategory || '',
    labelSize: activePreset.template.labelWidth === 30 ? '30x50' : '50x30'
  };

  const handleDownloadPDF = () => {
    const productsToPrint: LabelProduct[] = selectedSizes.map(size => {
      const variant = siblings.find((v: Product) => (v.sizes || [])[0]?.toUpperCase() === size.toUpperCase()) || product;
      return {
        name: variant.name || product.name,
        sku: variant.sku || product.sku,
        barcode: variant.barcode || product.barcode || '',
        sellingPrice: variant.sellingPrice || product.sellingPrice,
        purchasePrice: variant.purchasePrice || product.purchasePrice,
        color: variant.color || product.color || '',
        size: size,
        styleCode: '',
        subCategory: variant.subCategory || product.subCategory || '',
        labelSize: activePreset.template.labelWidth === 30 ? '30x50' : '50x30'
      };
    });

    generateDynamicLabelPDF(productsToPrint, activePreset.template);
    onClose();
  };

  const handleDownloadPNG = async () => {
    if (!previewRef.current) return;
    setIsDownloadingImage(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 4,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      link.download = `Tag_${product.sku.toUpperCase()}_${previewSize}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to generate PNG image', err);
    } finally {
      setIsDownloadingImage(false);
    }
  };

  // Preview elements rendering
  const renderPreviewElement = (el: LabelElement) => {
    if (!el.visible) return null;
    const isCentered = (el.type === 'text' && el.align === 'center') || el.type === 'barcode';
    
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${el.x * MM_TO_PX}px`,
      top: `${el.y * MM_TO_PX}px`,
      transform: isCentered ? `translateX(-50%) rotate(${el.rotation || 0}deg)` : `rotate(${el.rotation || 0}deg)`,
      transformOrigin: isCentered ? 'top center' : 'top left',
      boxSizing: 'border-box'
    };

    if (el.type === 'image') {
      return (
        <div key={el.id} style={{ ...baseStyle, width: `${(el.width || 10) * MM_TO_PX}px`, height: `${(el.height || 10) * MM_TO_PX}px` }}>
          <img src={el.imageBase64} className="w-full h-full object-fill" />
        </div>
      );
    } else if (el.type === 'text') {
      let text = el.staticText || '';
      if (el.id === 'name') text = (el.staticText || '') + (previewProductData.name || '').slice(0, 23).toUpperCase();
      else if (el.id === 'size') text = (el.staticText || '') + (previewProductData.size || '').toUpperCase();
      else if (el.id === 'color' && previewProductData.color) text = (el.staticText || '') + (previewProductData.color || '').toUpperCase().slice(0, 10);
      else if (el.id === 'style') text = (el.staticText || '') + (previewProductData.styleCode || '').toUpperCase();
      else if (el.id === 'price') text = (el.staticText || '') + Number(previewProductData.sellingPrice || 0).toFixed(2);
      else if (el.id === 'code') text = (el.staticText || '') + '91' + ((previewProductData.purchasePrice || 0) * 2).toString();
      else if (el.id === 'sku') text = (el.staticText || '') + (previewProductData.sku || '').toUpperCase();
      else if (el.id === 'barcodeText') text = (previewProductData.barcode || previewProductData.sku || '').toUpperCase();
      else if (el.id === 'subCategory' && previewProductData.subCategory) text = (el.staticText || '') + (previewProductData.subCategory || '').toUpperCase().slice(0, 10);

      const fontSizeInMm = (el.fontSize || 6) * 0.352778;
      const baselineY = el.y + (fontSizeInMm * 0.72);
      const fontTopMm = baselineY - fontSizeInMm;

      return (
        <div
          key={el.id}
          style={{
            ...baseStyle,
            top: `${fontTopMm * MM_TO_PX}px`,
            fontSize: `${(el.fontSize || 6) * 1.33}px`,
            fontWeight: el.isBold ? 900 : 'normal',
            fontFamily: el.fontFamily === 'times' ? 'Times New Roman, Times, serif' : el.fontFamily === 'courier' ? 'Courier New, Courier, monospace' : 'Helvetica, Arial, sans-serif',
            whiteSpace: 'nowrap',
            color: '#1e293b',
            lineHeight: 1
          }}
        >
          {text}
        </div>
      );
    } else if (el.type === 'barcode') {
      const w = (el.width || 0.16) * 15 * MM_TO_PX;
      const h = (el.height || 7) * MM_TO_PX;
      return (
        <div
          key={el.id}
          style={{
            ...baseStyle,
            width: `${w}px`,
            height: `${h}px`,
            backgroundColor: '#1e293b',
            backgroundImage: 'repeating-linear-gradient(90deg, #1e293b 0px, #1e293b 2px, transparent 2px, transparent 4px)'
          }}
        />
      );
    } else if (el.type === 'line') {
      const bStyle = el.borderStyle === 'dashed' ? 'dashed' : el.borderStyle === 'dotted' ? 'dotted' : 'solid';
      if (el.width === 0 && el.height !== undefined) {
        return (
          <div
            key={el.id}
            style={{
              ...baseStyle,
              width: 0,
              height: `${el.height * MM_TO_PX}px`,
              borderLeft: `0.8px ${bStyle} #1e293b`
            }}
          />
        );
      }
      return (
        <div key={el.id} style={{ ...baseStyle, width: `${(el.width || 10) * MM_TO_PX}px`, minHeight: '1px', display: 'flex', itemsCenter: 'center' }}>
          <div style={{ width: '100%', height: 0, borderBottom: `${(el.height && el.height <= 1 ? el.height : 0.2) * MM_TO_PX}px ${bStyle} #1e293b` }} />
        </div>
      );
    } else if (el.type === 'rect') {
      const bStyle = el.borderStyle === 'dashed' ? 'dashed' : el.borderStyle === 'dotted' ? 'dotted' : 'solid';
      return (
        <div
          key={el.id}
          style={{
            ...baseStyle,
            width: `${(el.width || 10) * MM_TO_PX}px`,
            height: `${(el.height || 10) * MM_TO_PX}px`,
            border: `0.8px ${bStyle} #1e293b`,
            borderRadius: `${(el.borderRadius || 0) * MM_TO_PX}px`,
            backgroundColor: 'transparent'
          }}
        />
      );
    }
    return null;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Print Product Tags" maxWidth="max-w-4xl">
      <div className="flex flex-col lg:flex-row gap-6 py-1">
        
        {/* LEFT / MAIN COLUMN: Preview & Actions */}
        <div className="flex-1 space-y-5">
          {/* Header Summary */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{product.name}</h4>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                SKU: {product.sku} • {product.category}
              </p>
            </div>
            <span className="bg-[#8B5CF6]/10 text-[#8B5CF6] text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg">
              {availableSizes.length} {availableSizes.length === 1 ? 'Size' : 'Sizes'}
            </span>
          </div>

          {/* Live Visual Preview Container */}
          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Layers size={12} /> Live Preview ({activePreset.template.labelWidth}mm × {activePreset.template.labelHeight}mm)
              </label>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                Size: <strong className="text-slate-800">{previewSize}</strong>
              </span>
            </div>

            <div className="bg-slate-150/60 p-6 rounded-2xl border border-slate-200/80 flex items-center justify-center min-h-[190px] overflow-hidden shadow-inner">
              <div
                ref={previewRef}
                style={{
                  width: `${activePreset.template.labelWidth * MM_TO_PX}px`,
                  height: `${activePreset.template.labelHeight * MM_TO_PX}px`,
                  backgroundColor: '#ffffff',
                  position: 'relative',
                  borderRadius: '4px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  transform: `scale(1.5)`,
                  transformOrigin: 'center center',
                  margin: '20px auto'
                }}
              >
                {activePreset.template.elements.map(el => renderPreviewElement(el))}
              </div>
            </div>
          </div>

          {/* Sizes Selection */}
          {availableSizes.length > 1 && (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Sizes to Print ({selectedSizes.length} of {availableSizes.length})
                </label>
                <button
                  type="button"
                  onClick={toggleAllSizes}
                  className="text-[8px] font-bold text-[#8B5CF6] hover:underline uppercase tracking-widest"
                >
                  {selectedSizes.length === availableSizes.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {availableSizes.map(size => {
                  const isSelected = selectedSizes.includes(size);
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => toggleSize(size)}
                      className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                        isSelected
                          ? 'bg-[#8B5CF6] text-white border-[#8B5CF6] shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected ? `✓ ${size}` : size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="py-3 px-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-md shadow-[#8B5CF6]/20 transition-all flex items-center justify-center gap-1.5"
            >
              <Download size={13} /> PDF ({selectedSizes.length})
            </button>

            <button
              type="button"
              onClick={handleDownloadPNG}
              disabled={isDownloadingImage}
              className="py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
            >
              <ImageIcon size={13} /> {isDownloadingImage ? 'Generating...' : 'Image (PNG)'}
            </button>
            
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDesigner(activePreset.template, selectedSizes);
              }}
              className="py-3 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
            >
              <Edit2 size={13} /> Customize
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Presets List */}
        <div className="w-full lg:w-72 bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-4 shrink-0 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-1.5">
              <LayoutGrid size={13} className="text-[#8B5CF6]" /> Design Presets
            </h3>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              {allPresets.length} Total
            </span>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto max-h-[350px] lg:max-h-none pr-1">
            {/* Built-in Layouts */}
            <div className="space-y-2">
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1 ml-1">
                <Sparkles size={10} className="text-amber-500" /> Standard Templates
              </span>

              <div className="space-y-1.5">
                {builtInPresets.map((preset) => {
                  const globalIdx = allPresets.findIndex(p => p.id === preset.id);
                  const isSelected = selectedIndex === globalIdx;

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedIndex(globalIdx)}
                      className={`w-full p-3 rounded-xl text-left transition-all border flex items-center justify-between ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-[1.01]'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <p className="text-[9.5px] font-black uppercase tracking-wider leading-tight">{preset.name}</p>
                        <p className={`text-[8px] font-semibold tracking-widest uppercase ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                          {preset.template.labelWidth}mm × {preset.template.labelHeight}mm
                        </p>
                      </div>

                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center shrink-0">
                          <Check size={11} strokeWidth={3} />
                        </div>
                      ) : (
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Select</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Saved Presets */}
            <div className="space-y-2 pt-2 border-t border-slate-200/80">
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1 ml-1">
                <Tag size={10} className="text-[#8B5CF6]" /> Custom Presets
              </span>

              {customPresets.length > 0 ? (
                <div className="space-y-1.5">
                  {customPresets.map((preset) => {
                    const globalIdx = allPresets.findIndex(p => p.id === preset.id);
                    const isSelected = selectedIndex === globalIdx;

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedIndex(globalIdx)}
                        className={`w-full p-3 rounded-xl text-left transition-all border flex items-center justify-between ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-[1.01]'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100/80'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <p className="text-[9.5px] font-black uppercase tracking-wider leading-tight">{preset.name}</p>
                          <p className={`text-[8px] font-semibold tracking-widest uppercase ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                            {preset.template.labelWidth}mm × {preset.template.labelHeight}mm
                          </p>
                        </div>

                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center shrink-0">
                            <Check size={11} strokeWidth={3} />
                          </div>
                        ) : (
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Select</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3.5 bg-white rounded-xl border border-dashed border-slate-200 text-center space-y-1.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 text-slate-300 flex items-center justify-center mx-auto">
                    <FolderX size={14} />
                  </div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No Custom Presets Found</p>
                  <p className="text-[7.5px] text-slate-400 font-semibold leading-normal">
                    Save custom designs in the Label Designer to list them here!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </Modal>
  );
};
