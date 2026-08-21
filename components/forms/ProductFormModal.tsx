import React, { useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Upload, ScanLine, Edit2, Image as ImageIcon, Palette, CheckCircle2, Check, RefreshCcw, Trash2 } from 'lucide-react';
import { Modal } from '../Shared';
import { useApp } from '../../store/AppContext';
import { Product } from '../../types';
import BarcodeScanner from '../BarcodeScanner';
import { CATEGORIES, SUB_CATEGORIES_BY_GENDER_AND_CATEGORY, GENDERS, CLOTHING_TYPES, CATEGORIES_BY_GENDER } from '../../constants';
import { generateDynamicLabelPDF } from '../../utils/pdfLabel';
import { extractBaseSku } from '../../utils/helpers';
import LabelDesigner from './LabelDesigner';
interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
  onSaveSuccess?: (title: string, message: string) => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, productToEdit, onSaveSuccess }) => {
  const { products, suppliers, addProduct, updateProduct, deleteProduct } = useApp();
  
  const [productPurpose, setProductPurpose] = useState<'SALE' | 'RENTAL' | 'HYBRID'>(productToEdit ? productToEdit.purpose : 'SALE');
  const [isSaving, setIsSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState<string>('');
  const formRef = useRef<HTMLFormElement>(null);
  
  // Size Management
  const [selectedSizes, setSelectedSizes] = useState<string[]>(productToEdit?.sizes || []);
  const [sizeInput, setSizeInput] = useState('');
  const [activeSizeCategory, setActiveSizeCategory] = useState<string>('AGE');
  const [variantStocks, setVariantStocks] = useState<Record<string, { saleStock: number; rentalStock: number; color?: string }>>({});

  // Barcode Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'SKU' | 'BARCODE'>('SKU');
  const [skuValue, setSkuValue] = useState(productToEdit?.sku || '');
  const [barcodeValue, setBarcodeValue] = useState(productToEdit?.barcode || '');
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Image Upload State (Multi-Image Support)
  const [previewImages, setPreviewImages] = useState<string[]>(
    productToEdit?.images && productToEdit.images.length > 0 
      ? productToEdit.images 
      : productToEdit?.imageUrl 
        ? [productToEdit.imageUrl] 
        : []
  );
  const [selectedImagesIndex, setSelectedImagesIndex] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Category, Gender, SubCategory, ClothingType, and Supplier State
  const initialGender = productToEdit?.gender || GENDERS[0] || '';
  const [selectedGender, setSelectedGender] = useState<string>(initialGender);
  const [selectedCategory, setSelectedCategory] = useState<string>(productToEdit?.category || (CATEGORIES_BY_GENDER[initialGender] || [])[0] || '');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(productToEdit?.subCategory || '');
  const [selectedClothingType, setSelectedClothingType] = useState<string>(productToEdit?.clothingType || '');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(productToEdit?.supplierId || '');

  // Label Printing State
  const [printLabelSize, setPrintLabelSize] = useState<'50x30' | '30x50'>('50x30');
  const [printGarmentSize, setPrintGarmentSize] = useState<string>('');
  const [showLabelEditor, setShowLabelEditor] = useState(false);
  const [labelData, setLabelData] = useState<any>(null);



  const SIZE_CATEGORIES = [
    {
      id: 'INFANTS',
      label: 'Infants (0-1Y)',
      sizes: [
        'XS (Newborn)',
        'S (0-3 Months)',
        'M (3-6 Months)',
        'L (6-9 Months)',
        'XL (9-12 Months)',
        'XXL (12-18 Months)',
        '00 (Newborn)',
        '0 (0-3M)',
        '1 (3-6M)',
        '2 (6-12M)',
        '16 (6-12 Months)'
      ]
    },
    {
      id: 'TODDLERS',
      label: 'Toddlers (1-5Y)',
      sizes: [
        'XS (1-2 Years)',
        'S (2-3 Years)',
        'M (3-4 Years)',
        'L (4-5 Years)',
        'XL (5-6 Years)',
        'XXL (6-7 Years)',
        '3 (12-18M)',
        '18 (1-2 Years)',
        '20 (2-3 Years)',
        '22 (3-4 Years)'
      ]
    },
    {
      id: 'KIDS',
      label: 'Kids (5-10Y)',
      sizes: [
        'XS (4-5 Years)',
        'S (6-7 Years)',
        'M (8-9 Years)',
        'L (10-12 Years)',
        'XL (12-14 Years)',
        'XXL (14-16 Years)',
        '24 (4-5 Years)',
        '26 (5-6 Years)',
        '28 (6-7 Years)',
        '30 (7 Years)',
        '32 (7-8 Years)',
        '34 (7-8 Years)'
      ]
    },
    {
      id: 'TEENS',
      label: 'Teens (10-16Y)',
      sizes: [
        'XS (11-12 Years)',
        'S (13-14 Years)',
        'M (14-15 Years)',
        'L (15-16 Years)',
        'XL (16+ Years)',
        'XXL (18+ Years)',
        '36 (9-10 Years)',
        '38 (11-12 Years)',
        '40 (12-13 Years)',
        '42 (14-15 Years)'
      ]
    },
    {
      id: 'ADULT_ALPHA',
      label: 'Adults / Big',
      sizes: ['FREE (Free Size)', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL']
    },
    {
      id: 'CM',
      label: 'CM / Length',
      sizes: ['30cm', '35cm', '40cm', '45cm', '50cm', '55cm', '60cm', '65cm', '70cm', '75cm', '80cm', '85cm', '90cm', '95cm', '100cm', '105cm', '110cm']
    },
    {
      id: 'FOOTWEAR',
      label: 'Footwear',
      sizes: ['16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40']
    }
  ];

  // Initialize state when modal opens or productToEdit changes
  React.useEffect(() => {
    if (isOpen && !isSaving) {
      setProductPurpose(productToEdit ? productToEdit.purpose : 'SALE');
      const initialImgs = productToEdit?.images && productToEdit.images.length > 0 
        ? productToEdit.images 
        : productToEdit?.imageUrl 
          ? [productToEdit.imageUrl] 
          : [];
      setPreviewImages(initialImgs);
      setSelectedImagesIndex(0);
      setSavingStatus('');
      const resetGender = productToEdit?.gender || GENDERS[0] || '';
      setSelectedGender(resetGender);
      setSelectedCategory(productToEdit?.category || (CATEGORIES_BY_GENDER[resetGender] || [])[0] || '');
      setSelectedSubCategory(productToEdit?.subCategory || '');
      setSelectedClothingType(productToEdit?.clothingType || '');
      setSelectedSupplierId(productToEdit?.supplierId || '');

      // Initialize variant stocks and selected sizes from all siblings
      const initialStocks: Record<string, { saleStock: number; rentalStock: number; color?: string }> = {};
      if (productToEdit) {
        const baseSku = extractBaseSku(productToEdit.sku, productToEdit.sizes);
        setSkuValue(baseSku);
        setBarcodeValue(productToEdit.barcode || '');

        // Find sibling variants
        const siblings = products.filter(p => {
          if (p.id === productToEdit.id) return true;
          const pBase = extractBaseSku(p.sku, p.sizes);
          return (pBase && pBase.toLowerCase() === baseSku.toLowerCase()) || 
                 (p.name && p.name.toLowerCase() === productToEdit.name.toLowerCase());
        });

        const allSizes: string[] = [];
        siblings.forEach(sib => {
          (sib.sizes || []).forEach(size => {
            if (!allSizes.includes(size)) {
              allSizes.push(size);
            }
            initialStocks[size] = {
              saleStock: sib.saleStock || 0,
              rentalStock: sib.rentalStock || 0,
              color: sib.color || ''
            };
          });
        });

        // Ensure productToEdit sizes are included
        (productToEdit.sizes || []).forEach(size => {
          if (!allSizes.includes(size)) {
            allSizes.push(size);
          }
          if (!initialStocks[size]) {
            initialStocks[size] = {
              saleStock: productToEdit.saleStock || 0,
              rentalStock: productToEdit.rentalStock || 0,
              color: productToEdit.color || ''
            };
          }
        });

        setSelectedSizes(allSizes.length > 0 ? allSizes : (productToEdit.sizes || []));
      } else {
        setSelectedSizes([]);
        setSkuValue('');
        setBarcodeValue('');
      }
      setVariantStocks(initialStocks);
    }
  }, [isOpen, productToEdit]);

  const generateAutoSKU = () => {
    const formElement = formRef.current;
    const category = formElement ? (formElement.elements.namedItem('category') as HTMLSelectElement)?.value : '';
    
    // Explicit clean mapping for categories to standard 3-letter SKU prefixes
    const categoryPrefixes: Record<string, string> = {
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
        [trimmed]: { saleStock: 0, rentalStock: 0, color: '' }
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

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 800;

          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files: File[] = Array.from(e.target.files);
      const validFiles = files.filter(f => f.size <= 10 * 1024 * 1024);

      for (const file of validFiles) {
        try {
          const compressed = await compressImage(file);
          setPreviewImages(prev => [...prev, compressed]);
        } catch (err) {
          console.error("Image processing error:", err);
        }
      }

      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setPreviewImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
    if (selectedImagesIndex >= indexToRemove && selectedImagesIndex > 0) {
      setSelectedImagesIndex(prev => prev - 1);
    }
  };

  const handleSaveProduct = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (isSaving) return;
    if (!formRef.current) return;

    const formData = new FormData(formRef.current);
    const name = (formData.get('name') as string || '').trim();
    const sku = (skuValue || (formData.get('sku') as string) || '').trim();

    if (!name || !sku) {
      alert('Please fill in both Product Name and SKU.');
      return;
    }

    if (sku.length < 2) {
      alert('SKU must be at least 2 characters long.');
      return;
    }

    const effectiveSizes = selectedSizes.length > 0 ? selectedSizes : ['Standard'];
    const currentBaseSku = productToEdit ? extractBaseSku(productToEdit.sku, productToEdit.sizes) : '';

    // SKU Duplication check
    if (!productToEdit) {
      for (const size of effectiveSizes) {
        const variantSku = effectiveSizes.length > 1 || size !== 'Standard' ? `${sku}-${size}` : sku;
        const isDuplicate = products.some(p => p.sku.toUpperCase() === variantSku.toUpperCase() || p.sku.toUpperCase() === sku.toUpperCase());
        if (isDuplicate) {
          alert(`The variant SKU "${variantSku}" is already in use by another product. SKU must be unique.`);
          return;
        }
      }
    } else {
      for (const size of effectiveSizes) {
        const variantSku = effectiveSizes.length > 1 || size !== 'Standard' ? `${sku}-${size}` : sku;
        const isDuplicate = products.some(p => {
          if (p.sku.toUpperCase() !== variantSku.toUpperCase() && p.sku.toUpperCase() !== sku.toUpperCase()) return false;
          if (p.id === productToEdit.id) return false;
          const pBase = extractBaseSku(p.sku, p.sizes);
          const isSameSibling = (pBase && pBase.toLowerCase() === currentBaseSku.toLowerCase()) || 
                                (p.name && p.name.toLowerCase() === productToEdit.name.toLowerCase());
          return !isSameSibling;
        });

        if (isDuplicate) {
          alert(`The SKU "${variantSku}" is already in use by another product. SKU must be unique.`);
          return;
        }
      }
    }

    const purchasePrice = Number(formData.get('purchasePrice')) || 0;

    // Validate prices
    if (productPurpose === 'SALE' || productPurpose === 'HYBRID') {
      const sellingPrice = Number(formData.get('sellingPrice')) || 0;
      if (isNaN(sellingPrice) || sellingPrice <= 0) {
        alert('Tag Price / MRP is mandatory and must be greater than 0.');
        return;
      }
    }

    if (productPurpose === 'RENTAL' || productPurpose === 'HYBRID') {
      const rentalPrice = Number(formData.get('rentalPrice')) || 0;
      if (isNaN(rentalPrice) || rentalPrice <= 0) {
        alert('Rental Price (Daily) is mandatory and must be greater than 0.');
        return;
      }
    }

    setIsSaving(true);
    
    try {
      const baseProductData = {
        name,
        barcode: barcodeValue || (formData.get('barcode') as string) || '',
        gender: selectedGender || (formData.get('gender') as string) || '',
        category: selectedCategory || (formData.get('category') as string) || '',
        subCategory: selectedSubCategory || (formData.get('subCategory') as string) || '',
        clothingType: selectedClothingType || (formData.get('clothingType') as string) || '',
        brand: (formData.get('brand') as string) || '',
        color: (formData.get('color') as string) || '',
        material: (formData.get('material') as string) || '',
        purpose: productPurpose,
        purchasePrice: purchasePrice,
        sellingPrice: (productPurpose === 'SALE' || productPurpose === 'HYBRID') ? Number(formData.get('sellingPrice')) || 0 : 0,
        rentalPrice: (productPurpose === 'RENTAL' || productPurpose === 'HYBRID') ? Number(formData.get('rentalPrice')) || 0 : 0,
        taxPercent: Number(formData.get('taxPercent')) || 0,
        minStockAlert: Number(formData.get('minStockAlert')) || 0,
        supplierId: selectedSupplierId || (formData.get('supplierId') as string) || '',
        description: (formData.get('description') as string) || '',
        imageUrl: previewImages[0] || '',
        images: previewImages,
      };

      let siblings: Product[] = [];
      if (productToEdit) {
        const originalBaseSku = extractBaseSku(productToEdit.sku, productToEdit.sizes);
        siblings = products.filter(p => {
          if (p.id === productToEdit.id) return true;
          const pBase = extractBaseSku(p.sku, p.sizes);
          return (pBase && pBase.toLowerCase() === originalBaseSku.toLowerCase()) || 
                 (p.name && p.name.toLowerCase() === productToEdit.name.toLowerCase());
        });
      }

      // 1. Save new or update existing size variants
      for (const size of effectiveSizes) {
        const variantSku = effectiveSizes.length > 1 || size !== 'Standard' ? `${sku}-${size}` : sku;
        const existing = siblings.find(sib => {
          if (sib.id === productToEdit?.id && (effectiveSizes.length === 1 || sib.sizes?.[0] === size)) return true;
          const sibSize = sib.sizes?.[0];
          return sibSize?.toUpperCase() === size.toUpperCase();
        });

        const formColor = (formData.get('color') as string || '').trim();
        let variantColor = formColor;
        if (variantStocks[size]?.color && variantStocks[size].color.trim() !== '') {
          variantColor = variantStocks[size].color.trim();
        }

        const variantData = {
          ...baseProductData,
          color: variantColor,
          sku: variantSku,
          sizes: [size],
          saleStock: variantStocks[size]?.saleStock ?? (productToEdit?.saleStock ?? 0),
          rentalStock: variantStocks[size]?.rentalStock ?? (productToEdit?.rentalStock ?? 0)
        };

        if (existing) {
          await updateProduct(existing.id, variantData, undefined);
        } else {
          await addProduct(variantData, undefined);
        }
      }

      // 2. Delete variants that were removed
      const removedVariants = siblings.filter(sib => {
        const sibSize = sib.sizes?.[0];
        return sibSize && !effectiveSizes.some(s => s.toUpperCase() === sibSize.toUpperCase());
      });

      for (const removed of removedVariants) {
        try {
          await deleteProduct(removed.id);
        } catch (err) {
          console.warn(`Failed to delete variant ${removed.id}`, err);
        }
      }

      // Small brief delay to ensure the user clearly sees 'Saving...' state before auto-closing
      await new Promise(r => setTimeout(r, 400));

      const successTitle = productToEdit ? 'Product Updated' : 'Product Added';
      const successMsg = productToEdit ? `${name} updated successfully!` : `${name} added to inventory!`;

      if (onSaveSuccess) {
        onSaveSuccess(successTitle, successMsg);
      } else {
        setSuccessMessage(successMsg);
        setTimeout(() => {
          setSuccessMessage(null);
        }, 1000);
      }
      
      onClose();
      setPreviewImages([]);
      setSelectedImagesIndex(0);
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
    const material = formData.get('material') as string || '';
    const gender = selectedGender || (formData.get('gender') as string) || '';
    const subCategory = formData.get('subCategory') as string || '';
    const size = printGarmentSize || (selectedSizes.length > 0 ? selectedSizes[0] : '');

    setLabelData({
      name,
      sku,
      barcode,
      sellingPrice,
      purchasePrice,
      color,
      material,
      gender,
      subCategory,
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
          className="text-[9px] font-bold uppercase tracking-wider border border-slate-200 rounded-md px-2 py-1.5 outline-none bg-slate-50 text-slate-700 max-w-[80px]"
        >
          <option value="">Size...</option>
          {selectedSizes.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      )}
      <select 
        value={printLabelSize} 
        onChange={e => setPrintLabelSize(e.target.value as '50x30' | '30x50')}
        className="text-[9px] font-bold uppercase tracking-wider border border-slate-200 rounded-md px-2 py-1.5 outline-none bg-slate-50 text-slate-700"
      >
        <option value="30x50">30x50mm</option>
        <option value="50x30">50x30mm</option>
      </select>
      <button 
        type="button" 
        onClick={handleOpenLabelEditor}
        className="px-3 py-1.5 bg-[#fe569f] text-white rounded-md font-extrabold uppercase tracking-wider text-[9px] flex items-center gap-1.5 shadow-xs hover:bg-[#eb4890] transition-colors"
        title="Create Thermal Label"
      >
        <Palette size={12} strokeWidth={2.5} />
        <span className="hidden sm:inline">Create Label</span>
      </button>
    </div>
  );

  return (
    <>
      {successMessage && createPortal(
        <div className="fixed inset-0 z-[99999] pointer-events-none flex items-center justify-center p-4">
          <div className="bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-full p-5 shadow-2xl shadow-black/80 flex items-center justify-center animate-in zoom-in-90 fade-in duration-200">
            <div className="w-20 h-20 rounded-full border-2 border-emerald-400 bg-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/30">
              <Check size={44} strokeWidth={4} className="text-emerald-400" />
            </div>
          </div>
        </div>,
        document.body
      )}

      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={productToEdit ? "Edit Product" : "New Product"}
        headerActions={headerActions}
      >
        <form ref={formRef} onSubmit={handleSaveProduct} className="space-y-3.5 max-h-[70vh] overflow-y-auto px-1 scrollbar-hide">
          {/* Product Images Upload Section (Matching Reference Design) */}
          <div className="space-y-3">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 ml-0.5">
              Product Images
            </label>

            {/* Main Dropzone / Preview Display */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-44 sm:h-48 bg-[#f8fbff] hover:bg-[#f0f7ff] border-2 border-dashed border-[#bfdbfe] hover:border-[#01a9fb] rounded-2xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all duration-200 relative group overflow-hidden"
            >
              {previewImages.length > 0 ? (
                <>
                  <img 
                    src={previewImages[selectedImagesIndex] || previewImages[0]} 
                    alt="Active Product Preview" 
                    className="w-full h-full object-contain"
                  />

                  {/* Main Delete / Remove active image button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(selectedImagesIndex);
                    }}
                    className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white p-1.5 rounded-full shadow-lg z-30 transition-all hover:scale-110"
                    title="Remove this photo"
                  >
                    <Trash2 size={13} strokeWidth={2.5} />
                  </button>

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white backdrop-blur-xs">
                    <Upload size={22} className="mb-1" strokeWidth={2.5} />
                    <span className="text-xs font-black uppercase tracking-wider">Click to Add More Photos</span>
                    <span className="text-[9px] font-medium text-slate-200 mt-0.5">JPG, PNG up to 5MB</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-[#01a9fb] flex items-center justify-center mb-2">
                    <Upload size={24} strokeWidth={2.2} className="text-[#01a9fb]" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-black text-[#01a9fb] tracking-tight">Upload Image</h4>
                  <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 mt-0.5">JPG, PNG up to 5MB</p>
                </div>
              )}
            </div>

            {/* Thumbnails Strip & Add Button Row */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 px-0.5 scrollbar-none">
              {previewImages.map((img, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setSelectedImagesIndex(idx)}
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white border-2 overflow-hidden relative group shrink-0 cursor-pointer transition-all p-1 flex items-center justify-center ${
                    selectedImagesIndex === idx 
                      ? 'border-[#01a9fb] ring-2 ring-[#01a9fb]/30 shadow-xs' 
                      : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-contain" />
                  
                  {/* Remove Button on thumbnail */}
                  <button 
                    type="button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(idx);
                    }}
                    className="absolute top-0.5 right-0.5 bg-rose-600 hover:bg-rose-700 text-white w-4 h-4 rounded-full shadow flex items-center justify-center opacity-80 group-hover:opacity-100 transition-all hover:scale-110 z-10"
                    title="Remove Photo"
                  >
                    <X size={10} strokeWidth={3} />
                  </button>
                </div>
              ))}

              {/* Plus Add Button */}
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl border border-slate-200 hover:border-[#01a9fb] bg-white hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-[#01a9fb] transition-all shrink-0 cursor-pointer shadow-xs"
                title="Add More Photos"
              >
                <Plus size={20} strokeWidth={2.2} />
              </button>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                accept="image/*" 
                multiple
                className="hidden" 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 ml-1">Product Purpose</label>
            <div className="grid grid-cols-3 gap-2">
              {(['SALE', 'RENTAL', 'HYBRID'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProductPurpose(p)}
                  className={`py-2 rounded-md text-[9px] font-extrabold uppercase tracking-wider transition-all border ${
                    productPurpose === p 
                      ? p === 'RENTAL' ? 'bg-[#fe569f] border-[#fe569f] text-white shadow-xs' : 'bg-[#01a9fb] border-[#01a9fb] text-white shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {p === 'SALE' ? 'Sale Only' : p === 'RENTAL' ? 'Rental Only' : 'Hybrid'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 ml-1">Product Name <span className="text-red-500">*</span></label>
              <input name="name" defaultValue={productToEdit?.name} required className="w-full px-4 py-3 bg-gray-50 border-gray-200/60 border focus:bg-white focus:border-[#8B5CF6]/30 rounded-xl outline-none transition-all font-bold uppercase tracking-widest text-gray-700 text-[10px]" placeholder="e.g. Designer Suit" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 ml-1">Gender</label>
              <select 
                name="gender" 
                value={selectedGender} 
                onChange={(e) => {
                  const newGender = e.target.value;
                  setSelectedGender(newGender);
                  const firstCat = (CATEGORIES_BY_GENDER[newGender] || [])[0] || '';
                  setSelectedCategory(firstCat);
                  setSelectedSubCategory('');
                }}
                className="w-full px-4 py-3 bg-gray-50 border-gray-200/60 border focus:bg-white focus:border-[#8B5CF6]/30 rounded-xl outline-none transition-all font-bold uppercase tracking-widest text-gray-700 text-[10px] appearance-none"
              >
                <option value="">-- Select Gender --</option>
                {Array.from(new Set([...GENDERS, ...(selectedGender ? [selectedGender] : [])])).map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 ml-1">Category</label>
              <select 
                name="category" 
                id="category-select" 
                value={selectedCategory} 
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedSubCategory('');
                }} 
                className="w-full px-4 py-3 bg-gray-50 border-gray-200/60 border focus:bg-white focus:border-[#8B5CF6]/30 rounded-xl outline-none transition-all font-bold uppercase tracking-widest text-gray-700 text-[10px] appearance-none"
              >
                <option value="">-- Select Category --</option>
                {Array.from(new Set([
                  ...(CATEGORIES_BY_GENDER[selectedGender] || CATEGORIES || []),
                  ...(selectedCategory ? [selectedCategory] : [])
                ])).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 ml-1">Sub Category</label>
              <select 
                name="subCategory" 
                id="subcategory-select" 
                value={selectedSubCategory} 
                onChange={(e) => setSelectedSubCategory(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-gray-200/60 border focus:bg-white focus:border-[#8B5CF6]/30 rounded-xl outline-none transition-all font-bold uppercase tracking-widest text-gray-700 text-[10px] appearance-none"
              >
                <option value="">-- Select Sub Category --</option>
                {Array.from(new Set([
                  ...(((SUB_CATEGORIES_BY_GENDER_AND_CATEGORY[selectedGender] || {})[selectedCategory]) || []),
                  ...(selectedSubCategory ? [selectedSubCategory] : [])
                ])).map(sc => (
                  <option key={sc} value={sc}>{sc}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 ml-1">Type (Half/Full/Set)</label>
              <select 
                name="clothingType" 
                value={selectedClothingType} 
                onChange={(e) => setSelectedClothingType(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-gray-200/60 border focus:bg-white focus:border-[#8B5CF6]/30 rounded-xl outline-none transition-all font-bold uppercase tracking-widest text-gray-700 text-[10px] appearance-none"
              >
                <option value="">-- Select Clothing Type --</option>
                {Array.from(new Set([
                  ...CLOTHING_TYPES,
                  ...(selectedClothingType ? [selectedClothingType] : [])
                ])).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sizes Management */}
          <div className="space-y-3 border-t border-gray-100 pt-4">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Sizes <span className="text-red-500">*</span></label>
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
              <div className="flex flex-wrap gap-2 mb-2 bg-gray-50 p-3 rounded-xl border border-gray-200/60">
                {selectedSizes.map(size => (
                  <span key={size} className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-xs">
                    {size}
                    <button type="button" onClick={() => removeSizeTag(size)} className="hover:text-rose-400 transition-colors">
                      <X size={12} strokeWidth={4} />
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
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-md outline-none transition-all font-bold uppercase tracking-wider text-slate-800 text-xs" 
                placeholder="Custom size (e.g. 28, 45cm, 2-3Y) & press Enter" 
              />
              <button 
                type="button" 
                onClick={() => addSizeTag(sizeInput)}
                className="bg-slate-100 text-slate-800 px-4 py-2 rounded-md hover:bg-slate-200 transition-all font-bold uppercase tracking-wider text-xs"
              >
                Add
              </button>
            </div>

            {/* Size Category Tabs & Organized Quick Picks */}
            <div className="bg-slate-50/80 p-3 rounded-md border border-slate-200 space-y-2.5">
              <div className="flex flex-wrap items-center gap-1.5 pb-1">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mr-1 shrink-0">Articles:</span>
                {SIZE_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveSizeCategory(cat.id)}
                    className={`text-[9.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md transition-all shrink-0 ${
                      activeSizeCategory === cat.id
                        ? 'bg-[#01a9fb] text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Categorized Size Chips */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {SIZE_CATEGORIES.find(c => c.id === activeSizeCategory)?.sizes.map(size => {
                  const isSelected = selectedSizes.includes(size);
                  return (
                    <button 
                      key={size} 
                      type="button"
                      onClick={() => isSelected ? removeSizeTag(size) : addSizeTag(size)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all ${
                        isSelected
                          ? 'bg-[#01a9fb] text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected ? `✓ ${size}` : size}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 border-t border-slate-100 pt-3.5">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">SKU <span className="text-red-500">*</span></label>
                <button 
                  type="button" 
                  onClick={generateAutoSKU}
                  className="text-[8px] font-bold uppercase tracking-wider text-[#01a9fb] hover:underline transition-all"
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
                  className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-md outline-none transition-all font-bold uppercase tracking-wider text-slate-800 text-xs" 
                  placeholder="DSG-001" 
                />
                <button 
                  type="button"
                  onClick={() => { setScannerTarget('SKU'); setIsScannerOpen(true); }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-slate-100 text-slate-500 hover:bg-[#01a9fb] hover:text-white rounded-md transition-all shadow-xs group"
                  title="Scan Barcode"
                >
                  <ScanLine size={13} strokeWidth={2.2} className="group-active:scale-95 transition-transform" />
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 ml-1">Brand</label>
              <input name="brand" defaultValue={productToEdit?.brand} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-md outline-none transition-all font-bold uppercase tracking-wider text-slate-800 text-xs" placeholder="Brand Name" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 border-t border-slate-100 pt-3.5">
            <div className="space-y-1.5">
              <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 ml-1">Color</label>
              <input name="color" defaultValue={productToEdit?.color} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-md outline-none transition-all font-bold uppercase tracking-wider text-slate-800 text-xs" placeholder="Blue" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 ml-1">Material</label>
              <input name="material" defaultValue={productToEdit?.material} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-md outline-none transition-all font-bold uppercase tracking-wider text-slate-800 text-xs" placeholder="Cotton" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 ml-1">Barcode</label>
              <div className="relative">
                <input 
                  name="barcode" 
                  value={barcodeValue}
                  onChange={(e) => setBarcodeValue(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-md outline-none transition-all font-bold uppercase tracking-wider text-slate-800 text-xs" 
                  placeholder="Optional" 
                />
                <button 
                  type="button"
                  onClick={() => { setScannerTarget('BARCODE'); setIsScannerOpen(true); }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-slate-100 text-slate-500 hover:bg-[#01a9fb] hover:text-white rounded-md transition-all shadow-xs group"
                  title="Scan Barcode"
                >
                  <ScanLine size={13} strokeWidth={2.2} className="group-active:scale-95 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 border-t border-slate-100 pt-3.5">
            <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 ml-1">Supplier</label>
            <select 
              name="supplierId" 
              value={selectedSupplierId} 
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-md outline-none transition-all font-bold uppercase tracking-wider text-slate-800 text-xs appearance-none"
            >
              <option value="">Select Supplier (Optional)</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Prices Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {(productPurpose === 'SALE' || productPurpose === 'HYBRID') && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 ml-1">Tag Price / MRP <span className="text-red-500">*</span></label>
                <input name="sellingPrice" type="number" step="0.01" defaultValue={productToEdit?.sellingPrice} required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-md outline-none transition-all font-bold uppercase tracking-wider text-slate-800 text-xs" placeholder="0.00" />
              </div>
            )}
            {(productPurpose === 'RENTAL' || productPurpose === 'HYBRID') && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 ml-1">Rental Price (Daily) <span className="text-red-500">*</span></label>
                <input name="rentalPrice" type="number" step="0.01" defaultValue={productToEdit?.rentalPrice} required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#fe569f] rounded-md outline-none transition-all font-bold uppercase tracking-wider text-slate-800 text-xs" placeholder="0.00" />
              </div>
            )}
          </div>

          {/* Stock per Size Variant Section */}
          <div className="space-y-2 border-t border-slate-100 pt-3.5">
            <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 ml-1">Stock per Size <span className="text-red-500">*</span></label>
            {selectedSizes.length > 0 ? (
              <div className="space-y-2.5">
                {selectedSizes.map(size => (
                  <div key={size} className="flex flex-col sm:flex-row sm:items-center gap-2.5 bg-slate-50 p-2.5 rounded-md border border-slate-200">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 min-w-[60px]">{size}</span>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 ml-0.5">Color (Opt)</label>
                        <input 
                          type="text" 
                          value={variantStocks[size]?.color ?? ''}
                          onChange={(e) => setVariantStocks(prev => ({
                            ...prev,
                            [size]: { ...prev[size], color: e.target.value }
                          }))}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-[#01a9fb] rounded-md outline-none transition-all font-bold text-slate-800 text-xs" 
                          placeholder="Main Color" 
                        />
                      </div>
                      {(productPurpose === 'SALE' || productPurpose === 'HYBRID') && (
                        <div className="space-y-1">
                          <label className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 ml-0.5">Sale Stock</label>
                          <input 
                            type="number" 
                            value={variantStocks[size]?.saleStock ?? 0}
                            onChange={(e) => setVariantStocks(prev => ({
                              ...prev,
                              [size]: { ...prev[size], saleStock: Math.max(0, Number(e.target.value) || 0) }
                            }))}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-[#01a9fb] rounded-md outline-none transition-all font-bold text-slate-800 text-xs" 
                            placeholder="0" 
                            min="0"
                          />
                        </div>
                      )}
                      {(productPurpose === 'RENTAL' || productPurpose === 'HYBRID') && (
                        <div className="space-y-1">
                          <label className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 ml-0.5">Rental Stock</label>
                          <input 
                            type="number" 
                            value={variantStocks[size]?.rentalStock ?? 0}
                            onChange={(e) => setVariantStocks(prev => ({
                              ...prev,
                              [size]: { ...prev[size], rentalStock: Math.max(0, Number(e.target.value) || 0) }
                            }))}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-[#fe569f] rounded-md outline-none transition-all font-bold text-slate-800 text-xs" 
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
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center py-3 bg-slate-50 border border-dashed border-slate-200 rounded-md">
                Please add at least one size above to set stock.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 border-t border-slate-100 pt-3.5">
            <div className="space-y-1.5">
              <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 ml-1">Purchase Price <span className="text-red-500">*</span></label>
              <input name="purchasePrice" type="number" step="0.01" defaultValue={productToEdit?.purchasePrice || 0} required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-md outline-none transition-all font-bold uppercase tracking-wider text-slate-800 text-xs" placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 ml-1">Tax (%)</label>
              <input name="taxPercent" type="number" defaultValue={productToEdit?.taxPercent || 12} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-md outline-none transition-all font-bold uppercase tracking-wider text-slate-800 text-xs" placeholder="12" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 ml-1">Min Stock</label>
              <input name="minStockAlert" type="number" defaultValue={productToEdit?.minStockAlert || 0} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-md outline-none transition-all font-bold uppercase tracking-wider text-slate-800 text-xs" placeholder="0" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 ml-1">Description</label>
            <textarea name="description" defaultValue={productToEdit?.description} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-md outline-none transition-all font-bold text-slate-800 text-xs min-h-[70px] resize-none" placeholder="Product details..." />
          </div>
          
          <div className="flex gap-2 pt-3 sticky bottom-0 bg-white">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isSaving}
              className="flex-1 rounded-md border border-slate-200 font-bold uppercase tracking-wider text-[10px] text-slate-600 py-2.5 disabled:opacity-50 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSaving}
              className={`flex-1 ${isSaving ? 'bg-[#01a9fb]/80 text-white cursor-wait' : 'bg-[#01a9fb] hover:bg-[#0098e6] text-white'} rounded-md font-extrabold uppercase tracking-wider text-[10px] shadow-xs py-2.5 transition-all active:scale-[0.98] flex items-center justify-center gap-2`}
            >
              {isSaving ? (
                <>
                  <RefreshCcw size={14} className="animate-spin text-white" />
                  <span>Saving..</span>
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
