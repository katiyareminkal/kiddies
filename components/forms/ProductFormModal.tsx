import React, { useState, useRef, useMemo } from 'react';
import { Plus, X, Upload, ScanLine, Edit2, Image as ImageIcon, Palette, CheckCircle2, RefreshCcw } from 'lucide-react';
import { Modal } from '../Shared';
import { useApp } from '../../store/AppContext';
import { Product } from '../../types';
import BarcodeScanner from '../BarcodeScanner';
import { CATEGORIES } from '../../constants';
import { generateDynamicLabelPDF } from '../../utils/pdfLabel';
import LabelDesigner from './LabelDesigner';
interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, productToEdit }) => {
  const { products, suppliers, addProduct, updateProduct, deleteProduct } = useApp();
  
  const [productPurpose, setProductPurpose] = useState<'SALE' | 'RENTAL' | 'HYBRID'>(productToEdit ? productToEdit.purpose : 'SALE');
  const [isSaving, setIsSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState<string>('');
  const formRef = useRef<HTMLFormElement>(null);
  
  // Size Management
  const [selectedSizes, setSelectedSizes] = useState<string[]>(productToEdit?.sizes || []);
  const [sizeInput, setSizeInput] = useState('');
  const [activeSizeCategory, setActiveSizeCategory] = useState<string>('AGE');
  const [variantStocks, setVariantStocks] = useState<Record<string, { saleStock: number; rentalStock: number }>>({});

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
  const [printLabelSize, setPrintLabelSize] = useState<'50x30' | '30x50'>('50x30');
  const [printGarmentSize, setPrintGarmentSize] = useState<string>('');
  const [showLabelEditor, setShowLabelEditor] = useState(false);
  const [labelData, setLabelData] = useState<any>(null);



  const SIZE_CATEGORIES = [
    {
      id: 'AGE',
      label: 'Age / Kids',
      sizes: ['NB', '0-3M', '3-6M', '6-12M', '12-18M', '18-24M', '2-3Y', '3-4Y', '4-5Y', '5-6Y', '6-7Y', '7-8Y', '8-9Y', '9-10Y', '10-11Y', '11-12Y', '12-13Y', '13-14Y', '14-15Y']
    },
    {
      id: 'GARMENT_NUMBERS',
      label: 'Garment Sizes (16-60)',
      sizes: [
        '16', '17', '18', '19', '20', '21', '22', '23', '24', '25',
        '26', '27', '28', '29', '30', '31', '32', '33', '34', '35',
        '36', '37', '38', '39', '40', '41', '42', '43', '44', '45',
        '46', '47', '48', '49', '50', '51', '52', '53', '54', '55',
        '56', '57', '58', '59', '60'
      ]
    },
    {
      id: 'KID_NUMBERS',
      label: 'Kid Numbers (00-15)',
      sizes: ['00', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15']
    },
    {
      id: 'CM',
      label: 'CM / Length',
      sizes: ['30cm', '35cm', '40cm', '45cm', '50cm', '55cm', '60cm', '65cm', '70cm', '75cm', '80cm', '85cm', '90cm', '95cm', '100cm', '105cm', '110cm']
    },
    {
      id: 'ALPHA',
      label: 'Standard (S-XL)',
      sizes: ['FREE', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL']
    },
    {
      id: 'FOOTWEAR',
      label: 'Footwear',
      sizes: ['18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40']
    }
  ];

  // Initialize state when modal opens or productToEdit changes
  React.useEffect(() => {
    if (isOpen) {
      setProductPurpose(productToEdit ? productToEdit.purpose : 'SALE');
      setPreviewImage(productToEdit?.imageUrl || null);
      setSelectedFile(null);
      setIsSaving(false);
      setSavingStatus('');

      // Initialize variant stocks and selected sizes from all siblings
      const initialStocks: Record<string, { saleStock: number; rentalStock: number }> = {};
      if (productToEdit) {
        // Strip size suffix from SKU to get base SKU
        let baseSku = productToEdit.sku;
        const matchingSize = productToEdit.sizes[0];
        if (matchingSize && productToEdit.sku.endsWith(`-${matchingSize}`)) {
          baseSku = productToEdit.sku.substring(0, productToEdit.sku.length - matchingSize.length - 1);
        } else {
          const lastDash = productToEdit.sku.lastIndexOf('-');
          if (lastDash > 0) {
            baseSku = productToEdit.sku.substring(0, lastDash);
          }
        }
        setSkuValue(baseSku); // Display the base SKU in the SKU input field
        setBarcodeValue(productToEdit.barcode || '');

        // Find sibling variants
        const siblings = products.filter(p => {
          let pBase = p.sku;
          const pSize = p.sizes[0];
          if (pSize && p.sku.endsWith(`-${pSize}`)) {
            pBase = p.sku.substring(0, p.sku.length - pSize.length - 1);
          } else {
            const pDash = p.sku.lastIndexOf('-');
            if (pDash > 0) {
              pBase = p.sku.substring(0, pDash);
            }
          }
          return pBase.toLowerCase() === baseSku.toLowerCase() || p.name.toLowerCase() === productToEdit.name.toLowerCase();
        });

        const allSizes: string[] = [];
        siblings.forEach(sib => {
          sib.sizes.forEach(size => {
            if (!allSizes.includes(size)) {
              allSizes.push(size);
            }
            initialStocks[size] = {
              saleStock: sib.saleStock,
              rentalStock: sib.rentalStock
            };
          });
        });
        setSelectedSizes(allSizes);
      } else {
        setSelectedSizes([]);
        setSkuValue('');
        setBarcodeValue('');
      }
      setVariantStocks(initialStocks);
    }
  }, [isOpen, productToEdit, products]);

  const generateAutoSKU = () => {
    const formElement = formRef.current;
    const category = formElement ? (formElement.elements.namedItem('category') as HTMLSelectElement)?.value : '';
    
    // Explicit clean mapping for categories to standard 3-letter SKU prefixes
    const categoryPrefixes: Record<string, string> = {
      'Infants (0-2Y)': 'INF',
      'Toddlers (2-5Y)': 'TOD',
      'Kids (5-10Y)': 'KID',
      'Teens (10-15Y)': 'TEN',
      'Party Wear': 'PTY',
      'Casual Wear': 'CSL',
      'Ethnic & Traditional': 'ETH',
      'Costumes & Fancy Dress': 'COS',
      'Outerwear & Sweaters': 'OUT',
      'Sleepwear': 'SLP',
      'Innerwear': 'INR',
      'Footwear': 'FTW',
      'Accessories': 'ACC'
    };

    let prefix = 'KID';
    if (category && categoryPrefixes[category]) {
      prefix = categoryPrefixes[category];
    } else if (category) {
      // Fallback parser if category isn't in mapping
      const words = category.replace(/[^a-zA-Z ]/g, '').split(' ');
      if (words.length >= 2) {
        prefix = (words[0].substring(0, 1) + words[1].substring(0, 2)).toUpperCase();
      } else if (words[0]) {
        prefix = words[0].substring(0, 3).toUpperCase();
      }
    }

    if (prefix.length < 3) {
      prefix = (prefix + 'KID').substring(0, 3);
    }
    
    // Find next number for prefix
    const pattern = new RegExp(`^${prefix}-(\\d+)`);
    let maxNum = 1000;
    products.forEach(p => {
      const match = p.sku?.toUpperCase().match(pattern);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    
    const nextSku = `${prefix}-${maxNum + 1}`;
    setSkuValue(nextSku);
  };

  const addSizeTag = (size: string) => {
    const trimmed = size.trim().toUpperCase();
    if (trimmed && !selectedSizes.includes(trimmed)) {
      setSelectedSizes([...selectedSizes, trimmed]);
      setVariantStocks(prev => ({
        ...prev,
        [trimmed]: { saleStock: 0, rentalStock: 0 }
      }));
    }
    setSizeInput('');
  };

  const removeSizeTag = (size: string) => {
    setSelectedSizes(selectedSizes.filter(s => s !== size));
    setVariantStocks(prev => {
      const updated = { ...prev };
      delete updated[size];
      return updated;
    });
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

    if (sku.length < 3) {
      alert('SKU must be at least 3 characters long.');
      return;
    }

    // SKU Duplication check
    if (!productToEdit) {
      for (const size of selectedSizes) {
        const variantSku = `${sku}-${size}`;
        const isDuplicate = products.some(p => p.sku.toUpperCase() === variantSku.toUpperCase());
        if (isDuplicate) {
          alert(`The variant SKU "${variantSku}" is already in use by another product. SKU must be unique.`);
          return;
        }
      }
    } else {
      const isDuplicate = products.some(p => p.sku.toUpperCase() === sku.toUpperCase() && p.id !== productToEdit.id);
      if (isDuplicate) {
        alert(`The SKU "${sku}" is already in use by another product. SKU must be unique.`);
        return;
      }
    }

    // New mandatory fields validations
    if (selectedSizes.length === 0) {
      alert('Please add at least one size.');
      return;
    }

    const purchasePrice = Number(formData.get('purchasePrice'));
    if (isNaN(purchasePrice) || purchasePrice <= 0) {
      alert('Purchase Price is mandatory and must be greater than 0.');
      return;
    }

    // Validate per-size variant stocks
    for (const size of selectedSizes) {
      const stocks = variantStocks[size];
      if (productPurpose === 'SALE' || productPurpose === 'HYBRID') {
        const sellingPrice = Number(formData.get('sellingPrice'));
        if (isNaN(sellingPrice) || sellingPrice <= 0) {
          alert('Selling Price is mandatory and must be greater than 0.');
          return;
        }
        if (!stocks || stocks.saleStock === undefined || stocks.saleStock < 0) {
          alert(`Sale Stock for size ${size} is mandatory and must be 0 or more.`);
          return;
        }
      }

      if (productPurpose === 'RENTAL' || productPurpose === 'HYBRID') {
        const rentalPrice = Number(formData.get('rentalPrice'));
        if (isNaN(rentalPrice) || rentalPrice <= 0) {
          alert('Rental Price (Daily) is mandatory and must be greater than 0.');
          return;
        }
        if (!stocks || stocks.rentalStock === undefined || stocks.rentalStock < 0) {
          alert(`Rental Stock for size ${size} is mandatory and must be 0 or more.`);
          return;
        }
      }
    }

    setIsSaving(true);
    
    try {
      if (selectedFile && selectedFile.size > 5 * 1024 * 1024) {
        throw new Error('Image size exceeds 5MB. Please choose a smaller photo.');
      }

      const baseProductData = {
        name,
        barcode: formData.get('barcode') as string || '',
        category: formData.get('category') as string || '',
        brand: formData.get('brand') as string || '',
        color: formData.get('color') as string || '',
        material: formData.get('material') as string || '',
        purpose: productPurpose,
        purchasePrice: Number(formData.get('purchasePrice')) || 0,
        sellingPrice: (productPurpose === 'SALE' || productPurpose === 'HYBRID') ? Number(formData.get('sellingPrice')) : 0,
        rentalPrice: (productPurpose === 'RENTAL' || productPurpose === 'HYBRID') ? Number(formData.get('rentalPrice')) : 0,
        taxPercent: Number(formData.get('taxPercent')) || 0,
        minStockAlert: Number(formData.get('minStockAlert')) || 0,
        supplierId: formData.get('supplierId') as string || '',
        description: formData.get('description') as string || '',
        imageUrl: previewImage || '',
      };

      let siblings: Product[] = [];
      if (productToEdit) {
        let originalBaseSku = productToEdit.sku;
        const matchingSize = productToEdit.sizes[0];
        if (matchingSize && productToEdit.sku.endsWith(`-${matchingSize}`)) {
          originalBaseSku = productToEdit.sku.substring(0, productToEdit.sku.length - matchingSize.length - 1);
        } else {
          const lastDash = productToEdit.sku.lastIndexOf('-');
          if (lastDash > 0) {
            originalBaseSku = productToEdit.sku.substring(0, lastDash);
          }
        }

        siblings = products.filter(p => {
          let pBase = p.sku;
          const pSize = p.sizes[0];
          if (pSize && p.sku.endsWith(`-${pSize}`)) {
            pBase = p.sku.substring(0, p.sku.length - pSize.length - 1);
          } else {
            const pDash = p.sku.lastIndexOf('-');
            if (pDash > 0) {
              pBase = p.sku.substring(0, pDash);
            }
          }
          return pBase.toLowerCase() === originalBaseSku.toLowerCase() || p.name.toLowerCase() === productToEdit.name.toLowerCase();
        });
      }

      // 1. Save new or update existing size variants
      for (const size of selectedSizes) {
        const variantSku = `${sku}-${size}`;
        const existing = siblings.find(sib => {
          const sibSize = sib.sizes[0];
          return sibSize?.toUpperCase() === size.toUpperCase();
        });

        const variantData = {
          ...baseProductData,
          sku: variantSku,
          sizes: [size],
          saleStock: variantStocks[size]?.saleStock ?? 0,
          rentalStock: variantStocks[size]?.rentalStock ?? 0
        };

        if (existing) {
          setSavingStatus(`Updating variant for size ${size}...`);
          await updateProduct(existing.id, variantData, selectedFile || undefined, setSavingStatus);
        } else {
          setSavingStatus(`Adding variant for size ${size}...`);
          await addProduct(variantData, selectedFile || undefined, setSavingStatus);
        }
      }

      // 2. Delete variants that were removed
      const removedVariants = siblings.filter(sib => {
        const sibSize = sib.sizes[0];
        return !selectedSizes.some(s => s.toUpperCase() === sibSize?.toUpperCase());
      });

      for (const removed of removedVariants) {
        try {
          setSavingStatus(`Removing variant for size ${removed.sizes[0]}...`);
          await deleteProduct(removed.id);
        } catch (err) {
          console.warn(`Failed to hard delete variant ${removed.id}. Setting stock to 0 and hiding instead.`, err);
          const softDeleteData = {
            sku: removed.sku,
            name: removed.name,
            barcode: removed.barcode,
            category: removed.category,
            brand: removed.brand,
            color: removed.color,
            material: removed.material,
            purpose: removed.purpose,
            purchasePrice: removed.purchasePrice,
            sellingPrice: removed.sellingPrice,
            rentalPrice: removed.rentalPrice,
            taxPercent: removed.taxPercent,
            minStockAlert: removed.minStockAlert,
            supplierId: removed.supplierId,
            description: removed.description,
            imageUrl: removed.imageUrl,
            sizes: [], // Clear sizes so it disappears from grouped display
            saleStock: 0,
            rentalStock: 0
          };
          await updateProduct(removed.id, softDeleteData);
        }
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Product Name <span className="text-red-500">*</span></label>
              <input name="name" defaultValue={productToEdit?.name} required className="w-full px-4 py-3 bg-slate-50 border-slate-100 border focus:bg-white focus:border-[#8B5CF6]/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-slate-700 text-[10px]" placeholder="e.g. Designer Suit" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Category</label>
              <select name="category" defaultValue={productToEdit?.category} className="w-full px-4 py-3 bg-slate-50 border-slate-100 border focus:bg-white focus:border-[#8B5CF6]/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-slate-700 text-[10px] appearance-none">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Sizes Management */}
          <div className="space-y-3 border-t border-slate-50 pt-4">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sizes <span className="text-red-500">*</span></label>
              {selectedSizes.length > 0 && (
                <button 
                  type="button" 
                  onClick={() => { setSelectedSizes([]); setVariantStocks({}); }}
                  className="text-[8px] font-bold text-rose-500 hover:underline uppercase tracking-widest"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Active Selected Size Tags */}
            {selectedSizes.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                {selectedSizes.map(size => (
                  <span key={size} className="bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs">
                    {size}
                    <button type="button" onClick={() => removeSizeTag(size)} className="hover:text-rose-400 transition-colors">
                      <X size={10} strokeWidth={4} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Size Custom Input */}
            <div className="flex gap-2">
              <input 
                type="text" 
                value={sizeInput}
                onChange={(e) => setSizeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSizeTag(sizeInput); } }}
                className="flex-1 px-4 py-3 bg-slate-50 border-slate-100 border focus:bg-white focus:border-[#8B5CF6]/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-slate-700 text-[10px]" 
                placeholder="Custom size (e.g. 28, 45cm, 2-3Y) & press Enter" 
              />
              <button 
                type="button" 
                onClick={() => addSizeTag(sizeInput)}
                className="bg-slate-100 text-slate-700 px-4 py-2 rounded-2xl hover:bg-slate-200 transition-all font-black uppercase tracking-widest text-[8px]"
              >
                Add
              </button>
            </div>

            {/* Size Category Tabs & Organized Quick Picks */}
            <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100 space-y-2.5">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mr-1 shrink-0">Articles:</span>
                {SIZE_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveSizeCategory(cat.id)}
                    className={`text-[8.5px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                      activeSizeCategory === cat.id
                        ? 'bg-[#8B5CF6] text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/60'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Categorized Size Chips (Toggleable) */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SIZE_CATEGORIES.find(c => c.id === activeSizeCategory)?.sizes.map(size => {
                  const isSelected = selectedSizes.includes(size);
                  return (
                    <button 
                      key={size} 
                      type="button"
                      onClick={() => isSelected ? removeSizeTag(size) : addSizeTag(size)}
                      className={`text-[8px] font-black px-2.5 py-1.5 rounded-xl transition-all ${
                        isSelected
                          ? 'bg-[#8B5CF6] text-white shadow-xs scale-105'
                          : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      {isSelected ? `✓ ${size}` : size}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-50 pt-4">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">SKU <span className="text-red-500">*</span></label>
                <button 
                  type="button" 
                  onClick={generateAutoSKU}
                  className="text-[8px] font-black uppercase tracking-widest text-[#8B5CF6] hover:underline transition-all"
                >
                  Auto-Generate
                </button>
              </div>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-50 pt-4">
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

          <div className="space-y-1.5 border-t border-slate-50 pt-4">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Supplier</label>
            <select name="supplierId" defaultValue={productToEdit?.supplierId} className="w-full px-4 py-3 bg-slate-50 border-slate-100 border focus:bg-white focus:border-[#8B5CF6]/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-slate-700 text-[10px] appearance-none">
              <option value="">Select Supplier (Optional)</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Prices Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(productPurpose === 'SALE' || productPurpose === 'HYBRID') && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Selling Price <span className="text-red-500">*</span></label>
                <input name="sellingPrice" type="number" step="0.01" defaultValue={productToEdit?.sellingPrice} required className="w-full px-4 py-3 bg-slate-50 border-slate-100 border focus:bg-white focus:border-[#8B5CF6]/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-slate-700 text-[10px]" placeholder="0.00" />
              </div>
            )}
            {(productPurpose === 'RENTAL' || productPurpose === 'HYBRID') && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Rental Price (Daily) <span className="text-red-500">*</span></label>
                <input name="rentalPrice" type="number" step="0.01" defaultValue={productToEdit?.rentalPrice} required className="w-full px-4 py-3 bg-slate-50 border-slate-100 border focus:bg-white focus:border-[#8B5CF6]/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-slate-700 text-[10px]" placeholder="0.00" />
              </div>
            )}
          </div>

          {/* Stock per Size Variant Section */}
          <div className="space-y-2 border-t border-slate-50 pt-4">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Stock per Size <span className="text-red-500">*</span></label>
            {selectedSizes.length > 0 ? (
              <div className="space-y-3">
                {selectedSizes.map(size => (
                  <div key={size} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-700 min-w-[60px]">{size}</span>
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      {(productPurpose === 'SALE' || productPurpose === 'HYBRID') && (
                        <div className="space-y-1">
                          <label className="text-[7px] font-black uppercase tracking-widest text-slate-400 ml-1">Sale Stock</label>
                          <input 
                            type="number" 
                            value={variantStocks[size]?.saleStock ?? 0}
                            onChange={(e) => setVariantStocks(prev => ({
                              ...prev,
                              [size]: { ...prev[size], saleStock: Math.max(0, Number(e.target.value) || 0) }
                            }))}
                            className="w-full px-3 py-2 bg-white border border-slate-150 focus:border-[#8B5CF6]/30 rounded-xl outline-none transition-all font-black text-slate-700 text-[10px]" 
                            placeholder="0" 
                            min="0"
                          />
                        </div>
                      )}
                      {(productPurpose === 'RENTAL' || productPurpose === 'HYBRID') && (
                        <div className="space-y-1">
                          <label className="text-[7px] font-black uppercase tracking-widest text-slate-400 ml-1">Rental Stock</label>
                          <input 
                            type="number" 
                            value={variantStocks[size]?.rentalStock ?? 0}
                            onChange={(e) => setVariantStocks(prev => ({
                              ...prev,
                              [size]: { ...prev[size], rentalStock: Math.max(0, Number(e.target.value) || 0) }
                            }))}
                            className="w-full px-3 py-2 bg-white border border-slate-150 focus:border-[#8B5CF6]/30 rounded-xl outline-none transition-all font-black text-slate-700 text-[10px]" 
                            placeholder="0" 
                            min="0"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center py-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                Please add at least one size above to set stock.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-50 pt-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Purchase Price <span className="text-red-500">*</span></label>
              <input name="purchasePrice" type="number" step="0.01" defaultValue={productToEdit?.purchasePrice || 0} required className="w-full px-4 py-3 bg-slate-50 border-slate-100 border focus:bg-white focus:border-[#8B5CF6]/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-slate-700 text-[10px]" placeholder="0.00" />
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
