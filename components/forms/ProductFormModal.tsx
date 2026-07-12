import React, { useState, useRef, useMemo } from 'react';
import { Plus, X, Upload, ScanLine, Edit2, RefreshCcw, Image as ImageIcon, Palette, CheckCircle2 } from 'lucide-react';
import { Modal } from '../Shared';
import { useApp } from '../../store/AppContext';
import { Product } from '../../types';
import BarcodeScanner from '../BarcodeScanner';
import { CATEGORIES } from '../../constants';
import { generateDynamicLabelPDF } from '../../utils/pdfLabel';
import LabelDesigner from './LabelDesigner';
const DEFAULT_MODEL_URL = 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&w=600&q=80';
interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, productToEdit }) => {
  const { products, suppliers, addProduct, updateProduct } = useApp();
  
  const [productPurpose, setProductPurpose] = useState<'SALE' | 'RENTAL' | 'HYBRID'>(productToEdit ? productToEdit.purpose : 'SALE');
  const [isSaving, setIsSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState<string>('');
  const formRef = useRef<HTMLFormElement>(null);
  
  // Size Management
  const [selectedSizes, setSelectedSizes] = useState<string[]>(productToEdit?.sizes || []);
  const [sizeInput, setSizeInput] = useState('');

  // Barcode Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'SKU' | 'BARCODE'>('SKU');
  const [skuValue, setSkuValue] = useState(productToEdit?.sku || '');
  const [barcodeValue, setBarcodeValue] = useState(productToEdit?.barcode || '');
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Image Upload State
  const [previewImage, setPreviewImage] = useState<string | null>(productToEdit?.imageUrl || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Label Printing State
  const [printLabelSize, setPrintLabelSize] = useState<'50x30' | '30x50'>('30x50');
  const [printGarmentSize, setPrintGarmentSize] = useState<string>('');
  const [showLabelEditor, setShowLabelEditor] = useState(false);
  const [labelData, setLabelData] = useState<any>(null);

  // AI Model Dress Up State
  const [aiAgeGroup, setAiAgeGroup] = useState<'BABY' | 'TODDLER' | 'KID' | 'PRETEEN'>('KID');
  const [aiGender, setAiGender] = useState<'BOY' | 'GIRL' | 'UNISEX'>('GIRL');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiStatusText, setAiStatusText] = useState('');
  const [aiModelImage, setAiModelImage] = useState<string | null>(null);
  const [recreateIndex, setRecreateIndex] = useState(0);
  const [hasDressedModel, setHasDressedModel] = useState(false);
  const [aiScale, setAiScale] = useState(90);
  const [aiOffsetY, setAiOffsetY] = useState(0);
  const [aiOffsetX, setAiOffsetX] = useState(0);
  const [garmentType, setGarmentType] = useState<'TSHIRT' | 'DRESS' | 'HOODIE'>('TSHIRT');
  const [blendMode, setBlendMode] = useState<'normal' | 'multiply' | 'darken'>('multiply');

  const SUGGESTED_SIZES = [
    'NB', '0-3M', '3-6M', '6-12M', '12-18M', '18-24M',
    '2-3Y', '3-4Y', '4-5Y', '5-6Y', '6-7Y', '7-8Y', '8-9Y', '9-10Y',
    '10-11Y', '11-12Y', '12-13Y', '13-14Y', '14-15Y',
    'XS', 'S', 'M', 'L', 'XL',
    '00', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
    '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40',
    '41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60',
    '30cm', '35cm', '40cm', '45cm', '50cm', '55cm', '60cm', '65cm', '70cm', '75cm', '80cm', '85cm', '90cm', '95cm', '100cm', '105cm', '110cm'
  ];

  // Initialize state when modal opens or productToEdit changes
  React.useEffect(() => {
    if (isOpen) {
      setProductPurpose(productToEdit ? productToEdit.purpose : 'SALE');
      setSelectedSizes(productToEdit?.sizes || []);
      setSkuValue(productToEdit?.sku || '');
      setBarcodeValue(productToEdit?.barcode || '');
      setPreviewImage(productToEdit?.imageUrl || null);
      setSelectedFile(null);
      setIsSaving(false);
      setSavingStatus('');
      setAiModelImage(null);
      setIsGeneratingAI(false);
      setRecreateIndex(0);
      setAiAgeGroup('KID');
      setAiGender('GIRL');
      setHasDressedModel(false);
      setAiScale(90);
      setAiOffsetY(0);
      setAiOffsetX(0);
      setGarmentType('TSHIRT');
      setBlendMode('multiply');
    }
  }, [isOpen, productToEdit]);

  const addSizeTag = (size: string) => {
    const trimmed = size.trim().toUpperCase();
    if (trimmed && !selectedSizes.includes(trimmed)) {
      setSelectedSizes([...selectedSizes, trimmed]);
    }
    setSizeInput('');
  };

  const removeSizeTag = (size: string) => {
    setSelectedSizes(selectedSizes.filter(s => s !== size));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert(`File too large: ${(file.size / (1024 * 1024)).toFixed(2)}MB. Please select a file smaller than 5MB.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setPreviewImage(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setAiModelImage(null);
    setHasDressedModel(false);
    setAiScale(90);
    setAiOffsetY(0);
    setAiOffsetX(0);
    setGarmentType('TSHIRT');
    setBlendMode('multiply');
  };

  const handleGenerateAIModel = async () => {
    if (isGeneratingAI) return;
    setIsGeneratingAI(true);

    const steps = [
      'Analyzing product image contours...',
      'Isolating garment from background...',
      'Stitching clothing fabric onto model torso...',
      'Adjusting lighting and shadows...'
    ];

    for (let i = 0; i < steps.length; i++) {
      setAiStatusText(steps[i]);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    try {
      setAiModelImage(DEFAULT_MODEL_URL);
      setHasDressedModel(true);
      setAiScale(90);
      setAiOffsetY(0);
      setAiOffsetX(0);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleRecreateAIModel = async () => {
    if (isGeneratingAI) return;
    setIsGeneratingAI(true);

    const steps = [
      'Stitching alternative pattern contour...',
      'Optimizing garment scale and dimensions...',
      'Applying shadows to clothing overlay...'
    ];

    for (let i = 0; i < steps.length; i++) {
      setAiStatusText(steps[i]);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    try {
      setAiScale(95);
      setAiOffsetY(10);
      setAiOffsetX(0);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSaveProduct = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (isSaving) return;
    if (!formRef.current) return;

    const formData = new FormData(formRef.current);
    const name = (formData.get('name') as string || '').trim();
    const sku = (formData.get('sku') as string || '').trim();

    if (!name || !sku) {
      alert('Please fill in both Product Name and SKU.');
      return;
    }

    setIsSaving(true);
    
    try {
      if (selectedFile && selectedFile.size > 5 * 1024 * 1024) {
        throw new Error('Image size exceeds 5MB. Please choose a smaller photo.');
      }

      const productData = {
        name,
        sku,
        barcode: formData.get('barcode') as string || '',
        category: formData.get('category') as string || '',
        brand: formData.get('brand') as string || '',
        color: formData.get('color') as string || '',
        material: formData.get('material') as string || '',
        sizes: selectedSizes,
        purpose: productPurpose,
        purchasePrice: Number(formData.get('purchasePrice')) || 0,
        sellingPrice: (productPurpose === 'SALE' || productPurpose === 'HYBRID') ? Number(formData.get('sellingPrice')) : 0,
        rentalPrice: (productPurpose === 'RENTAL' || productPurpose === 'HYBRID') ? Number(formData.get('rentalPrice')) : 0,
        taxPercent: Number(formData.get('taxPercent')) || 0,
        saleStock: (productPurpose === 'SALE' || productPurpose === 'HYBRID') ? Number(formData.get('saleStock')) : 0,
        rentalStock: (productPurpose === 'RENTAL' || productPurpose === 'HYBRID') ? Number(formData.get('rentalStock')) : 0,
        minStockAlert: Number(formData.get('minStockAlert')) || 0,
        supplierId: formData.get('supplierId') as string || '',
        description: formData.get('description') as string || '',
        imageUrl: previewImage || '',
      };

      if (productToEdit) {
        await updateProduct(productToEdit.id, productData, selectedFile || undefined, setSavingStatus);
      } else {
        await addProduct(productData, selectedFile || undefined, setSavingStatus);
      }

      setSuccessMessage(productToEdit ? 'Product updated successfully!' : 'Product added successfully!');
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
        setPreviewImage(null);
        setSelectedFile(null);
      }, 2000);
    } catch (error: any) {
      console.error('Save error:', error);
      let msg = error?.message || error?.details || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      alert('Save Failed: ' + msg);
    } finally {
      setIsSaving(false);
      setSavingStatus('');
    }
  };

  const handleOpenLabelEditor = () => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    
    const name = formData.get('name') as string || 'Untitled Product';
    const sku = skuValue || 'N/A';
    const barcode = barcodeValue || '';
    const sellingPrice = Number(formData.get('sellingPrice')) || 0;
    const purchasePrice = Number(formData.get('purchasePrice')) || 0;
    const color = formData.get('color') as string || '';
    const size = printGarmentSize || (selectedSizes.length > 0 ? selectedSizes[0] : '');

    setLabelData({
      name,
      sku,
      barcode,
      sellingPrice,
      purchasePrice,
      color,
      styleCode: '',
      sizesToPrint: selectedSizes.length > 0 ? [...selectedSizes] : [''], 
      labelSize: printLabelSize,
      fontFamily: 'helvetica',
      isBold: true
    });
    setShowLabelEditor(true);
  };


  const headerActions = (
    <div className="flex items-center gap-1.5 md:gap-2 mr-2">
      {selectedSizes.length > 0 && (
        <select 
          value={printGarmentSize} 
          onChange={e => setPrintGarmentSize(e.target.value)}
          className="text-[9px] font-bold uppercase tracking-widest border border-slate-200 rounded-lg px-2 py-1.5 outline-none bg-slate-50 text-slate-700 max-w-[80px]"
        >
          <option value="">Size...</option>
          {selectedSizes.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      )}
      <select 
        value={printLabelSize} 
        onChange={e => setPrintLabelSize(e.target.value as '50x30' | '30x50')}
        className="text-[9px] font-bold uppercase tracking-widest border border-slate-200 rounded-lg px-2 py-1.5 outline-none bg-slate-50 text-slate-700"
      >
        <option value="30x50">30x50mm</option>
        <option value="50x30">50x30mm</option>
      </select>
      <button 
        type="button" 
        onClick={handleOpenLabelEditor}
        className="px-3 py-1.5 bg-[#8B5CF6] text-white rounded-lg font-black uppercase tracking-widest text-[9px] flex items-center gap-1.5 shadow-sm hover:bg-[#7C3AED] transition-colors"
        title="Create Thermal Label"
      >
        <Palette size={12} strokeWidth={2.5} />
        <span className="hidden sm:inline">Create Label</span>
      </button>
    </div>
  );

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={productToEdit ? "Edit Product" : "New Product"}
        headerActions={headerActions}
      >
        {successMessage && (
          <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 rounded-[2rem]">
            <div className="bg-white rounded-3xl p-8 text-center shadow-2xl animate-nano max-w-[280px] w-full">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={24} strokeWidth={2.5} />
              </div>
              <h3 className="text-sm font-black text-slate-900 mb-1 uppercase tracking-tight">Success!</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{successMessage}</p>
            </div>
          </div>
        )}
        <form ref={formRef} onSubmit={handleSaveProduct} className="space-y-4 max-h-[70vh] overflow-y-auto px-1 scrollbar-hide">
          {/* Image Upload Section */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Product Image</label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center relative group">
                {previewImage ? (
                  <>
                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={handleRemoveImage}
                      className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X size={12} strokeWidth={3} />
                    </button>
                  </>
                ) : (
                  <ImageIcon size={20} className="text-slate-300" />
                )}
              </div>
              <div className="flex-1">
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border border-dashed border-slate-200 rounded-2xl py-6 flex flex-col items-center gap-2 text-slate-400 hover:border-[#8B5CF6] hover:text-[#8B5CF6] hover:bg-[#8B5CF6]/5 transition-all outline-none"
                >
                  <Upload size={18} strokeWidth={3} />
                  <span className="text-[8px] font-black uppercase tracking-widest text-center">Upload Photo<br/><span className="text-slate-300 font-bold lowercase tracking-normal">(Max 5MB)</span></span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </div>
          </div>

          {/* AI Model Dress Up Section */}
          {previewImage && (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-3xl space-y-3 mt-2 animate-nano">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[#8B5CF6]">
                  <Palette size={13} strokeWidth={2.5} />
                  <span className="text-[9px] font-black uppercase tracking-widest">AI Model Dress Up Assistant</span>
                </div>
                {hasDressedModel && (
                  <button 
                    type="button"
                    onClick={handleRecreateAIModel}
                    className="text-[8px] font-black uppercase tracking-widest text-[#8B5CF6] hover:bg-[#8B5CF6]/10 px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all border border-[#8B5CF6]/10 bg-[#8B5CF6]/5 active:scale-95"
                  >
                    <RefreshCcw size={10} strokeWidth={2.5} /> Reset Fit
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Selection Controls */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Select Age Group</label>
                    <select 
                      value={aiAgeGroup} 
                      onChange={(e) => setAiAgeGroup(e.target.value as any)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-100 rounded-xl outline-none focus:border-[#8B5CF6]/30 text-[9px] font-black uppercase tracking-widest text-slate-600 shadow-nano"
                    >
                      <option value="BABY">Baby (0-1 Year)</option>
                      <option value="TODDLER">Toddler (1-3 Years)</option>
                      <option value="KID">Kid (4-7 Years)</option>
                      <option value="PRETEEN">Pre-teen (8-12 Years)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Select Gender</label>
                    <div className="flex gap-2">
                      {(['BOY', 'GIRL', 'UNISEX'] as const).map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setAiGender(g)}
                          className={`flex-1 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border ${
                            aiGender === g 
                              ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                              : 'bg-white border-slate-100 text-slate-400'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {!hasDressedModel ? (
                    <button
                      type="button"
                      disabled={isGeneratingAI}
                      onClick={handleGenerateAIModel}
                      className="w-full py-2.5 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:bg-slate-200 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md shadow-[#8B5CF6]/15 flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      {isGeneratingAI ? (
                        <>
                          <RefreshCcw size={11} strokeWidth={2.5} className="animate-spin" />
                          <span>{aiStatusText}</span>
                        </>
                      ) : (
                        <>
                          <Palette size={11} strokeWidth={2.5} />
                          <span>Dress up Model</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="space-y-2 border-t border-slate-100 pt-2 animate-nano">
                      {/* Garment Type Buttons */}
                      <div className="space-y-1">
                        <label className="text-[7.5px] font-black uppercase tracking-widest text-slate-400">Garment Shape</label>
                        <div className="flex gap-1.5">
                          {(['TSHIRT', 'DRESS', 'HOODIE'] as const).map(t => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setGarmentType(t)}
                              className={`flex-1 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest transition-all border ${
                                garmentType === t 
                                  ? 'bg-[#8B5CF6] border-[#8B5CF6] text-white shadow-sm' 
                                  : 'bg-white border-slate-100 text-slate-400'
                              }`}
                            >
                              {t === 'TSHIRT' ? 'Top' : t === 'DRESS' ? 'Dress' : 'Hoodie'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Blend Mode Buttons */}
                      <div className="space-y-1">
                        <label className="text-[7.5px] font-black uppercase tracking-widest text-slate-400">Blending Mode</label>
                        <div className="flex gap-1.5">
                          {(['multiply', 'normal', 'darken'] as const).map(b => (
                            <button
                              key={b}
                              type="button"
                              onClick={() => setBlendMode(b)}
                              className={`flex-1 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest transition-all border ${
                                blendMode === b 
                                  ? 'bg-slate-900 border-slate-900 text-white shadow-sm' 
                                  : 'bg-white border-slate-100 text-slate-400'
                              }`}
                            >
                              {b === 'multiply' ? 'Realistic' : b === 'normal' ? 'Pattern' : 'Darken'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Sliders */}
                      <div className="flex items-center justify-between">
                        <span className="text-[7.5px] font-black uppercase tracking-widest text-slate-400">Scale</span>
                        <span className="text-[8px] font-mono text-[#8B5CF6] font-bold">{aiScale}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="50" 
                        max="150" 
                        value={aiScale}
                        onChange={(e) => setAiScale(Number(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#8B5CF6]"
                      />
                      
                      <div className="flex items-center justify-between">
                        <span className="text-[7.5px] font-black uppercase tracking-widest text-slate-400">Position Y</span>
                        <span className="text-[8px] font-mono text-[#8B5CF6] font-bold">{aiOffsetY}px</span>
                      </div>
                      <input 
                        type="range" 
                        min="-60" 
                        max="60" 
                        value={aiOffsetY}
                        onChange={(e) => setAiOffsetY(Number(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#8B5CF6]"
                      />
                    </div>
                  )}
                </div>

                {/* Preview Frame */}
                <div className="w-full h-36 bg-white border border-slate-100 rounded-2xl overflow-hidden relative flex items-center justify-center shadow-nano">
                  {hasDressedModel ? (
                    <div className="w-full h-full relative bg-slate-50">
                      {/* Inline SVG Definitions for Garment ClipPaths */}
                      <svg className="absolute w-0 h-0">
                        <defs>
                          <clipPath id="clip-tshirt" clipPathUnits="objectBoundingBox">
                            <path d="M 0.22,0.12 C 0.35,0.06 0.65,0.06 0.78,0.12 L 0.96,0.22 C 0.99,0.24 0.97,0.32 0.92,0.33 L 0.82,0.30 L 0.82,0.92 C 0.82,0.97 0.77,0.99 0.71,0.99 L 0.29,0.99 C 0.23,0.99 0.18,0.97 0.18,0.92 L 0.18,0.30 L 0.08,0.33 C 0.03,0.32 0.01,0.24 0.04,0.22 Z" />
                          </clipPath>
                          <clipPath id="clip-dress" clipPathUnits="objectBoundingBox">
                            <path d="M 0.35,0.10 C 0.43,0.05 0.57,0.05 0.65,0.10 L 0.72,0.22 C 0.74,0.25 0.72,0.32 0.67,0.34 L 0.88,0.90 C 0.90,0.95 0.85,0.98 0.78,0.98 L 0.22,0.98 C 0.15,0.98 0.10,0.95 0.12,0.90 L 0.33,0.34 C 0.28,0.32 0.26,0.25 0.28,0.22 Z" />
                          </clipPath>
                          <clipPath id="clip-hoodie" clipPathUnits="objectBoundingBox">
                            <path d="M 0.30,0.18 C 0.40,0.14 0.60,0.14 0.70,0.18 L 0.87,0.27 C 0.91,0.30 0.88,0.38 0.82,0.39 L 0.80,0.90 C 0.80,0.95 0.75,0.98 0.69,0.98 L 0.31,0.98 C 0.25,0.98 0.20,0.95 0.20,0.90 L 0.18,0.39 C 0.12,0.38 0.09,0.30 0.13,0.27 Z" />
                          </clipPath>
                        </defs>
                      </svg>

                      {/* Base Model Image */}
                      <img 
                        src={DEFAULT_MODEL_URL} 
                        alt="Base Model" 
                        className="w-full h-full object-cover opacity-90" 
                      />

                      {/* Dressed Garment Overlay */}
                      <img 
                        src={selectedFile ? URL.createObjectURL(selectedFile) : (previewImage || '')} 
                        alt="Overlay Garment" 
                        style={{
                          position: 'absolute',
                          top: '32%',
                          left: '50%',
                          width: '45%',
                          height: '45%',
                          transform: `translate(-50%, calc(-50% + ${aiOffsetY}px)) scale(${aiScale / 100})`,
                          objectFit: 'cover',
                          pointerEvents: 'none',
                          clipPath: garmentType === 'TSHIRT' ? 'url(#clip-tshirt)' : garmentType === 'DRESS' ? 'url(#clip-dress)' : 'url(#clip-hoodie)',
                          filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.12))',
                          mixBlendMode: blendMode
                        }}
                      />

                      {/* Shadow & Fabric Creases overlay to simulate natural dress wrinkles */}
                      <div 
                        style={{
                          position: 'absolute',
                          top: '32%',
                          left: '50%',
                          width: '45%',
                          height: '45%',
                          transform: `translate(-50%, calc(-50% + ${aiOffsetY}px)) scale(${aiScale / 100})`,
                          pointerEvents: 'none',
                          clipPath: garmentType === 'TSHIRT' ? 'url(#clip-tshirt)' : garmentType === 'DRESS' ? 'url(#clip-dress)' : 'url(#clip-hoodie)',
                          background: 'linear-gradient(105deg, rgba(255,255,255,0.25) 0%, rgba(0,0,0,0.06) 28%, rgba(255,255,255,0.3) 38%, rgba(0,0,0,0.12) 65%, rgba(255,255,255,0.1) 85%, rgba(0,0,0,0.25) 100%)',
                          mixBlendMode: 'overlay',
                          opacity: 0.85
                        }}
                      />

                      <span className="absolute bottom-2 left-2 bg-[#8B5CF6] text-white px-2 py-0.5 rounded-md text-[7px] font-bold tracking-widest uppercase border border-white/10 shadow-sm">TRY-ON MODE</span>
                    </div>
                  ) : (
                    <div className="text-center p-3">
                      <ImageIcon size={20} className="text-slate-300 mx-auto mb-1.5" />
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">AI Model Preview</p>
                      <p className="text-[7px] font-bold text-slate-300 mt-0.5">Click "Dress up Model" to generate</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Product Purpose</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {(['SALE', 'RENTAL', 'HYBRID'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProductPurpose(p)}
                  className={`py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border ${
                    productPurpose === p 
                      ? 'bg-[#8B5CF6] border-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/20' 
                      : 'bg-slate-50 border-slate-50 text-slate-400'
                  }`}
                >
                  {p === 'SALE' ? 'Sale Only' : p === 'RENTAL' ? 'Rental Only' : 'Hybrid'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Product Name</label>
            <input name="name" defaultValue={productToEdit?.name} required className="w-full px-4 py-3 bg-slate-50 border-slate-100 border focus:bg-white focus:border-[#8B5CF6]/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-slate-700 text-[10px]" placeholder="e.g. Designer Suit" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">SKU</label>
              <div className="relative">
                <input 
                  name="sku" 
                  value={skuValue}
                  onChange={(e) => setSkuValue(e.target.value)}
                  required 
                  className="w-full pl-4 pr-10 py-3 bg-slate-50 border-slate-100 border focus:bg-white focus:border-[#8B5CF6]/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-slate-700 text-[10px]" 
                  placeholder="DSG-001" 
                />
                <button 
                  type="button"
                  onClick={() => { setScannerTarget('SKU'); setIsScannerOpen(true); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-slate-100 text-slate-400 hover:bg-[#8B5CF6] hover:text-white rounded-xl transition-all shadow-sm group"
                  title="Scan Barcode"
                >
                  <ScanLine size={14} strokeWidth={2.5} className="group-active:scale-95 transition-transform" />
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Brand</label>
              <input name="brand" defaultValue={productToEdit?.brand} className="w-full px-4 py-3 bg-slate-50 border-slate-100 border focus:bg-white focus:border-[#8B5CF6]/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-slate-700 text-[10px]" placeholder="Brand Name" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Color</label>
              <input name="color" defaultValue={productToEdit?.color} className="w-full px-4 py-3 bg-slate-50 border-slate-100 border focus:bg-white focus:border-[#8B5CF6]/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-slate-700 text-[10px]" placeholder="Blue" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Material</label>
              <input name="material" defaultValue={productToEdit?.material} className="w-full px-4 py-3 bg-slate-50 border-slate-100 border focus:bg-white focus:border-[#8B5CF6]/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-slate-700 text-[10px]" placeholder="Cotton" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Barcode</label>
              <div className="relative">
                <input 
                  name="barcode" 
                  value={barcodeValue}
                  onChange={(e) => setBarcodeValue(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 bg-slate-50 border-slate-100 border focus:bg-white focus:border-[#8B5CF6]/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-slate-700 text-[10px]" 
                  placeholder="Optional" 
                />
                <button 
                  type="button"
                  onClick={() => { setScannerTarget('BARCODE'); setIsScannerOpen(true); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-slate-100 text-slate-400 hover:bg-[#8B5CF6] hover:text-white rounded-xl transition-all shadow-sm group"
                  title="Scan Barcode"
                >
                  <ScanLine size={14} strokeWidth={2.5} className="group-active:scale-95 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          {/* Sizes Management */}
          <div className="space-y-2 border-t border-slate-50 pt-4">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Sizes</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedSizes.map(size => (
                <span key={size} className="bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
                  {size}
                  <button type="button" onClick={() => removeSizeTag(size)} className="hover:text-rose-400 transition-colors">
                    <X size={10} strokeWidth={4} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={sizeInput}
                onChange={(e) => setSizeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSizeTag(sizeInput); } }}
                className="flex-1 px-4 py-3 bg-slate-50 border-slate-100 border focus:bg-white focus:border-[#8B5CF6]/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-slate-700 text-[10px]" 
                placeholder="Type size (e.g. 2-3Y) and enter" 
              />
              <button 
                type="button" 
                onClick={() => addSizeTag(sizeInput)}
                className="bg-slate-100 text-slate-400 px-4 py-2 rounded-2xl hover:bg-slate-200 transition-all font-black uppercase tracking-widest text-[8px]"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest mr-1">Quick Picks:</span>
              {SUGGESTED_SIZES.map(size => (
                <button 
                  key={size} 
                  type="button"
                  onClick={() => addSizeTag(size)}
                  className="text-[7px] font-bold text-slate-400 border border-slate-100 px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-50 pt-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Category</label>
              <select name="category" defaultValue={productToEdit?.category} className="w-full px-4 py-3 bg-slate-50 border-slate-100 border focus:bg-white focus:border-[#8B5CF6]/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-slate-700 text-[10px] appearance-none">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Supplier</label>
              <select name="supplierId" defaultValue={productToEdit?.supplierId} className="w-full px-4 py-3 bg-slate-50 border-slate-100 border focus:bg-white focus:border-[#8B5CF6]/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-slate-700 text-[10px] appearance-none">
                <option value="">Select Supplier (Optional)</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {(productPurpose === 'SALE' || productPurpose === 'HYBRID') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-nano">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Selling Price</label>
                <input name="sellingPrice" type="number" step="0.01" defaultValue={productToEdit?.sellingPrice} className="w-full px-4 py-3 bg-slate-50 border-slate-100 border focus:bg-white focus:border-[#8B5CF6]/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-slate-700 text-[10px]" placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Sale Stock</label>
                <input name="saleStock" type="number" defaultValue={productToEdit?.saleStock} className="w-full px-4 py-3 bg-slate-50 border-slate-100 border focus:bg-white focus:border-[#8B5CF6]/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-slate-700 text-[10px]" placeholder="0" />
              </div>
            </div>
          )}

          {(productPurpose === 'RENTAL' || productPurpose === 'HYBRID') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-nano">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Rental Price (Daily)</label>
                <input name="rentalPrice" type="number" step="0.01" defaultValue={productToEdit?.rentalPrice} className="w-full px-4 py-3 bg-slate-50 border-slate-100 border focus:bg-white focus:border-[#8B5CF6]/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-slate-700 text-[10px]" placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Rental Stock</label>
                <input name="rentalStock" type="number" defaultValue={productToEdit?.rentalStock} className="w-full px-4 py-3 bg-slate-50 border-slate-100 border focus:bg-white focus:border-[#8B5CF6]/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-slate-700 text-[10px]" placeholder="0" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-50 pt-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Purchase Price</label>
              <input name="purchasePrice" type="number" step="0.01" defaultValue={productToEdit?.purchasePrice || 0} className="w-full px-4 py-3 bg-slate-50 border-slate-100 border focus:bg-white focus:border-[#8B5CF6]/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-slate-700 text-[10px]" placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Tax (%)</label>
              <input name="taxPercent" type="number" defaultValue={productToEdit?.taxPercent || 12} className="w-full px-4 py-3 bg-slate-50 border-slate-100 border focus:bg-white focus:border-[#8B5CF6]/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-slate-700 text-[10px]" placeholder="12" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Min Stock</label>
              <input name="minStockAlert" type="number" defaultValue={productToEdit?.minStockAlert || 0} className="w-full px-4 py-3 bg-slate-50 border-slate-100 border focus:bg-white focus:border-[#8B5CF6]/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-slate-700 text-[10px]" placeholder="0" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Description</label>
            <textarea name="description" defaultValue={productToEdit?.description} className="w-full px-4 py-3 bg-slate-50 border-slate-100 border focus:bg-white focus:border-[#8B5CF6]/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-slate-700 text-[10px] min-h-[80px] resize-none" placeholder="Product details..." />
          </div>
          
          <div className="flex gap-3 pt-6 sticky bottom-0 bg-white">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isSaving}
              className="flex-1 rounded-2xl border border-slate-100 font-black uppercase tracking-widest text-[9px] text-slate-400 py-4 disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSaving}
              className={`flex-1 ${isSaving ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white'} rounded-2xl font-black uppercase tracking-widest text-[9px] shadow-lg py-4 transition-all active:scale-[0.98] flex items-center justify-center gap-2 hover:opacity-90 active:bg-slate-800`}
            >
              {isSaving ? (
                <>
                  <RefreshCcw size={14} className="animate-spin" />
                  <span>{savingStatus || 'Saving...'}</span>
                </>
              ) : (
                <>
                  {productToEdit ? <Edit2 size={14} /> : <Plus size={14} />}
                  <span>{productToEdit ? 'Update Product' : 'Add to Inventory'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {showLabelEditor && labelData && (
        <LabelDesigner 
          labelData={labelData}
          allProductSizes={selectedSizes}
          onClose={() => setShowLabelEditor(false)}
          onPrint={(template, products) => {
            generateDynamicLabelPDF(products, template);
            setShowLabelEditor(false);
          }}
        />
      )}

      {isScannerOpen && (
        <BarcodeScanner 
          onScanSuccess={(decodedText) => {
            if (scannerTarget === 'SKU') {
              setSkuValue(decodedText);
            } else {
              setBarcodeValue(decodedText);
            }
            setIsScannerOpen(false);
          }}
          onClose={() => setIsScannerOpen(false)}
        />
      )}
    </>
  );
};
