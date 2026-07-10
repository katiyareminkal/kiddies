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
import { generateDynamicLabelPDF, DEFAULT_TEMPLATE_30x50 } from '../utils/pdfLabel';

import { StockEntryModal } from '../components/forms/StockEntryModal';
import LabelDesigner from '../components/forms/LabelDesigner';

const Inventory: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, suppliers } = useApp();
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [viewLayout, setViewLayout] = useState<'GRID' | 'TABLE'>('GRID');
  
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [printProduct, setPrintProduct] = useState<Product | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const handleQuickPrint = (product: Product) => {
    try {
      const saved = localStorage.getItem('kiddies_label_template_30x50');
      if (saved) {
        generateDynamicLabelPDF(product, JSON.parse(saved));
        return;
      }
    } catch(e) {}
    generateDynamicLabelPDF(product, DEFAULT_TEMPLATE_30x50);
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 transition-all duration-300">
          {filteredProducts.map(product => (
            <div 
              key={product.id} 
              className="bg-white border border-slate-200/60 rounded-[24px] p-2.5 flex flex-col gap-3 group cursor-pointer hover:border-[#8B5CF6]/40 hover:shadow-xl hover:shadow-[#8B5CF6]/5 transition-all duration-300"
              onClick={() => { 
                  setProductToEdit(product); 
                  setIsProductModalOpen(true); 
              }}
            >
              {/* Product Image Container */}
              <div className="aspect-[4/5] bg-slate-50/80 rounded-[18px] relative overflow-hidden transition-all duration-500 shadow-inner group/img">
                {product.imageUrl ? (
                  <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform duration-500 ease-in-out" 
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 group-hover:text-[#8B5CF6] transition-colors duration-500">
                    <Package size={32} strokeWidth={1} />
                  </div>
                )}
                
                {/* View Details / Zoom Image Hover Overlay */}
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 pointer-events-none group-hover/img:pointer-events-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setProductToEdit(product);
                      setIsProductModalOpen(true);
                    }}
                    className="p-2.5 bg-white text-slate-900 rounded-xl shadow-lg transform translate-y-1.5 group-hover/img:translate-y-0 transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center pointer-events-auto"
                    title="View Details"
                  >
                    <Eye size={12} strokeWidth={2.5} />
                  </button>
                  {product.imageUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxImage(product.imageUrl || null);
                      }}
                      className="p-2.5 bg-white text-slate-900 rounded-xl shadow-lg transform translate-y-1.5 group-hover/img:translate-y-0 transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center pointer-events-auto"
                      title="View Full Image"
                    >
                      <ImageIcon size={12} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
                
                {/* Stock Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                  {product.saleStock <= product.minStockAlert && product.saleStock > 0 && (
                    <span className="bg-orange-500/90 backdrop-blur-sm text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shadow-sm border border-orange-400/50">Low Stock</span>
                  )}
                  {product.saleStock === 0 && (
                    <span className="bg-rose-500/90 backdrop-blur-sm text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shadow-sm border border-rose-400/50">Sold Out</span>
                  )}
                </div>
              </div>

              {/* Product Details Area */}
              <div className="flex flex-col flex-1 px-1.5 pb-1">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[8px] font-black text-[#8B5CF6] uppercase tracking-widest">{product.category}</p>
                  <span className="text-[8px] font-bold text-slate-400 tracking-wider truncate max-w-[50px]">{product.sku}</span>
                </div>
                
                <h4 className="text-[11px] md:text-sm font-black text-slate-800 tracking-tight leading-tight line-clamp-2 mb-2 group-hover:text-[#8B5CF6] transition-colors">{product.name}</h4>
                
                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Price</p>
                    <p className="text-sm font-black text-slate-900 tracking-tight">{formatCurrency(product.sellingPrice)}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end mr-2">
                       <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Stock</span>
                       <span className={`text-[11px] font-black ${product.saleStock <= product.minStockAlert ? 'text-rose-500' : 'text-slate-700'}`}>{product.saleStock}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPrintProduct(product);
                      }}
                      className="p-2 bg-slate-50 hover:bg-[#8B5CF6] text-slate-400 hover:text-white rounded-xl transition-all shadow-sm border border-slate-200 hover:border-transparent group/btn"
                      title="Design & Print Label"
                    >
                      <Tag size={12} strokeWidth={2.5} className="group-hover/btn:scale-110 transition-transform" />
                    </button>
                  </div>
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
                {filteredProducts.map(product => (
                  <tr 
                    key={product.id} 
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                    onClick={() => { 
                      setProductToEdit(product); 
                      setIsProductModalOpen(true); 
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
                            setPrintProduct(product);
                          }}
                          className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-[#8B5CF6] hover:text-white transition-all"
                          title="Design & Print Label"
                        >
                          <Tag size={10} strokeWidth={2.5} />
                        </button>
                        <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all text-slate-300">
                          <ChevronRight size={10} strokeWidth={3} />
                        </div>
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
            labelSize: '30x50'
          }}
          allProductSizes={printProduct.sizes}
          onClose={() => setPrintProduct(null)}
          onPrint={(template, products) => {
            generateDynamicLabelPDF(products, template);
            setPrintProduct(null);
          }}
        />
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
    </div>
  );
};

export default Inventory;

