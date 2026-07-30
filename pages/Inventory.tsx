import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../store/AppContext';
import { Button, Modal } from '../components/Shared';
import { ProductFormModal } from '../components/forms/ProductFormModal';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Package,
  Filter,
  ChevronRight,
  MoreVertical,
  ShoppingBag,
  RefreshCcw,
  ArrowUpRight,
  ArrowDownLeft,
  Upload,
  X,
  Image as ImageIcon,
  Eye,
  LayoutGrid,
  List,
  XCircle,
  Hash,
  ScanLine,
  Printer,
  Tag
} from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import { CATEGORIES } from '../constants';
import { Product } from '../types';
import { auth } from '../firebase';
import BarcodeScanner from '../components/BarcodeScanner';
import { generateDynamicLabelPDF, DEFAULT_TEMPLATE_50x30 } from '../utils/pdfLabel';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { StockEntryModal } from '../components/forms/StockEntryModal';
import LabelDesigner from '../components/forms/LabelDesigner';

const Inventory: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, suppliers, settings } = useApp();
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [viewLayout, setViewLayout] = useState<'GRID' | 'TABLE'>('GRID');
  
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [printProduct, setPrintProduct] = useState<Product | null>(null);
  const [sizeSelectorProduct, setSizeSelectorProduct] = useState<Product | null>(null);
  const [downloadingProduct, setDownloadingProduct] = useState<{ product: Product; sizes: string[] } | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [viewProductDetails, setViewProductDetails] = useState<Product | null>(null);

  const getActiveDownloadTemplate = () => {
    let template = DEFAULT_TEMPLATE_50x30;
    try {
      const saved = localStorage.getItem('kiddies_label_template_50x30');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.elements)) {
          template = parsed;
        }
      }
    } catch(e) {}
    return template;
  };

  const runHTMLToImageDownload = async (product: Product, sizes: string[]) => {
    setDownloadingProduct({ product, sizes });

    // Wait for React to render the off-screen cards in the DOM
    setTimeout(async () => {
      try {
        const template = getActiveDownloadTemplate();
        const MM_TO_PX = 3.7795275591;
        const labelWidthPx = template.labelWidth * MM_TO_PX;
        const labelHeightPx = template.labelHeight * MM_TO_PX;

        for (let i = 0; i < sizes.length; i++) {
          const element = document.getElementById(`hidden-tag-card-${i}`);
          if (element) {
            const fullCanvas = await html2canvas(element, {
              scale: 6, // 6x high resolution output for maximum sharpness
              useCORS: true,
              backgroundColor: '#ffffff'
            });
            // Manually crop the canvas to exact label dimensions to clip any overflowing text
            const cropW = Math.round(labelWidthPx * 6);
            const cropH = Math.round(labelHeightPx * 6);
            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = cropW;
            croppedCanvas.height = cropH;
            const ctx = croppedCanvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(fullCanvas, 0, 0, cropW, cropH, 0, 0, cropW, cropH);
            }
            const imgData = croppedCanvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = imgData;
            link.download = `Label_${product.sku.toUpperCase()}_${sizes[i].toUpperCase()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
      } catch (err) {
        console.error("Failed to generate HTML tag image:", err);
      } finally {
        setDownloadingProduct(null);
      }
    }, 150);
  };

  const triggerDownloadForSize = (product: Product, size: string) => {
    runHTMLToImageDownload(product, [size]);
  };

  const triggerDownloadForMultipleSizes = (product: Product, sizes: string[]) => {
    runHTMLToImageDownload(product, sizes);
  };

  const handleTagClick = (product: Product) => {
    const productsToPrint = (product.sizes?.length ? product.sizes : ['FREE']).map(size => ({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || '',
      sellingPrice: product.sellingPrice,
      purchasePrice: product.purchasePrice,
      color: product.color || '',
      size: size,
      styleCode: '',
      subCategory: product.subCategory || '',
      labelSize: '50x30' as const
    }));
    
    // Get the active template or fallback to default
    let template = DEFAULT_TEMPLATE_50x30;
    try {
      const saved = localStorage.getItem('kiddies_label_template_50x30');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id === 'default_50x30_v2' && Array.isArray(parsed.elements)) {
          template = parsed;
        }
      }
    } catch(e) {}

    generateDynamicLabelPDF(productsToPrint, template);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  


  const [showFilters, setShowFilters] = useState(false);
  const [filterStockStatus, setFilterStockStatus] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');
  const [filterBrand, setFilterBrand] = useState<string>('ALL');

  const brands = useMemo(() => {
    const b = new Set<string>();
    products.forEach(p => p.brand && b.add(p.brand));
    return Array.from(b).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const name = p.name || '';
      const sku = p.sku || '';
      const brand = p.brand || '';
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            brand.toLowerCase().includes(searchTerm.toLowerCase());
      
      const saleStock = p.saleStock || 0;
      const minStockAlert = p.minStockAlert || 0;
      
      const matchesStock = filterStockStatus === 'ALL' || 
                          (filterStockStatus === 'LOW' && saleStock <= minStockAlert && saleStock > 0) ||
                          (filterStockStatus === 'OUT' && saleStock === 0);
      
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesBrand = filterBrand === 'ALL' || p.brand === filterBrand;

      return matchesSearch && matchesStock && matchesCategory && matchesBrand;
    });
  }, [products, searchTerm, filterStockStatus, selectedCategory, filterBrand]);

  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product & { variants: Product[] }> = {};

    filteredProducts.forEach(p => {
      // Find base SKU by stripping the "-SIZE" suffix if it matches one of the sizes
      let baseSku = p.sku;
      const matchingSize = p.sizes[0];
      if (matchingSize && p.sku.endsWith(`-${matchingSize}`)) {
        baseSku = p.sku.substring(0, p.sku.length - matchingSize.length - 1);
      } else {
        const lastDash = p.sku.lastIndexOf('-');
        if (lastDash > 0) {
          baseSku = p.sku.substring(0, lastDash);
        }
      }

      const key = `${p.name.toLowerCase()}_${baseSku.toLowerCase()}`;

      if (!groups[key]) {
        groups[key] = {
          ...p,
          sku: baseSku,
          sizes: [...p.sizes],
          variants: [p]
        };
      } else {
        const g = groups[key];
        g.saleStock += p.saleStock;
        g.rentalStock += p.rentalStock;
        p.sizes.forEach(size => {
          if (!g.sizes.includes(size)) {
            g.sizes.push(size);
          }
        });
        g.variants.push(p);
        if (!g.imageUrl && p.imageUrl) {
          g.imageUrl = p.imageUrl;
        }
      }
    });

    return Object.values(groups);
  }, [filteredProducts]);

  const inventoryValue = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.purchasePrice * (p.saleStock + p.rentalStock)), 0);
  }, [products]);

  return (
    <div className="space-y-4 animate-nano pb-20">
      {/* Header */}
      <div className="flex items-center justify-between py-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Inventory</h1>
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Stock Management</p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="nano-card p-4 group hover:bg-slate-900 transition-all duration-300">
          <p className="text-[9px] font-semibold uppercase text-slate-400 tracking-widest mb-0.5 group-hover:text-slate-500 transition-colors">Total Items</p>
          <p className="text-lg font-bold text-slate-900 group-hover:text-white transition-colors tracking-tight">{products.length}</p>
        </div>
        <div className="nano-card p-4 group hover:bg-slate-900 transition-all duration-300">
          <p className="text-[9px] font-semibold uppercase text-slate-400 tracking-widest mb-0.5 group-hover:text-slate-500 transition-colors">Low Stock</p>
          <p className="text-lg font-bold text-rose-500 tracking-tight">{products.filter(p => p.saleStock <= p.minStockAlert).length}</p>
        </div>
        <div className="nano-card p-4 group hover:bg-slate-900 transition-all duration-300">
          <p className="text-[9px] font-semibold uppercase text-slate-400 tracking-widest mb-0.5 group-hover:text-slate-500 transition-colors">Inv. Value</p>
          <p className="text-lg font-bold text-emerald-600 tracking-tight font-mono">{formatCurrency(inventoryValue)}</p>
        </div>
        <div className="nano-card p-4 group hover:bg-slate-900 transition-all duration-300">
          <p className="text-[9px] font-semibold uppercase text-slate-400 tracking-widest mb-0.5 group-hover:text-slate-500 transition-colors">Suppliers</p>
          <p className="text-lg font-bold text-slate-900 group-hover:text-white transition-colors tracking-tight">{suppliers.length}</p>
        </div>
      </div>

      {/* Advanced Filters Row */}
      <div className="flex flex-col gap-2">
        {/* Filtering & Layout Selection */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 w-full md:w-auto">
            <div className="relative group flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#8B5CF6] transition-colors" size={12} />
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full bg-white border border-slate-100 rounded-lg py-2 pl-9 pr-3 text-[8px] md:text-[9px] font-bold uppercase tracking-widest outline-none focus:border-[#8B5CF6]/30 transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg border transition-all flex items-center gap-2 text-[8px] font-black uppercase tracking-widest ${showFilters ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
            >
              <Filter size={10} strokeWidth={showFilters ? 3 : 2.5} />
              <span className="hidden xs:inline">{showFilters ? 'Hide' : 'Filters'}</span>
            </button>
          </div>
          
          <div className="flex bg-white border border-slate-100 p-0.5 rounded-lg shadow-sm h-8 self-end md:self-auto">
            <button 
              onClick={() => setViewLayout('GRID')}
              className={`p-1.5 rounded-md transition-all ${viewLayout === 'GRID' ? 'bg-slate-50 text-slate-900' : 'text-slate-300'}`}
            >
              <Package size={14} />
            </button>
            <button 
              onClick={() => setViewLayout('TABLE')}
              className={`p-1.5 rounded-md transition-all ${viewLayout === 'TABLE' ? 'bg-slate-50 text-slate-900' : 'text-slate-300'}`}
            >
              <List size={14} />
            </button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="bg-white border border-slate-100 rounded-2xl p-4 md:p-5 shadow-xl animate-nano space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-300 tracking-widest ml-1">Stock Availability</label>
                <select 
                  className="w-full bg-slate-50 border border-transparent focus:bg-white focus:border-[#8B5CF6]/30 rounded-lg p-2.5 text-[9px] font-black uppercase outline-none transition-all appearance-none"
                  value={filterStockStatus}
                  onChange={(e) => setFilterStockStatus(e.target.value as any)}
                >
                  <option value="ALL">Any Stock Level</option>
                  <option value="LOW">Low Stock Alerts</option>
                  <option value="OUT">Out of Stock</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-300 tracking-widest ml-1">Brand Selection</label>
                <select 
                  className="w-full bg-slate-50 border border-transparent focus:bg-white focus:border-[#8B5CF6]/30 rounded-lg p-2.5 text-[9px] font-black uppercase outline-none transition-all appearance-none"
                  value={filterBrand}
                  onChange={(e) => setFilterBrand(e.target.value)}
                >
                  <option value="ALL">All Brands</option>
                  {brands.map(brand => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-300 tracking-widest ml-1">Product Category</label>
                <select 
                  className="w-full bg-slate-50 border border-transparent focus:bg-white focus:border-[#8B5CF6]/30 rounded-lg p-2.5 text-[9px] font-black uppercase outline-none transition-all appearance-none"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="All">All Categories</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Product List */}
      {viewLayout === 'GRID' ? (
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 transition-all duration-300">
          {groupedProducts.map(product => (
             <div 
              key={product.id} 
              className="bg-white border border-slate-150 rounded-xl p-2.5 pb-3 flex flex-col gap-2 group cursor-pointer hover:border-[#8B5CF6]/30 hover:shadow-lg hover:shadow-[#8B5CF6]/5 transition-all duration-300 h-[230px] w-full overflow-hidden"
              onClick={() => setViewProductDetails(product)}
            >
              {/* Product Image Container (Fixed Height) */}
              <div className="h-24 bg-slate-50/80 rounded-lg relative overflow-hidden transition-all duration-500 shadow-inner group/img flex items-center justify-center shrink-0">
                {product.imageUrl ? (
                  <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    className="w-full h-full object-contain p-1.5 group-hover:scale-105 transition-transform duration-500 ease-in-out" 
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 group-hover:text-[#8B5CF6] transition-colors duration-500">
                    <Package size={28} strokeWidth={1} />
                  </div>
                )}
                
                {/* Purpose Badge Overlaid on Image */}
                <div className="absolute bottom-1.5 left-1.5">
                  <span className={`text-[6px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shadow-sm ${
                    product.purpose === 'SALE' 
                      ? 'bg-emerald-500 text-white' 
                      : product.purpose === 'RENTAL' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-amber-500 text-white'
                  }`}>
                    {product.purpose === 'SALE' ? 'Sell' : product.purpose === 'RENTAL' ? 'Rent' : 'Hybrid'}
                  </span>
                </div>

                {/* Stock Warning Badge */}
                {product.saleStock + product.rentalStock === 0 && (
                  <div className="absolute top-1.5 left-1.5 bg-rose-500 text-white text-[5px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shadow-sm">
                    Out
                  </div>
                )}
              </div>

              {/* Product Details Area (Fixed Heights to avoid shifting) */}
              <div className="flex flex-col flex-1 justify-between py-0.5 px-0.5 min-w-0">
                <div>
                  <div className="flex items-center justify-between text-[7px] font-bold text-slate-400 uppercase tracking-widest gap-1">
                    <span className="truncate">{product.category}</span>
                    <span className="shrink-0 bg-slate-50 border border-slate-100 px-1 py-0.5 rounded text-slate-500 font-black">{product.sizes.length} {product.sizes.length === 1 ? 'Size' : 'Sizes'}</span>
                  </div>
                  
                  <h4 className="text-[10px] font-black text-slate-800 tracking-tight leading-snug truncate mt-0.5 group-hover:text-[#8B5CF6] transition-colors" title={product.name}>
                    {product.name}
                  </h4>
                </div>

                {/* Price and Stock row */}
                <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-slate-50">
                  <div className="flex flex-col">
                    <span className="text-[5px] font-black text-slate-400 uppercase tracking-widest">Price</span>
                    <span className="text-[10px] font-black text-slate-900 font-mono tracking-tight">{formatCurrency(product.sellingPrice)}</span>
                  </div>
                  <div className="text-right flex flex-col">
                    <span className="text-[5px] font-black text-slate-400 uppercase tracking-widest">Stock</span>
                    <span className={`text-[9px] font-black ${product.saleStock + product.rentalStock === 0 ? 'text-rose-500' : 'text-slate-700'}`}>
                      {product.saleStock + product.rentalStock} Pcs
                    </span>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-between gap-1.5 mt-2 pt-2 border-t border-slate-100 shrink-0">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewProductDetails(product);
                    }}
                    className="flex-1 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-md text-slate-600 flex items-center justify-center transition-all h-6"
                    title="View Details"
                  >
                    <Eye size={10} strokeWidth={2.5} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setProductToEdit(product);
                      setIsProductModalOpen(true);
                    }}
                    className="flex-1 py-1 bg-slate-900 hover:bg-slate-800 rounded-md text-white flex items-center justify-center shadow-sm transition-all h-6"
                    title="Edit Product"
                  >
                    <Edit2 size={9} strokeWidth={2.5} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTagClick(product);
                    }}
                    className="flex-1 py-1 bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/20 rounded-md text-[#8B5CF6] flex items-center justify-center transition-all h-6"
                    title="Print Tags"
                  >
                    <Tag size={10} strokeWidth={2.5} />
                  </button>
                  {settings?.enableDeleteInventory && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("Are you sure you want to permanently delete this product? This cannot be undone.")) {
                          deleteProduct(product.id);
                        }
                      }}
                      className="flex-1 py-1 bg-rose-50 hover:bg-rose-100 rounded-md text-rose-500 flex items-center justify-center transition-all h-6"
                      title="Delete Product"
                    >
                      <Trash2 size={10} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl md:rounded-2xl border border-slate-50 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="px-4 py-3 text-[7px] font-black uppercase tracking-widest text-slate-400">Product</th>
                  <th className="px-4 py-3 text-[7px] font-black uppercase tracking-widest text-slate-400">SKU / Brand</th>
                  <th className="px-4 py-3 text-[7px] font-black uppercase tracking-widest text-slate-400">Sizes</th>
                  <th className="px-4 py-3 text-[7px] font-black uppercase tracking-widest text-slate-400">Stock</th>
                  <th className="px-4 py-3 text-[7px] font-black uppercase tracking-widest text-slate-400 text-right">Price</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {groupedProducts.map(product => (
                  <tr 
                    key={product.id} 
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                    onClick={() => { 
                      setViewProductDetails(product); 
                    }}
                  >
                    <td className="px-3 md:px-4 py-1.5 md:py-2">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-50 rounded-lg md:rounded-xl overflow-hidden shrink-0 border border-slate-100 group-hover:scale-105 transition-transform">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-200">
                              <Package size={14} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] md:text-[10px] font-black text-slate-900 uppercase tracking-tight truncate max-w-[120px] md:max-w-[180px]">{product.name}</p>
                          <p className="text-[5px] md:text-[6px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{product.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 md:px-4 py-1.5 md:py-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest">{product.sku}</span>
                        {product.brand && (
                          <span className="text-[5px] md:text-[6px] font-bold text-slate-400 uppercase tracking-widest">{product.brand}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 md:px-4 py-1.5 md:py-2">
                      <div className="flex flex-wrap gap-0.5 max-w-[80px]">
                        {(product.sizes || []).slice(0, 1).map(size => (
                          <span key={size} className="text-[5px] font-black text-slate-400 border border-slate-100 px-1 py-0.5 rounded-md uppercase text-center min-w-[15px]">
                            {size}
                          </span>
                        ))}
                        {(product.sizes || []).length > 1 && (
                          <span className="text-[5px] font-black text-slate-300 px-1 py-0.5">
                            +{(product.sizes || []).length - 1}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 md:px-4 py-1.5 md:py-2">
                      <div className="flex gap-2">
                        <div className="flex flex-col">
                          <span className="text-[4px] md:text-[5px] font-black text-slate-300 uppercase tracking-widest">S</span>
                          <span className={`text-[8px] md:text-[9px] font-black ${product.saleStock <= product.minStockAlert ? 'text-rose-500' : 'text-slate-900'}`}>{product.saleStock}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[4px] md:text-[5px] font-black text-slate-300 uppercase tracking-widest">R</span>
                          <span className="text-[8px] md:text-[9px] font-black text-slate-900">{product.rentalStock}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 md:px-4 py-1.5 md:py-2 text-right">
                      <span className="text-[9px] md:text-[10px] font-black text-slate-900 font-mono tracking-tight">{formatCurrency(product.sellingPrice)}</span>
                    </td>
                    <td className="px-3 md:px-4 py-1.5 md:py-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewProductDetails(product);
                          }}
                          className="w-6 h-6 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-650 transition-all border border-slate-200/60"
                          title="View Details"
                        >
                          <Eye size={10} strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProductToEdit(product);
                            setIsProductModalOpen(true);
                          }}
                          className="w-6 h-6 rounded-lg bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-white transition-all shadow-sm"
                          title="Edit Product"
                        >
                          <Edit2 size={9} strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTagClick(product);
                          }}
                          className="w-6 h-6 rounded-lg bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/20 flex items-center justify-center text-[#8B5CF6] transition-all"
                          title="Design & Print Label"
                        >
                          <Tag size={10} strokeWidth={2.5} />
                        </button>
                        {settings?.enableDeleteInventory && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("Are you sure you want to permanently delete this product? This cannot be undone.")) {
                                deleteProduct(product.id);
                              }
                            }}
                            className="w-6 h-6 rounded-lg bg-rose-50 hover:bg-rose-100 flex items-center justify-center text-rose-500 transition-all"
                            title="Delete Product"
                          >
                            <Trash2 size={10} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredProducts.length === 0 && (
        <div className="py-12 text-center col-span-full">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 mx-auto mb-3">
            <Package size={24} strokeWidth={1.5} />
          </div>
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">No items found</p>
        </div>
      )}

      {/* Floating Action Button */}
      {createPortal(
        <div className="fixed bottom-[80px] right-4 md:bottom-8 md:right-8 flex justify-end pointer-events-none z-[100]">
          <button 
            onClick={() => { 
              setProductToEdit(null); 
              setIsProductModalOpen(true); 
            }}
            className="pointer-events-auto bg-[#8B5CF6] hover:bg-[#7C3AED] text-white p-4 md:px-6 md:py-3.5 rounded-full shadow-[0_10px_30px_rgba(139,92,246,0.4)] flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all group border border-white/20"
          >
            <Plus size={24} strokeWidth={3} className="md:w-[16px] md:h-[16px]" />
            <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">Add Product</span>
          </button>
        </div>,
        document.body
      )}


      <ProductFormModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} productToEdit={productToEdit} />

      <StockEntryModal 
        isOpen={isStockModalOpen} 
        onClose={() => setIsStockModalOpen(false)} 
        product={products.find(p => p.id === selectedProduct) || null}
      />

      {printProduct && (
        <LabelDesigner 
          labelData={{
            name: printProduct.name,
            sku: printProduct.sku,
            barcode: printProduct.barcode || '',
            sellingPrice: printProduct.sellingPrice,
            purchasePrice: printProduct.purchasePrice,
            color: printProduct.color || '',
            styleCode: '',
            labelSize: '50x30'
          }}
          allProductSizes={printProduct.sizes}
          onClose={() => setPrintProduct(null)}
          onPrint={(template, products) => {
            generateDynamicLabelPDF(products, template);
            setPrintProduct(null);
          }}
        />
      )}

      {sizeSelectorProduct && (
        <Modal 
          isOpen={!!sizeSelectorProduct}
          onClose={() => setSizeSelectorProduct(null)}
          title="Print Product Tag"
        >
          <div className="space-y-5 py-2">
            <div>
              <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-widest leading-tight">{sizeSelectorProduct.name}</h4>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select which size tag you want to download:</p>
            </div>

            <div className="flex flex-wrap gap-2 py-1">
              {sizeSelectorProduct.sizes.map(size => (
                <button
                  key={size}
                  onClick={() => {
                    triggerDownloadForSize(sizeSelectorProduct, size);
                    setSizeSelectorProduct(null);
                  }}
                  className="flex-1 min-w-[70px] py-3 bg-slate-50 hover:bg-[#8B5CF6]/5 border border-slate-200 hover:border-[#8B5CF6]/35 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-700 transition-all shadow-sm flex flex-col items-center justify-center gap-1 group"
                >
                  <span className="text-[#8B5CF6] group-hover:scale-110 transition-transform font-bold text-xs">{size}</span>
                  <span className="text-[7px] text-slate-400">Download</span>
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => {
                  triggerDownloadForMultipleSizes(sizeSelectorProduct, sizeSelectorProduct.sizes);
                  setSizeSelectorProduct(null);
                }}
                className="flex-1 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-md shadow-[#8B5CF6]/20 transition-all flex items-center justify-center gap-1.5"
              >
                Download All ({sizeSelectorProduct.sizes.length} Sizes)
              </button>
              <button
                onClick={() => {
                  setPrintProduct(sizeSelectorProduct);
                  setSizeSelectorProduct(null);
                }}
                className="flex-1 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
              >
                Customize Layout
              </button>
            </div>
          </div>
        </Modal>
      )}

      {lightboxImage && (
        <Modal 
          isOpen={!!lightboxImage} 
          onClose={() => setLightboxImage(null)} 
          title="Product Image Preview"
        >
          <div className="flex items-center justify-center p-2 bg-slate-50 rounded-3xl overflow-hidden max-h-[70vh]">
            <img 
              src={lightboxImage} 
              alt="Full Preview" 
              className="max-w-full max-h-[60vh] object-contain rounded-2xl shadow-md border border-slate-100" 
              referrerPolicy="no-referrer"
            />
          </div>
        </Modal>
      )}

      {/* View Product Details Modal */}
      {viewProductDetails && (
        <Modal 
          isOpen={!!viewProductDetails} 
          onClose={() => setViewProductDetails(null)} 
          title="Product Details"
        >
          <div className="space-y-6 animate-nano max-h-[80vh] overflow-y-auto pr-1">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Product Image */}
              <div className="w-full md:w-48 h-48 bg-slate-50 border border-slate-100 rounded-3xl overflow-hidden shrink-0 flex items-center justify-center relative">
                {viewProductDetails.imageUrl ? (
                  <img src={viewProductDetails.imageUrl} alt={viewProductDetails.name} className="w-full h-full object-contain p-2" />
                ) : (
                  <Package size={48} className="text-slate-350" />
                )}
              </div>
              
              {/* Core Details */}
              <div className="flex-1 space-y-4">
                <div>
                  <span className="bg-[#8B5CF6]/10 text-[#8B5CF6] text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg">{viewProductDetails.category}</span>
                  <h3 className="text-lg font-black text-slate-900 mt-2 uppercase tracking-tight">{viewProductDetails.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Base SKU: {viewProductDetails.sku}</p>
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-4 border-t border-slate-50 pt-3">
                  <div>
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Gender</span>
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{viewProductDetails.gender || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Sub Category</span>
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{viewProductDetails.subCategory || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Type</span>
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{viewProductDetails.clothingType || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Brand</span>
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{viewProductDetails.brand || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Color</span>
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{viewProductDetails.color || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Material</span>
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{viewProductDetails.material || 'N/A'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Supplier</span>
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest text-ellipsis overflow-hidden whitespace-nowrap block">
                      {suppliers.find(s => s.id === viewProductDetails.supplierId)?.name || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Attributes Grid */}
            <div className="flex flex-wrap gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100">
              {(viewProductDetails.purpose === 'SALE' || viewProductDetails.purpose === 'HYBRID') && (
                <div className="flex-1 min-w-[100px]">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Selling Price</span>
                  <span className="text-sm font-black text-slate-900 font-mono">{formatCurrency(viewProductDetails.sellingPrice)}</span>
                </div>
              )}
              {(viewProductDetails.purpose === 'RENTAL' || viewProductDetails.purpose === 'HYBRID') && (
                <div className="flex-1 min-w-[100px]">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Rental Price</span>
                  <span className="text-sm font-black text-slate-900 font-mono">{formatCurrency(viewProductDetails.rentalPrice)}</span>
                </div>
              )}
              <div className="flex-1 min-w-[100px]">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Purchase Price</span>
                <span className="text-sm font-black text-slate-900 font-mono">{formatCurrency(viewProductDetails.purchasePrice)}</span>
              </div>
              <div className="flex-1 min-w-[100px]">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Tax Rate</span>
                <span className="text-sm font-black text-slate-900">{viewProductDetails.taxPercent}%</span>
              </div>
            </div>

            {/* Size Variants & Stock breakdown */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Available Sizes & Stock</h4>
              <div className="flex flex-wrap gap-2">
                {(viewProductDetails as any).variants?.map((v: Product) => {
                  const sizeName = v.sizes[0] || 'N/A';
                  return (
                    <div key={v.id} className="bg-white border border-slate-150 rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-sm hover:border-[#8B5CF6]/30 transition-all duration-300">
                      <span className="bg-slate-100 text-slate-800 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border border-slate-200">
                        {sizeName}
                      </span>
                      
                      <div className="flex items-center gap-2.5 text-[9px] font-black uppercase tracking-widest text-slate-500">
                        {(viewProductDetails.purpose === 'SALE' || viewProductDetails.purpose === 'HYBRID') && (
                          <div className="flex flex-col">
                            <span className="text-[6px] font-black text-slate-350">For Sale</span>
                            <span className="text-slate-700">{v.saleStock} Units</span>
                          </div>
                        )}
                        {viewProductDetails.purpose === 'HYBRID' && (
                          <span className="text-slate-300">|</span>
                        )}
                        {(viewProductDetails.purpose === 'RENTAL' || viewProductDetails.purpose === 'HYBRID') && (
                          <div className="flex flex-col">
                            <span className="text-[6px] font-black text-slate-355">For Rent</span>
                            <span className="text-slate-700">{v.rentalStock} Units</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            {viewProductDetails.description && (
              <div className="space-y-1">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">Description</span>
                <p className="text-[10px] text-slate-600 leading-relaxed font-semibold">{viewProductDetails.description}</p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-50">
              <button 
                onClick={() => {
                  setProductToEdit(viewProductDetails);
                  setViewProductDetails(null);
                  setIsProductModalOpen(true);
                }}
                className="flex-1 h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-[9px] shadow-md flex items-center justify-center gap-1.5 transition-all"
              >
                <Edit2 size={12} /> Edit Product
              </button>
              <button 
                onClick={() => {
                  handleTagClick(viewProductDetails);
                  setViewProductDetails(null);
                }}
                className="flex-1 h-12 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-1.5 transition-all"
              >
                <Printer size={12} /> Print Tags
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Hidden Offscreen Tag Rendering Element */}
      {downloadingProduct && (() => {
        const template = getActiveDownloadTemplate();
        return (
          <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', zIndex: -100, pointerEvents: 'none' }}>
            {downloadingProduct.sizes.map((size, idx) => (
              <div
                key={idx}
                id={`hidden-tag-card-${idx}`}
                style={{
                  width: `${template.labelWidth * 3.7795275591}px`,
                  height: `${template.labelHeight * 3.7795275591}px`,
                  backgroundColor: '#ffffff',
                  position: 'relative',
                  fontFamily: 'Helvetica, Arial, sans-serif',
                  overflow: 'hidden',
                  boxSizing: 'border-box'
                }}
              >
                {template.elements.map(el => {
                  if (!el.visible) return null;
                  const MM_TO_PX = 3.7795275591;
                  
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
                        <img src={el.imageBase64} style={{ width: '100%', height: '100%', objectFit: 'fill' }} />
                      </div>
                    );
                  } else if (el.type === 'text') {
                    let text = el.staticText || '';
                    if (el.id === 'name') text = (downloadingProduct.product.name || '').slice(0, 23).toUpperCase();
                    if (el.id === 'size') text += (size || '').toUpperCase();
                    if (el.id === 'color') text += (downloadingProduct.product.color || '').toUpperCase();
                    if (el.id === 'style') text += '';
                    if (el.id === 'price') text += Number(downloadingProduct.product.sellingPrice || 0).toFixed(2);
                    if (el.id === 'code') text += '91' + ((downloadingProduct.product.purchasePrice || 0) * 2).toString();
                    if (el.id === 'sku') text += (downloadingProduct.product.sku || '').toUpperCase();
                    if (el.id === 'barcodeText') text = (downloadingProduct.product.barcode || downloadingProduct.product.sku || '').toUpperCase();
                    // Auto-shrink font if text would overflow the label width
                    const baseFontPx = (el.fontSize || 6) * 1.3;
                    const labelWidthPxLocal = template.labelWidth * MM_TO_PX;
                    const charWidthEstimate = baseFontPx * 0.65; // approximate character width
                    const textWidthEstimate = text.length * charWidthEstimate;
                    const availableWidth = isCentered ? labelWidthPxLocal : (labelWidthPxLocal - el.x * MM_TO_PX);
                    const scaledFontPx = textWidthEstimate > availableWidth
                      ? baseFontPx * (availableWidth / textWidthEstimate)
                      : baseFontPx;

                    return (
                      <div
                        key={el.id}
                        style={{
                          ...baseStyle,
                          fontSize: `${scaledFontPx}px`,
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
                    return (
                      <div key={el.id} style={{ ...baseStyle, width: `${(el.width || 10) * MM_TO_PX}px`, minHeight: '10px', display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '100%', height: 0, borderBottom: `${(el.height || 0.5) * MM_TO_PX}px ${bStyle} #1e293b` }} />
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
                          border: `${0.5 * MM_TO_PX}px ${bStyle} #1e293b`,
                          borderRadius: `${(el.borderRadius || 0) * MM_TO_PX}px`,
                          backgroundColor: 'transparent'
                        }}
                      />
                    );
                  }
                  return null;
                })}
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
};

export default Inventory;

