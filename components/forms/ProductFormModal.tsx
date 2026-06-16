import React, { useState, useRef, useMemo } from 'react';
import { Plus, X, Upload, ScanLine, Edit2, RefreshCcw, Image as ImageIcon } from 'lucide-react';
import { Modal } from '../Shared';
import { useApp } from '../../store/AppContext';
import { Product } from '../../types';
import BarcodeScanner from '../BarcodeScanner';
import { CATEGORIES } from '../../constants';

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

  // Image Upload State
  const [previewImage, setPreviewImage] = useState<string | null>(productToEdit?.imageUrl || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const SUGGESTED_SIZES = [
    'NB', '0-3M', '3-6M', '6-12M', '12-18M', '18-24M',
    '2-3Y', '3-4Y', '4-5Y', '5-6Y', '6-7Y', '7-8Y', '8-9Y', '9-10Y',
    '10-11Y', '11-12Y', '12-13Y', '13-14Y', '14-15Y',
    'XS', 'S', 'M', 'L', 'XL'
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
      };

      if (productToEdit) {
        await updateProduct(productToEdit.id, productData, selectedFile || undefined, setSavingStatus);
      } else {
        await addProduct(productData, selectedFile || undefined, setSavingStatus);
      }

      onClose();
      // Only clear if successful
      setPreviewImage(null);
      setSelectedFile(null);
      alert('Product saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      let msg = error instanceof Error ? error.message : String(error);
      try {
        const parsed = JSON.parse(msg);
        if (parsed.error) msg = parsed.error;
      } catch (e) {}
      alert('Save Failed: ' + msg);
    } finally {
      setIsSaving(false);
      setSavingStatus('');
    }
  };

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={productToEdit ? "Edit Product" : "New Product"}
      >
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

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Product Purpose</label>
            <div className="grid grid-cols-3 gap-2">
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

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-3 gap-4">
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

          <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
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
            <div className="grid grid-cols-2 gap-4 animate-nano">
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
            <div className="grid grid-cols-2 gap-4 animate-nano">
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

          <div className="grid grid-cols-3 gap-4 border-t border-slate-50 pt-4">
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
