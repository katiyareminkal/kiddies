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
  Tag,
  Boxes,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import { CATEGORIES } from '../constants';
import { Product } from '../types';
import { auth } from '../firebase';
import BarcodeScanner from '../components/BarcodeScanner';
import { generateDynamicLabelPDF, DEFAULT_TEMPLATE_50x30, getEffectiveGender } from '../utils/pdfLabel';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { StockEntryModal } from '../components/forms/StockEntryModal';
import LabelDesigner from '../components/forms/LabelDesigner';
import { TagPrintModal } from '../components/forms/TagPrintModal';
import { LabelTemplate } from '../utils/pdfLabel';

const Inventory: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, suppliers, settings } = useApp();
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [viewLayout, setViewLayout] = useState<'GRID' | 'TABLE'>('GRID');

  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [tagPrintProduct, setTagPrintProduct] = useState<Product | null>(null);
  const [designerConfig, setDesignerConfig] = useState<{ product: Product; template: LabelTemplate; sizes: string[] } | null>(null);
  const [downloadingProduct, setDownloadingProduct] = useState<{ product: Product; sizes: string[] } | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [viewProductDetails, setViewProductDetails] = useState<Product | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [stockFilter, setStockFilter] = useState<'ALL' | 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [purposeFilter, setPurposeFilter] = useState<'ALL' | 'SALE' | 'RENTAL' | 'HYBRID'>('ALL');
  const [filterBrand, setFilterBrand] = useState<string>('ALL');

  const categories = useMemo(() => {
    const cats = new Set<string>();
    cats.add('ALL');
    CATEGORIES.forEach(c => cats.add(c));
    products.forEach(p => p.category && cats.add(p.category));
    return Array.from(cats);
  }, [products]);

  const brands = useMemo(() => {
    const b = new Set<string>();
    products.forEach(p => p.brand && b.add(p.brand));
    return Array.from(b).sort();
  }, [products]);

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
    } catch (e) { }
    return template;
  };

  const runHTMLToImageDownload = async (product: Product, sizes: string[]) => {
    setDownloadingProduct({ product, sizes });

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
              scale: 6,
              useCORS: true,
              backgroundColor: '#ffffff'
            });
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

  const handleTagClick = (product: Product) => {
    setTagPrintProduct(product);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const name = p.name || '';
      const sku = p.sku || '';
      const brand = p.brand || '';
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        brand.toLowerCase().includes(searchTerm.toLowerCase());

      const totalStock = (p.saleStock || 0) + (p.rentalStock || 0);
      const minStockAlert = p.minStockAlert || 3;

      let matchesStock = true;
      if (stockFilter === 'AVAILABLE') matchesStock = totalStock > minStockAlert;
      else if (stockFilter === 'LOW_STOCK') matchesStock = totalStock <= minStockAlert && totalStock > 0;
      else if (stockFilter === 'OUT_OF_STOCK') matchesStock = totalStock === 0;

      const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
      const matchesPurpose = purposeFilter === 'ALL' || p.purpose === purposeFilter;
      const matchesBrand = filterBrand === 'ALL' || p.brand === filterBrand;

      return matchesSearch && matchesStock && matchesCategory && matchesPurpose && matchesBrand;
    });
  }, [products, searchTerm, stockFilter, categoryFilter, purposeFilter, filterBrand]);

  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product & { variants: Product[] }> = {};

    filteredProducts.forEach(p => {
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

      const key = `${(p.name || '').toLowerCase()}_${(baseSku || '').toLowerCase()}`;

      if (!groups[key]) {
        groups[key] = {
          ...p,
          sku: baseSku,
          sizes: [...(p.sizes || [])],
          variants: [p]
        };
      } else {
        const g = groups[key];
        g.saleStock = (g.saleStock || 0) + (p.saleStock || 0);
        g.rentalStock = (g.rentalStock || 0) + (p.rentalStock || 0);
        (p.sizes || []).forEach(size => {
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

  const inventoryStats = useMemo(() => {
    const totalSKUs = products.length;
    const lowStockCount = products.filter(p => ((p.saleStock || 0) + (p.rentalStock || 0)) <= (p.minStockAlert || 3) && ((p.saleStock || 0) + (p.rentalStock || 0)) > 0).length;
    const outOfStockCount = products.filter(p => ((p.saleStock || 0) + (p.rentalStock || 0)) === 0).length;
    const totalValuation = products.reduce((acc, p) => acc + ((p.purchasePrice || 0) * ((p.saleStock || 0) + (p.rentalStock || 0))), 0);
    const totalPieces = products.reduce((acc, p) => acc + (p.saleStock || 0) + (p.rentalStock || 0), 0);

    return { totalSKUs, lowStockCount, outOfStockCount, totalValuation, totalPieces };
  }, [products]);

  return (
    <div className="space-y-5 animate-nano pb-24 max-w-[1600px] mx-auto">
      {/* ── Executive Header ── */}
      <div className="bg-white border border-slate-200/80 rounded-md p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-[#01a9fb] text-white flex items-center justify-center shadow-xs shrink-0">
            <Package size={20} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">Inventory Catalog</h1>
              <span className="text-[10px] font-extrabold text-[#01a9fb] bg-[#01a9fb]/10 border border-[#01a9fb]/30 px-2 py-0.5 rounded-md">
                {inventoryStats.totalPieces} Pcs in Stock
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Live warehouse & rental stock levels, pricing, and barcodes</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsStockModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-yellow-100 hover:bg-yellow-200 text-yellow-900 border border-yellow-300 text-xs font-extrabold uppercase tracking-wider rounded-md transition-all active:scale-95 shadow-xs"
          >
            <Boxes size={15} strokeWidth={2.5} />
            <span>Stock In</span>
          </button>
          <button
            onClick={() => {
              setProductToEdit(null);
              setIsProductModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#01a9fb] hover:bg-[#0098e6] text-white text-xs font-extrabold uppercase tracking-wider rounded-md shadow-xs transition-all active:scale-95"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards (4 Cards) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
        <div className="bg-white hover:bg-slate-50/60 p-3 sm:p-4 rounded-md border border-slate-200/80 hover:border-[#01a9fb]/50 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Total SKUs</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-[#01a9fb]/10 text-[#01a9fb] flex items-center justify-center font-bold text-xs shrink-0">
              <Package size={13} />
            </div>
          </div>
          <h3 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-none whitespace-nowrap truncate">{inventoryStats.totalSKUs}</h3>
          <p className="text-[10px] sm:text-[11px] font-bold text-[#01a9fb] mt-1.5 whitespace-nowrap truncate">{inventoryStats.totalPieces} pcs cataloged</p>
        </div>

        <div
          onClick={() => { setStockFilter('LOW_STOCK'); setShowFilters(true); }}
          className={`p-3 sm:p-4 rounded-md border transition-all duration-200 cursor-pointer ${inventoryStats.lowStockCount > 0
            ? 'bg-yellow-50/70 border-yellow-200 hover:border-yellow-300'
            : 'bg-white hover:bg-slate-50/60 border-slate-200/80'
            }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${inventoryStats.lowStockCount > 0 ? 'text-yellow-800' : 'text-slate-500'}`}>Low Stock Alerts</span>
            <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${inventoryStats.lowStockCount > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-400'}`}>
              <AlertTriangle size={13} />
            </div>
          </div>
          <h3 className={`text-lg sm:text-2xl font-black tracking-tight leading-none whitespace-nowrap truncate ${inventoryStats.lowStockCount > 0 ? 'text-yellow-700' : 'text-slate-900'}`}>
            {inventoryStats.lowStockCount}
          </h3>
          <p className={`text-[10px] sm:text-[11px] font-bold mt-1.5 whitespace-nowrap truncate ${inventoryStats.lowStockCount > 0 ? 'text-yellow-800' : 'text-slate-400'}`}>
            {inventoryStats.lowStockCount > 0 ? 'Reorder needed' : 'Stock healthy'}
          </p>
        </div>

        <div className="bg-white hover:bg-slate-50/60 p-3 sm:p-4 rounded-md border border-slate-200/80 hover:border-[#fe569f]/50 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Valuation</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-[#fe569f]/10 text-[#fe569f] flex items-center justify-center font-bold text-xs shrink-0">
              <Tag size={13} />
            </div>
          </div>
          <h3 className="text-lg sm:text-2xl font-black text-[#fe569f] tracking-tight leading-none font-mono whitespace-nowrap truncate">
            {formatCurrency(inventoryStats.totalValuation)}
          </h3>
          <p className="text-[10px] sm:text-[11px] font-bold text-[#fe569f] mt-1.5 whitespace-nowrap truncate">Purchase cost basis</p>
        </div>

        <div className="bg-white hover:bg-slate-50/60 p-3 sm:p-4 rounded-md border border-slate-200/80 hover:border-[#01a9fb]/50 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Suppliers</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-[#01a9fb]/10 text-[#01a9fb] flex items-center justify-center font-bold text-xs shrink-0">
              <Boxes size={13} />
            </div>
          </div>
          <h3 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-none whitespace-nowrap truncate">{suppliers.length}</h3>
          <p className="text-[10px] sm:text-[11px] font-bold text-[#01a9fb] mt-1.5 whitespace-nowrap truncate">Registered partners</p>
        </div>
      </div>

      {/* ── Toolbar: Search + Filters + Layout Selector ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            {/* Search Input */}
            <div className="relative group flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#01a9fb] transition-colors" size={15} strokeWidth={2.5} />
              <input
                type="text"
                placeholder="Search product name, SKU, brand..."
                className="w-full pl-10 pr-3.5 py-2 bg-white border border-slate-200/80 rounded-md text-xs font-bold text-slate-900 outline-none focus:border-[#01a9fb] focus:ring-2 focus:ring-[#01a9fb]/10 transition-all shadow-xs placeholder:text-slate-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-md border transition-all flex items-center justify-center shrink-0 ${showFilters ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-white text-slate-600 border-slate-200/80 hover:border-slate-300 shadow-xs'}`}
              title="Filter Catalog"
            >
              <Filter size={15} strokeWidth={showFilters ? 3 : 2.5} />
            </button>
          </div>

          {/* Grid vs Table Layout Toggle */}
          <div className="inline-flex bg-slate-100 p-1 rounded-md border border-slate-200/70 shrink-0 self-end md:self-auto">
            <button
              onClick={() => setViewLayout('GRID')}
              className={`p-1.5 rounded transition-all ${viewLayout === 'GRID' ? 'bg-[#01a9fb] text-white shadow-xs' : 'text-slate-400 hover:text-slate-700'}`}
              title="Grid View"
            >
              <LayoutGrid size={15} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => setViewLayout('TABLE')}
              className={`p-1.5 rounded transition-all ${viewLayout === 'TABLE' ? 'bg-[#01a9fb] text-white shadow-xs' : 'text-slate-400 hover:text-slate-700'}`}
              title="Table View"
            >
              <List size={15} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* ── Advanced Filters Drawer ── */}
        {showFilters && (
          <div className="bg-white border border-slate-200/80 rounded-md p-3.5 sm:p-4 shadow-xs animate-nano space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-extrabold uppercase text-slate-600 tracking-wider">Filter Inventory Catalog</span>
              <button
                onClick={() => {
                  setStockFilter('ALL');
                  setCategoryFilter('ALL');
                  setPurposeFilter('ALL');
                  setFilterBrand('ALL');
                  setSearchTerm('');
                }}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1"
              >
                <XCircle size={13} />
                <span>Reset Filters</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Stock Status</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-[#01a9fb]"
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value as any)}
                >
                  <option value="ALL">All Stock Levels</option>
                  <option value="AVAILABLE">Available / In Stock</option>
                  <option value="LOW_STOCK">Low Stock (≤ Alert Limit)</option>
                  <option value="OUT_OF_STOCK">Out of Stock (0 Pcs)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Category</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-[#01a9fb]"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Purpose</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-[#01a9fb]"
                  value={purposeFilter}
                  onChange={(e) => setPurposeFilter(e.target.value as any)}
                >
                  <option value="ALL">All Purposes</option>
                  <option value="SALE">Sale Only</option>
                  <option value="RENTAL">Rental Only</option>
                  <option value="HYBRID">Hybrid (Sale & Rent)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Brand</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-[#01a9fb]"
                  value={filterBrand}
                  onChange={(e) => setFilterBrand(e.target.value)}
                >
                  <option value="ALL">All Brands</option>
                  {brands.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── View Layout: GRID VIEW (2 columns on mobile, 3 on tablet, 4-6 on desktop) ── */}
      {viewLayout === 'GRID' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3.5">
          {groupedProducts.map(product => {
            const totalStock = (product.saleStock || 0) + (product.rentalStock || 0);
            const isLow = totalStock <= (product.minStockAlert || 3) && totalStock > 0;
            const isOut = totalStock === 0;

            return (
              <div
                key={product.id}
                onClick={() => setViewProductDetails(product)}
                className="bg-white rounded-md border border-slate-200/90 p-2.5 sm:p-3 transition-all duration-200 flex flex-col justify-between group cursor-pointer hover:border-[#01a9fb]/60"
              >
                <div>
                  {/* Image Container */}
                  <div className="h-28 sm:h-32 bg-slate-50 rounded-md relative overflow-hidden flex items-center justify-center border border-slate-100 mb-2">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-contain p-1.5 group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-slate-300 group-hover:text-[#01a9fb] transition-colors">
                        <Package size={28} strokeWidth={1.5} />
                      </div>
                    )}

                    {/* Purpose Badge */}
                    <div className="absolute bottom-1 left-1">
                      <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${product.purpose === 'SALE'
                        ? 'bg-emerald-600 text-white'
                        : product.purpose === 'RENTAL'
                          ? 'bg-[#fe569f] text-white'
                          : 'bg-[#01a9fb] text-white'
                        }`}>
                        {product.purpose === 'SALE' ? 'Sale' : product.purpose === 'RENTAL' ? 'Rent' : 'Hybrid'}
                      </span>
                    </div>

                    {/* Stock Alert Badge */}
                    {isOut && (
                      <div className="absolute top-1 right-1 bg-rose-600 text-white text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">
                        Out
                      </div>
                    )}
                    {isLow && (
                      <div className="absolute top-1 right-1 bg-yellow-400 text-yellow-950 text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">
                        Low
                      </div>
                    )}
                  </div>

                  {/* Category & Sizes */}
                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    <span className="truncate">{product.category}</span>
                    <span className="bg-slate-100 px-1 py-0.2 rounded text-slate-600 font-extrabold shrink-0">
                      {product.sizes.length} {product.sizes.length === 1 ? 'Sz' : 'Szs'}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="text-xs font-black text-slate-900 truncate group-hover:text-[#01a9fb] transition-colors" title={product.name}>
                    {product.name}
                  </h4>
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5 truncate">{product.sku}</p>

                  {/* Price and Stock */}
                  <div className="flex items-baseline justify-between mt-2 pt-1.5 border-t border-slate-100">
                    <span className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                      {formatCurrency(product.sellingPrice)}
                    </span>
                    <span className={`text-[10px] sm:text-[11px] font-extrabold font-mono ${isOut ? 'text-rose-600' : isLow ? 'text-yellow-700' : 'text-slate-700'}`}>
                      {totalStock} pcs
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-1 mt-2.5 pt-1.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewProductDetails(product);
                    }}
                    className="flex-1 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-slate-600 flex items-center justify-center transition-all"
                    title="View Details"
                  >
                    <Eye size={12} strokeWidth={2.2} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setProductToEdit(product);
                      setIsProductModalOpen(true);
                    }}
                    className="flex-1 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded flex items-center justify-center transition-all"
                    title="Edit SKU"
                  >
                    <Edit2 size={12} strokeWidth={2.2} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTagClick(product);
                    }}
                    className="flex-1 py-1 bg-[#fe569f]/10 hover:bg-[#fe569f]/20 text-[#fe569f] border border-[#fe569f]/30 rounded flex items-center justify-center transition-all"
                    title="Print Price Tags"
                  >
                    <Tag size={12} strokeWidth={2.2} />
                  </button>
                  {settings?.enableDeleteInventory && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("Permanently delete this product?")) {
                          deleteProduct(product.id);
                        }
                      }}
                      className="flex-1 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded flex items-center justify-center transition-all"
                      title="Delete Product"
                    >
                      <Trash2 size={12} strokeWidth={2.2} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── View Layout: TABLE VIEW ── */
        <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  <th className="px-5 py-3.5">Product & Category</th>
                  <th className="px-4 py-3.5">SKU & Brand</th>
                  <th className="px-4 py-3.5">Sizes</th>
                  <th className="px-4 py-3.5">Stock (Sale/Rent)</th>
                  <th className="px-4 py-3.5 text-right">Price</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {groupedProducts.map(product => {
                  const totalStock = (product.saleStock || 0) + (product.rentalStock || 0);

                  return (
                    <tr
                      key={product.id}
                      onClick={() => setViewProductDetails(product)}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md bg-slate-50 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <Package size={16} className="text-slate-300" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-900 truncate max-w-[200px]">{product.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{product.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-mono font-bold text-slate-700">{product.sku}</p>
                        <p className="text-[10px] font-semibold text-slate-400">{product.brand || 'No brand'}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1 max-w-[120px]">
                          {(product.sizes || []).map(size => (
                            <span key={size} className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                              {size}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div>
                            <span className="text-[9px] font-bold uppercase text-slate-400 block">Sale</span>
                            <span className="font-extrabold text-slate-900">{product.saleStock || 0}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold uppercase text-slate-400 block">Rent</span>
                            <span className="font-extrabold text-slate-900">{product.rentalStock || 0}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="font-extrabold text-slate-900 font-mono text-sm">{formatCurrency(product.sellingPrice)}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewProductDetails(product);
                            }}
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-md border border-slate-200 transition-all"
                            title="View Details"
                          >
                            <Eye size={14} strokeWidth={2.2} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setProductToEdit(product);
                              setIsProductModalOpen(true);
                            }}
                            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md shadow-xs transition-all"
                            title="Edit SKU"
                          >
                            <Edit2 size={14} strokeWidth={2.2} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTagClick(product);
                            }}
                            className="p-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-md border border-violet-200 transition-all"
                            title="Print Label Tags"
                          >
                            <Tag size={14} strokeWidth={2.2} />
                          </button>
                          {settings?.enableDeleteInventory && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm("Permanently delete this product?")) {
                                  deleteProduct(product.id);
                                }
                              }}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md border border-rose-200 transition-all"
                              title="Delete Product"
                            >
                              <Trash2 size={14} strokeWidth={2.2} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="py-14 text-center bg-white rounded-lg border border-slate-200/80 shadow-xs">
          <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Package size={22} strokeWidth={2} />
          </div>
          <p className="text-slate-700 text-sm font-extrabold">No inventory items found</p>
          <p className="text-slate-400 text-xs mt-0.5">Try adjusting search query or clearing active filter chips</p>
        </div>
      )}

      {/* ── Modals & Drawers ── */}
      <ProductFormModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} productToEdit={productToEdit} />

      <StockEntryModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        product={products.find(p => p.id === selectedProduct) || null}
      />

      <TagPrintModal
        isOpen={!!tagPrintProduct}
        onClose={() => setTagPrintProduct(null)}
        product={tagPrintProduct}
        onOpenDesigner={(template, sizes) => {
          if (tagPrintProduct) {
            setDesignerConfig({ product: tagPrintProduct, template, sizes });
          }
        }}
      />

      {designerConfig && (
        <LabelDesigner
          labelData={{
            name: designerConfig.product.name,
            sku: designerConfig.product.sku,
            barcode: designerConfig.product.barcode || '',
            sellingPrice: designerConfig.product.sellingPrice,
            purchasePrice: designerConfig.product.purchasePrice,
            color: designerConfig.product.color || '',
            size: (designerConfig.sizes && designerConfig.sizes[0]) || (designerConfig.product.sizes && designerConfig.product.sizes[0]) || '30',
            styleCode: '',
            subCategory: designerConfig.product.subCategory || '',
            labelSize: designerConfig.template.labelWidth === 30 ? '30x50' : '50x30'
          }}
          initialTemplate={designerConfig.template}
          allProductSizes={designerConfig.sizes}
          onClose={() => setDesignerConfig(null)}
          onPrint={(template, products) => {
            generateDynamicLabelPDF(products, template);
            setDesignerConfig(null);
          }}
        />
      )}

      {/* View Product Details Modal */}
      {viewProductDetails && (
        <Modal
          isOpen={!!viewProductDetails}
          onClose={() => setViewProductDetails(null)}
          title="Product Catalog Details"
        >
          <div className="space-y-5 animate-nano max-h-[80vh] overflow-y-auto pr-1">
            <div className="flex flex-col sm:flex-row gap-5">
              {/* Product Image */}
              <div className="w-full sm:w-48 h-48 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden shrink-0 flex items-center justify-center relative">
                {viewProductDetails.imageUrl ? (
                  <img src={viewProductDetails.imageUrl} alt={viewProductDetails.name} className="w-full h-full object-contain p-2" />
                ) : (
                  <Package size={48} className="text-slate-300" />
                )}
              </div>

              {/* Core Details */}
              <div className="flex-1 space-y-3">
                <div>
                  <span className="bg-teal-50 text-teal-700 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md border border-teal-200">
                    {viewProductDetails.category}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-2">{viewProductDetails.name}</h3>
                  <p className="text-xs font-mono font-bold text-slate-400 mt-0.5">Base SKU: {viewProductDetails.sku}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gender</span>
                    <span className="font-bold text-slate-700">{viewProductDetails.gender || 'Universal'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sub Category</span>
                    <span className="font-bold text-slate-700">{viewProductDetails.subCategory || 'Standard'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Clothing Type</span>
                    <span className="font-bold text-slate-700">{viewProductDetails.clothingType || 'Standard'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Brand</span>
                    <span className="font-bold text-slate-700">{viewProductDetails.brand || 'In-House'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Financials Strip */}
            <div className="grid grid-cols-3 gap-2.5 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Selling Price</span>
                <span className="text-base font-extrabold text-slate-900 font-mono">{formatCurrency(viewProductDetails.sellingPrice)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rental Price</span>
                <span className="text-base font-extrabold text-indigo-700 font-mono">{formatCurrency(viewProductDetails.rentalPrice || 0)}/day</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Purchase Cost</span>
                <span className="text-base font-extrabold text-slate-700 font-mono">{formatCurrency(viewProductDetails.purchasePrice)}</span>
              </div>
            </div>

            {/* Size Variants & Stock breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Available Size Variants</h4>
              <div className="flex flex-wrap gap-2">
                {(viewProductDetails as any).variants?.map((v: Product) => {
                  const sizeName = v.sizes[0] || 'Std';
                  return (
                    <div key={v.id} className="bg-white border border-slate-200 rounded-md px-3 py-2 flex items-center gap-3 shadow-xs">
                      <span className="bg-slate-100 text-slate-800 text-xs font-extrabold px-2 py-0.5 rounded-md border border-slate-200">
                        {sizeName}
                      </span>
                      <div className="text-xs font-bold">
                        <span className="text-emerald-700">Sale: {v.saleStock || 0}</span>
                        <span className="text-slate-300 mx-1">•</span>
                        <span className="text-indigo-700">Rent: {v.rentalStock || 0}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setProductToEdit(viewProductDetails);
                  setViewProductDetails(null);
                  setIsProductModalOpen(true);
                }}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-extrabold uppercase tracking-wider text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Edit2 size={14} />
                <span>Edit Product</span>
              </button>
              <button
                onClick={() => {
                  handleTagClick(viewProductDetails);
                  setViewProductDetails(null);
                }}
                className="flex-1 py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-md font-extrabold uppercase tracking-wider text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Printer size={14} />
                <span>Print Tags</span>
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
                    if (el.id === 'color') {
                      const displayColor = (downloadingProduct.product.color || downloadingProduct.product.material || getEffectiveGender(downloadingProduct.product) || '').trim();
                      text += displayColor.toUpperCase();
                    }
                    if (el.id === 'style') text += '';
                    if (el.id === 'price') text += Number(downloadingProduct.product.sellingPrice || 0).toFixed(2);
                    if (el.id === 'code') text += '91' + ((downloadingProduct.product.purchasePrice || 0) * 2).toString();
                    if (el.id === 'sku') text += (downloadingProduct.product.sku || '').toUpperCase();
                    if (el.id === 'barcodeText') text = (downloadingProduct.product.barcode || downloadingProduct.product.sku || '').toUpperCase();

                    const baseFontPx = (el.fontSize || 6) * 1.3;
                    const labelWidthPxLocal = template.labelWidth * MM_TO_PX;
                    const charWidthEstimate = baseFontPx * 0.65;
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
