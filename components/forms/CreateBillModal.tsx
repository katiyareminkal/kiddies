import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../store/AppContext';
import BarcodeScanner from '../BarcodeScanner';
import {
  Plus,
  Search,
  ShoppingBag,
  ArrowUpRight,
  CheckCircle,
  Package,
  Tag,
  X,
  ScanLine,
  Minus,
  Trash2
} from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';
import { SalesChannel, PaymentMethod, PaymentStatus, OrderStatus } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

interface CreateBillModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateBillModal: React.FC<CreateBillModalProps> = ({ isOpen, onClose }) => {
  const { products, customers, addSale } = useApp();
  const [cart, setCart] = useState<{ productId: string; quantity: number; customName?: string; customPrice?: number }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('GUEST');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENT'>('PERCENT');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [terminalTab, setTerminalTab] = useState<'PRODUCTS' | 'BASKET'>('PRODUCTS');

  // Custom/Manual Item states
  const [isCustomFormOpen, setIsCustomFormOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');

  const categories = useMemo(() => Array.from(new Set(products.filter(p => p.purpose === 'SALE' || p.purpose === 'HYBRID').map(p => p.category))), [products]);

  const cartItems = useMemo(() => {
    return cart.map(item => {
      if (item.productId.startsWith('CUSTOM_')) {
        return {
          ...item,
          product: {
            id: item.productId,
            name: item.customName || 'Custom Item',
            sellingPrice: item.customPrice || 0,
            imageUrl: '',
            sku: 'CUSTOM',
            barcode: '',
            category: 'CUSTOM',
            sizes: [],
            purchasePrice: 0,
            rentalPrice: 0,
            taxPercent: 5,
            saleStock: 9999,
            rentalStock: 0,
            purpose: 'SALE' as const,
            minStockAlert: 0,
            supplierId: '',
            description: '',
            createdAt: new Date().toISOString()
          }
        };
      }
      const product = products.find(p => p.id === item.productId);
      return { ...item, product };
    }).filter(item => item.product);
  }, [cart, products]);

  const subtotal = cartItems.reduce((acc, item) => acc + (item.product?.sellingPrice || 0) * item.quantity, 0);

  const discountAmount = useMemo(() => {
    if (discountType === 'PERCENT') {
      return subtotal * (discountValue / 100);
    }
    return Math.min(discountValue, subtotal);
  }, [subtotal, discountType, discountValue]);

  const tax = (subtotal - discountAmount) * 0.05;
  const total = (subtotal - discountAmount) + tax;

  const addToCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === productId);
      if (existing) {
        return prev.map(item => item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === productId);
      if (existing && existing.quantity > 1) {
        return prev.map(item => item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item);
      }
      return prev;
    });
  };

  const deleteFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;

    try {
      await addSale({
        channel: SalesChannel.IN_STORE,
        customerId: selectedCustomerId,
        items: cartItems.map(item => ({
          productId: item.productId,
          name: item.product!.name,
          quantity: item.quantity,
          unitPrice: item.product!.sellingPrice,
          taxAmount: item.product!.sellingPrice * 0.05,
          total: item.product!.sellingPrice * item.quantity * 1.05
        })),
        totalAmount: total,
        marketplaceFees: 0,
        taxTotal: tax,
        discount: discountAmount,
        paidAmount: total,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: PaymentMethod.CASH,
        orderStatus: OrderStatus.COMPLETED,
      });

      setCart([]);
      setSuccessMessage('Transaction completed successfully!');
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to add sale:', error);
      alert('Failed to complete sale. Please try again.');
    }
  };

  const filteredProducts = products.filter(p =>
    (p.purpose === 'SALE' || p.purpose === 'HYBRID') &&
    (selectedCategory === 'ALL' || p.category === selectedCategory) &&
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleBarcodeScan = (decodedText: string) => {
    setIsScannerOpen(false);
    const product = products.find(p => p.sku === decodedText);
    if (product) {
      if (product.purpose === 'SALE' || product.purpose === 'HYBRID') {
        addToCart(product.id);
      } else {
        alert('Product not available for sale');
      }
    } else {
      alert('Product not found');
    }
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName || !customPrice) return;
    
    const priceNum = Number(customPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert('Please enter a valid price');
      return;
    }

    const uniqueId = `CUSTOM_${Date.now()}`;
    setCart(prev => [...prev, { productId: uniqueId, quantity: 1, customName, customPrice: priceNum }]);
    
    setCustomName('');
    setCustomPrice('');
    setIsCustomFormOpen(false);
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="checkout-terminal-container"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            background: '#F8FAFC',
            display: 'flex',
            flexDirection: 'column',
            padding: '12px',
            paddingBottom: '12px'
          }}
        >
          {/* Success Feedback Overlay */}
          {successMessage && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', padding: '24px' }}>
              <div className="bg-white rounded-[2rem] p-8 text-center shadow-2xl animate-nano" style={{ maxWidth: '360px', width: '100%' }}>
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Success!</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{successMessage}</p>
              </div>
            </div>
          )}

          {isScannerOpen && (
            <BarcodeScanner
              onScanSuccess={handleBarcodeScan}
              onClose={() => setIsScannerOpen(false)}
            />
          )}

          {/* Terminal Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', flexShrink: 0, gap: '12px', flexWrap: 'wrap' }}>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="p-2 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-colors shadow-sm"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">Checkout Terminal</h1>
                <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Quick Sale Entry</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white p-2 border border-slate-100 shadow-sm rounded-2xl">
              <div className="flex flex-col items-end">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Customer</span>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="bg-transparent text-[9px] font-bold text-slate-900 border-none outline-none cursor-pointer focus:ring-0 text-right p-0"
                >
                  <option value="GUEST">Walk-in (Guest)</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center font-black text-highlight text-[10px] shrink-0">
                {selectedCustomerId === 'GUEST' ? 'W' : customers.find(c => c.id === selectedCustomerId)?.name.charAt(0)}
              </div>
            </div>
          </div>

          {/* Cart Preview Row at Top */}
          {cartItems.length > 0 && (
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                background: 'white', 
                padding: '8px 12px', 
                border: '1px solid #E2E8F0', 
                borderRadius: '1rem', 
                marginBottom: '8px', 
                flexShrink: 0,
                overflowX: 'auto'
              }}
              className="hide-scrollbar"
            >
              <span style={{ fontSize: '8px', fontWeight: 900, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>Basket:</span>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }} className="hide-scrollbar">
                {cartItems.map(item => (
                  <div key={item.productId} style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #F1F5F9', background: '#F8FAFC' }}>
                      {item.product?.imageUrl ? (
                        <img src={item.product.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Package size={12} className="text-slate-300" />
                        </div>
                      )}
                    </div>
                    <span 
                      onClick={() => removeFromCart(item.productId)}
                      title="Click to decrement"
                      style={{ 
                        position: 'absolute', 
                        top: '-6px', 
                        right: '-6px', 
                        background: '#8B5CF6', 
                        color: 'white', 
                        fontFamily: 'monospace', 
                        fontSize: '8px', 
                        fontWeight: 900, 
                        width: '16px', 
                        height: '16px', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        border: '1px solid white',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        cursor: 'pointer'
                      }}
                    >
                      {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mobile Tab Switcher */}
          <div className="flex lg:hidden bg-white p-1 rounded-2xl border border-slate-100 shadow-sm mb-2 gap-1" style={{ flexShrink: 0 }}>
            <button
              onClick={() => setTerminalTab('PRODUCTS')}
              type="button"
              className={`flex-1 py-2.5 text-center rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${terminalTab === 'PRODUCTS' ? 'bg-highlight text-slate-900 shadow-sm' : 'text-slate-400 font-bold'}`}
            >
              Products
            </button>
            <button
              onClick={() => setTerminalTab('BASKET')}
              type="button"
              className={`flex-1 py-2.5 text-center rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${terminalTab === 'BASKET' ? 'bg-highlight text-slate-900 shadow-sm' : 'text-slate-400 font-bold'}`}
            >
              Basket
              {cartItems.length > 0 && (
                <span className="bg-slate-900 text-highlight font-mono text-[8px] font-black px-1.5 py-0.5 rounded-lg leading-none">
                  {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>

          {/* Main Content Area */}
          <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {/* Product Selection Column */}
            <div className={`${terminalTab === 'PRODUCTS' ? 'flex' : 'hidden lg:flex'}`} style={{ flex: 3, flexDirection: 'column', gap: '10px', minWidth: 0, minHeight: 0 }}>
              {/* Search & Categories */}
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="flex gap-2">
                  <div className="relative group flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors" size={14} strokeWidth={2.5} />
                    <input
                      type="text"
                      placeholder="Search name or SKU..."
                      className="w-full bg-white border border-slate-100 rounded-2xl py-3 pl-12 pr-4 text-[10px] font-bold uppercase tracking-widest outline-none focus:border-highlight/30 transition-all shadow-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="bg-slate-900 text-white px-4 py-3 rounded-2xl font-black text-[10px] shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all shrink-0 flex items-center justify-center group"
                  >
                    <ScanLine size={18} className="group-hover:scale-110 transition-transform" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCustomFormOpen(true)}
                    className="bg-white border border-slate-100 hover:border-slate-200 text-slate-900 px-4 py-3 rounded-2xl font-black text-[10px] shadow-sm transition-all shrink-0 flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} strokeWidth={3} />
                    <span className="hidden sm:inline">Manual Item</span>
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                  <button
                    onClick={() => setSelectedCategory('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border shadow-sm ${selectedCategory === 'ALL' ? 'bg-highlight text-slate-900 border-highlight/20' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200 hover:text-slate-600'}`}
                  >
                    All
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border shadow-sm ${selectedCategory === cat ? 'bg-highlight text-slate-900 border-highlight/20' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200 hover:text-slate-600'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Grid */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px', alignContent: 'start', paddingBottom: '4px', paddingRight: '4px' }} className="hide-scrollbar">
                {filteredProducts.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: 'white', borderRadius: '1.5rem', border: '1px border-slate-100', textAlign: 'center' }}>
                    <Package size={32} className="text-slate-200 mb-2" />
                    <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wider">No matching products found</h4>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 mb-4">Would you like to add a manual custom item instead?</p>
                    <button
                      type="button"
                      onClick={() => setIsCustomFormOpen(true)}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
                    >
                      Add Manual Item
                    </button>
                  </div>
                ) : filteredProducts.map(product => {
                  const cartItem = cart.find(item => item.productId === product.id);
                  return (
                    <div
                      key={product.id}
                      className={`nano-card p-2 flex flex-col gap-1.5 group cursor-pointer transition-all duration-300 relative ${cartItem ? 'bg-highlight/5' : 'bg-white'}`}
                      onClick={() => addToCart(product.id)}
                    >
                      <div className={`aspect-square bg-slate-50 rounded-xl overflow-hidden shrink-0 group-hover:scale-105 transition-all duration-500 relative ${cartItem ? 'border-2 border-highlight shadow-lg shadow-highlight/20 scale-105' : 'border border-slate-100'}`}>
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-200">
                            <Package size={20} strokeWidth={1} />
                          </div>
                        )}
                        {cartItem && (
                          <div className="absolute top-1 left-1 bg-highlight text-slate-900 text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-md border border-white/50">
                            x{cartItem.quantity}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 px-0.5">
                        <h4 className="text-[8px] font-black text-slate-900 uppercase tracking-tight truncate group-hover:text-highlight transition-colors">{product.name}</h4>
                        <p className="text-[9px] font-black text-slate-900 font-mono mt-0.5">{formatCurrency(product.sellingPrice)}</p>
                      </div>
                      {cartItem && (
                        <div className="absolute top-1 right-1 z-10" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => removeFromCart(product.id)}
                            className="w-5 h-5 flex items-center justify-center bg-rose-500 text-white rounded-md shadow-lg active:scale-90 transition-all"
                          >
                            <X size={10} strokeWidth={3} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Floating review bar on mobile */}
              {terminalTab === 'PRODUCTS' && cartItems.length > 0 && (
                <div className="lg:hidden" style={{ flexShrink: 0, paddingTop: '4px' }}>
                  <button
                    onClick={() => setTerminalTab('BASKET')}
                    type="button"
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-2xl p-3 shadow-2xl flex items-center justify-between hover:bg-slate-800 active:scale-[0.98] transition-all text-xs font-black uppercase tracking-wider"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-lg bg-highlight text-slate-900 flex items-center justify-center text-[10px] font-black leading-none">
                        {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                      </span>
                      <span>Review Basket</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-highlight font-mono font-black">{formatCurrency(total)}</span>
                      <ArrowUpRight size={14} strokeWidth={3} className="text-highlight" />
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Cart/Basket Column */}
            <div className={`${terminalTab === 'BASKET' ? 'flex' : 'hidden lg:flex'}`} style={{ flex: 1.5, minWidth: '300px', display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '1.5rem', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              {/* Basket Header */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #F8FAFC', flexShrink: 0 }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <ShoppingBag size={14} className="text-highlight" /> Basket
                  </h3>
                  <span className="text-[8px] font-black bg-slate-50 text-slate-400 px-2 py-0.5 rounded-md uppercase">{cartItems.length} items</span>
                </div>
              </div>

              {/* Cart Items */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }} className="hide-scrollbar">
                {cartItems.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.4, padding: '24px' }}>
                    <ShoppingBag size={24} strokeWidth={1} className="text-slate-300 mb-2" />
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Empty basket</p>
                    <p className="text-[8px] font-medium text-slate-400 uppercase tracking-widest text-center">Tap products to add</p>
                  </div>
                ) : (
                  cartItems.map(item => (
                    <div key={item.productId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'white', borderRadius: '12px', border: '1px solid #F1F5F9' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #F1F5F9', flexShrink: 0, background: '#F8FAFC' }}>
                        {item.product?.imageUrl ? (
                          <img src={item.product.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Package size={14} className="text-slate-200" />
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 className="text-[9px] font-black text-slate-900 uppercase truncate leading-tight">{item.product?.name}</h4>
                        <p className="text-[8px] font-bold text-slate-400 font-mono mt-0.5">{formatCurrency(item.product?.sellingPrice || 0)}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: '#F8FAFC', borderRadius: '8px', padding: '2px', border: '1px solid #F1F5F9', flexShrink: 0 }}>
                        <button onClick={() => removeFromCart(item.productId)} disabled={item.quantity <= 1} className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 disabled:opacity-30 transition-all shadow-sm">
                          <Minus size={10} strokeWidth={3} />
                        </button>
                        <span className="text-[10px] font-black text-slate-900 w-6 text-center font-mono">{item.quantity}</span>
                        <button onClick={() => addToCart(item.productId)} className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-highlight transition-all shadow-sm">
                          <Plus size={10} strokeWidth={3} />
                        </button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <span className="text-[10px] font-black text-slate-900 font-mono">{formatCurrency((item.product?.sellingPrice || 0) * item.quantity)}</span>
                        <button onClick={() => deleteFromCart(item.productId)} className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500 hover:bg-rose-100 transition-colors">
                          <Trash2 size={10} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div style={{ flexShrink: 0, padding: '10px 14px', borderTop: '1px solid #F1F5F9', background: '#FAFBFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 shrink-0">
                    <Tag size={9} className="text-[#8B5CF6]" /> Discount
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      value={discountValue || ''}
                      onChange={(e) => setDiscountValue(Math.max(0, Number(e.target.value)))}
                      placeholder="0"
                      style={{ width: '60px', background: '#F1F5F9', border: '1px solid #E2E8F0', padding: '3px 8px', borderRadius: '6px', fontSize: '9px', fontWeight: 800, outline: 'none', textAlign: 'right', fontFamily: 'monospace' }}
                    />
                    <div style={{ display: 'flex', background: '#E2E8F0', padding: '1px', borderRadius: '6px' }}>
                      <button
                        onClick={() => setDiscountType('PERCENT')}
                        style={{ padding: '2px 6px', borderRadius: '5px', fontSize: '7px', fontWeight: 900, background: discountType === 'PERCENT' ? '#1E293B' : 'transparent', color: discountType === 'PERCENT' ? 'white' : '#94A3B8', border: 'none', cursor: 'pointer' }}
                      >%</button>
                      <button
                        onClick={() => setDiscountType('FIXED')}
                        style={{ padding: '2px 6px', borderRadius: '5px', fontSize: '7px', fontWeight: 900, background: discountType === 'FIXED' ? '#1E293B' : 'transparent', color: discountType === 'FIXED' ? 'white' : '#94A3B8', border: 'none', cursor: 'pointer' }}
                      >₹</button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                    <span>Subtotal</span>
                    <span className="font-mono font-black" style={{ color: '#1E293B' }}>{formatCurrency(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#F43F5E' }}>
                      <span>Discount</span>
                      <span className="font-mono font-black">-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                    <span>GST (5%)</span>
                    <span className="font-mono font-black" style={{ color: '#1E293B' }}>{formatCurrency(tax)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px dashed #E2E8F0', marginTop: '6px', paddingTop: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 900, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total</span>
                  <span style={{ fontSize: '20px', fontWeight: 900, color: '#8B5CF6', fontFamily: 'monospace', letterSpacing: '-0.02em', lineHeight: 1 }}>{formatCurrency(total)}</span>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button
                    onClick={() => { setCart([]); onClose(); }}
                    style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid #E2E8F0', color: '#94A3B8', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={handleCheckout}
                    disabled={cartItems.length === 0}
                    style={{ flex: 1, height: '40px', background: cartItems.length === 0 ? '#94A3B8' : '#1E293B', color: 'white', borderRadius: '12px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', border: 'none', cursor: cartItems.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: cartItems.length === 0 ? 0.5 : 1 }}
                  >
                    <CheckCircle size={14} strokeWidth={2.5} /> Pay Now
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* Custom / Manual Item Dialog */}
          {isCustomFormOpen && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', padding: '24px' }}>
              <div className="bg-white rounded-[2rem] p-6 shadow-2xl animate-nano text-left" style={{ maxWidth: '360px', width: '100%' }}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Add Manual Item</h3>
                  <button type="button" onClick={() => setIsCustomFormOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                    <X size={16} />
                  </button>
                </div>
                <form onSubmit={handleAddCustomItem} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Item Name</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Custom Toys / Repairs" 
                      value={customName}
                      onChange={e => setCustomName(e.target.value)}
                      className="w-full bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest outline-none transition-all text-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Price (₹)</label>
                    <input 
                      type="number" 
                      required 
                      placeholder="0.00" 
                      value={customPrice}
                      onChange={e => setCustomPrice(e.target.value)}
                      className="w-full bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl p-3 text-[10px] font-bold outline-none transition-all text-slate-900"
                    />
                  </div>
                  <button
                    type="submit"
                    className="banana-btn w-full py-3 text-[9px]"
                  >
                    Add to Cart
                  </button>
                </form>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
