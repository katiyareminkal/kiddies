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
  Trash2,
  CreditCard,
  Wallet,
  Smartphone,
  Landmark,
  UserPlus,
  LayoutGrid,
  List
} from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';
import { SalesChannel, PaymentMethod, PaymentStatus, OrderStatus } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

interface CreateBillModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateBillModal: React.FC<CreateBillModalProps> = ({ isOpen, onClose }) => {
  const { products, customers, addSale, addProduct, addCustomer, creditNotes, consumeStoreCredit, sales, settings } = useApp();
  const [cart, setCart] = useState<{ productId: string; quantity: number; customName?: string; customPrice?: number; isCustomPrice?: boolean }[]>([]);
  const [useCredit, setUseCredit] = useState(false);
  const [creditAmountInput, setCreditAmountInput] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('GUEST');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENT'>('PERCENT');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [terminalTab, setTerminalTab] = useState<'PRODUCTS' | 'BASKET'>('PRODUCTS');
  const [transactionDate, setTransactionDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Payment method & Partial payment state
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [isPartialPayment, setIsPartialPayment] = useState<boolean>(false);
  const [partialPaidAmountInput, setPartialPaidAmountInput] = useState<string>('');

  // Add New Customer inline form state
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Product catalog view mode
  const [productViewMode, setProductViewMode] = useState<'grid' | 'list'>('grid');

  // Custom/Manual Item states
  const [isCustomFormOpen, setIsCustomFormOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customPurchasePrice, setCustomPurchasePrice] = useState('');
  const [customDiscountValue, setCustomDiscountValue] = useState('');
  const [customDiscountType, setCustomDiscountType] = useState<'PERCENT' | 'FIXED'>('FIXED');
  const [saveToInventory, setSaveToInventory] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCustomProductId, setSelectedCustomProductId] = useState<string | null>(null);
  const [includeGst, setIncludeGst] = useState(true);

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
      if (product && item.isCustomPrice && item.customPrice !== undefined) {
        return {
          ...item,
          product: {
            ...product,
            sellingPrice: item.customPrice
          }
        };
      }
      
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

  const tax = includeGst ? (subtotal - discountAmount) * 0.05 : 0;
  const total = (subtotal - discountAmount) + tax;

  const customerCredit = useMemo(() => {
    if (selectedCustomerId === 'GUEST') return 0;
    return creditNotes
      .filter(cn => cn.customerId === selectedCustomerId && cn.status?.toUpperCase() === 'ACTIVE')
      .reduce((sum, cn) => sum + cn.amount, 0);
  }, [creditNotes, selectedCustomerId]);

  const maxCreditAllowed = Math.min(customerCredit, total);
  
  const creditApplied = useMemo(() => {
    if (!useCredit || selectedCustomerId === 'GUEST') return 0;
    const num = Number(creditAmountInput);
    if (isNaN(num) || num <= 0) return 0;
    return Math.min(num, maxCreditAllowed);
  }, [useCredit, creditAmountInput, maxCreditAllowed, selectedCustomerId]);

  React.useEffect(() => {
    if (useCredit) {
      setCreditAmountInput(maxCreditAllowed.toString());
    } else {
      setCreditAmountInput('');
    }
  }, [useCredit]);

  // Auto-reset all values when basket becomes empty
  React.useEffect(() => {
    if (cart.length === 0) {
      setDiscountValue(0);
      setDiscountType('PERCENT');
      setUseCredit(false);
      setCreditAmountInput('');
      setIsPartialPayment(false);
      setPartialPaidAmountInput('');
      setSelectedPaymentMethod(PaymentMethod.CASH);
      setIncludeGst(true);
    }
  }, [cart.length]);

  const finalAmountToPay = total - creditApplied;

  const actualPaidAmount = useMemo(() => {
    if (!isPartialPayment) return finalAmountToPay;
    const parsed = parseFloat(partialPaidAmountInput);
    if (isNaN(parsed) || parsed < 0) return 0;
    return Math.min(parsed, finalAmountToPay);
  }, [isPartialPayment, partialPaidAmountInput, finalAmountToPay]);

  const remainingDue = Math.max(0, finalAmountToPay - actualPaidAmount);

  const paymentStatusToSave = useMemo(() => {
    if (actualPaidAmount >= finalAmountToPay) return PaymentStatus.PAID;
    if (actualPaidAmount > 0) return PaymentStatus.PARTIAL;
    return PaymentStatus.UNPAID;
  }, [actualPaidAmount, finalAmountToPay]);

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
      const newSale = await addSale({
        channel: SalesChannel.IN_STORE,
        customerId: selectedCustomerId,
        items: cartItems.map(item => ({
          productId: item.productId,
          name: item.product!.name,
          quantity: item.quantity,
          unitPrice: item.product!.sellingPrice,
          taxAmount: includeGst ? item.product!.sellingPrice * 0.05 : 0,
          total: item.product!.sellingPrice * item.quantity * (includeGst ? 1.05 : 1)
        })),
        totalAmount: total,
        marketplaceFees: 0,
        taxTotal: tax,
        discount: discountAmount,
        paidAmount: actualPaidAmount,
        paymentStatus: paymentStatusToSave,
        paymentMethod: selectedPaymentMethod,
        date: new Date(transactionDate + 'T12:00:00').toISOString(),
        orderStatus: OrderStatus.COMPLETED,
      });

      // Consume store credit notes if applied
      if (creditApplied > 0 && newSale) {
        await consumeStoreCredit(selectedCustomerId, creditApplied, newSale.invoiceNumber);
      }

      setCart([]);
      setUseCredit(false);
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

  const filteredProducts = products.filter(p => {
    const isForSale = p.purpose === 'SALE' || p.purpose === 'HYBRID';
    const matchesCategoryTab = selectedCategory === 'ALL' || p.category === selectedCategory;
    
    if (!isForSale || !matchesCategoryTab) return false;
    if (!searchTerm.trim()) return true;
    
    const term = searchTerm.toLowerCase().trim();
    const matchesWordStart = (text: string) => {
      return text.toLowerCase().split(/[\s_-]+/).some(word => word.startsWith(term));
    };

    return (
      matchesWordStart(p.name) ||
      matchesWordStart(p.sku) ||
      (p.barcode && p.barcode.toLowerCase().startsWith(term)) ||
      matchesWordStart(p.category) ||
      (p.brand && matchesWordStart(p.brand)) ||
      String(p.sellingPrice).startsWith(term)
    );
  });

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

  const handleAddCustomItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName || !customPrice) return;
    
    const priceNum = Number(customPrice);
    const purchasePriceNum = customPurchasePrice ? Number(customPurchasePrice) : 0;
    const discountNum = customDiscountValue ? Number(customDiscountValue) : 0;
    
    if (isNaN(priceNum) || priceNum <= 0 || isNaN(purchasePriceNum) || isNaN(discountNum)) {
      alert('Please enter valid numeric prices (Sale Price must be > 0)');
      return;
    }

    let finalSalePrice = priceNum;
    if (discountNum > 0) {
      if (customDiscountType === 'PERCENT') {
        finalSalePrice = priceNum - (priceNum * (discountNum / 100));
      } else {
        finalSalePrice = priceNum - discountNum;
      }
      finalSalePrice = Math.max(0, finalSalePrice);
    }

    if (saveToInventory && !selectedCustomProductId) {
      try {
        await addProduct({
          name: customName,
          sku: `MANUAL-${Date.now().toString().slice(-6)}`,
          barcode: '',
          category: 'CUSTOM',
          brand: '',
          color: '',
          material: '',
          sizes: [],
          purchasePrice: purchasePriceNum,
          sellingPrice: finalSalePrice,
          rentalPrice: 0,
          taxPercent: 5,
          saleStock: 0,
          rentalStock: 0,
          purpose: 'SALE',
          minStockAlert: 0,
          supplierId: '',
          description: 'Added directly from Checkout Terminal',
          imageUrl: ''
        });
      } catch (err) {
        console.error("Failed to save to inventory:", err);
      }
    }

    const uniqueId = selectedCustomProductId || `CUSTOM_${Date.now()}`;
    
    setCart(prev => {
      const existing = prev.find(item => item.productId === uniqueId && item.customPrice === finalSalePrice);
      if (existing) {
        return prev.map(item => item.productId === uniqueId && item.customPrice === finalSalePrice ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { 
        productId: uniqueId, 
        quantity: 1, 
        customName, 
        customPrice: finalSalePrice,
        isCustomPrice: true 
      }];
    });
    
    setCustomName('');
    setCustomPrice('');
    setCustomPurchasePrice('');
    setCustomDiscountValue('');
    setCustomDiscountType('FIXED');
    setSaveToInventory(false);
    setSelectedCustomProductId(null);
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
          className="fixed inset-0 z-[99] md:left-64 md:top-16 bg-[#F8FAFC] flex flex-col p-1 sm:p-3"
        >
          {/* Success Feedback Overlay */}
          {successMessage && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', padding: '24px' }}>
              <div className="bg-white rounded-lg p-8 text-center shadow-2xl animate-nano" style={{ maxWidth: '360px', width: '100%' }}>
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 uppercase tracking-tight">Success!</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{successMessage}</p>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 gap-2.5 shrink-0 border-b border-slate-100">
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 bg-white border border-slate-200/80 hover:border-slate-300 rounded-md text-slate-500 hover:text-slate-900 transition-colors shadow-xs"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
                <div>
                  <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none">Checkout Terminal</h1>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Quick Sale Entry</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white p-1.5 sm:p-2 border border-slate-200/80 shadow-xs rounded-md justify-between sm:justify-end">
              {/* Sale Date Box */}
              <div className="flex flex-col items-start pr-2.5 border-r border-slate-200/70">
                <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider whitespace-nowrap">Sale Date</span>
                <input 
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="bg-transparent text-[11px] sm:text-xs font-black text-slate-900 border-none outline-none cursor-pointer focus:ring-0 p-0 min-w-[115px] sm:min-w-[125px]"
                />
              </div>
              
              {/* Customer Box */}
              <div className="flex flex-col items-end pl-1 min-w-0 flex-1 sm:flex-initial">
                <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider whitespace-nowrap">Customer</span>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    if (e.target.value === '__ADD_NEW__') {
                      setIsAddingCustomer(true);
                    } else {
                      setSelectedCustomerId(e.target.value);
                    }
                  }}
                  className="bg-transparent text-[11px] sm:text-xs font-black text-slate-900 border-none outline-none cursor-pointer focus:ring-0 text-right p-0 max-w-[130px] sm:max-w-[180px] truncate"
                >
                  <option value="GUEST">Walk-in (Guest)</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                  <option value="__ADD_NEW__">➕ Add New</option>
                </select>
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-[#01a9fb] flex items-center justify-center font-black text-white text-[10px] sm:text-xs shrink-0 shadow-xs">
                {selectedCustomerId === 'GUEST' ? 'W' : (customers.find(c => c.id === selectedCustomerId)?.name.charAt(0) || 'C').toUpperCase()}
              </div>
            </div>
          </div>

            {/* Inline Add New Customer Form */}
            {isAddingCustomer && (
              <div className="mx-3 mb-2 p-3 bg-[#01a9fb]/5 border border-[#01a9fb]/20 rounded-md space-y-2 animate-nano">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-bold uppercase text-[#01a9fb] tracking-widest flex items-center gap-1">
                    <UserPlus size={12} className="text-[#01a9fb]" /> Add New Customer
                  </p>
                  <button type="button" onClick={() => setIsAddingCustomer(false)} className="p-0.5 text-gray-400 hover:text-gray-600">
                    <X size={12} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Name *"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-[10px] font-bold text-gray-900 outline-none focus:border-[#01a9fb] placeholder:text-gray-300"
                  />
                  <input
                    type="tel"
                    placeholder="Phone *"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-[10px] font-bold text-gray-900 outline-none focus:border-[#01a9fb] placeholder:text-gray-300"
                  />
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    className="bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-[10px] font-bold text-gray-900 outline-none focus:border-[#01a9fb] placeholder:text-gray-300"
                  />
                  <input
                    type="text"
                    placeholder="Address (optional)"
                    value={newCustAddress}
                    onChange={(e) => setNewCustAddress(e.target.value)}
                    className="bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-[10px] font-bold text-gray-900 outline-none focus:border-[#01a9fb] placeholder:text-gray-300"
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!newCustName.trim() || !newCustPhone.trim()) {
                      return alert('Name and Phone are required');
                    }
                    try {
                      const newId = await addCustomer({
                        name: newCustName.trim(),
                        phone: newCustPhone.trim(),
                        email: newCustEmail.trim(),
                        address: newCustAddress.trim(),
                      });
                      if (newId) {
                        setSelectedCustomerId(newId);
                      }
                      setNewCustName('');
                      setNewCustPhone('');
                      setNewCustEmail('');
                      setNewCustAddress('');
                      setIsAddingCustomer(false);
                    } catch (err) {
                      alert('Failed to add customer');
                    }
                  }}
                  className="w-full py-1.5 bg-[#01a9fb] text-white rounded-md text-[9px] font-bold uppercase tracking-wider hover:bg-[#0098e6] transition-colors flex items-center justify-center gap-1 shadow-xs"
                >
                  <UserPlus size={11} /> Save & Select Customer
                </button>
              </div>
            )}

          {/* Mobile Tab Switcher */}
          <div className="flex lg:hidden bg-slate-100 p-1 rounded-md border border-slate-200/70 mb-2 gap-1" style={{ flexShrink: 0 }}>
            <button
              onClick={() => setTerminalTab('PRODUCTS')}
              type="button"
              className={`flex-1 py-2 text-center rounded text-[10px] font-extrabold uppercase tracking-wider transition-all ${terminalTab === 'PRODUCTS' ? 'bg-[#01a9fb] text-white shadow-xs' : 'text-slate-500 font-bold'}`}
            >
              Products
            </button>
            <button
              onClick={() => setTerminalTab('BASKET')}
              type="button"
              className={`flex-1 py-2 text-center rounded text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${terminalTab === 'BASKET' ? 'bg-[#01a9fb] text-white shadow-xs' : 'text-slate-500 font-bold'}`}
            >
              Basket
              {cartItems.length > 0 && (
                <span className="bg-white text-[#01a9fb] font-mono text-[9px] font-extrabold px-1.5 py-0.2 rounded leading-none">
                  {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>

          {/* Main Content Area */}
          <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {/* Product Selection Column */}
            <div className={`${terminalTab === 'PRODUCTS' ? 'flex' : 'hidden lg:flex'} flex-col gap-2.5`} style={{ flex: 2.5, minWidth: 0, minHeight: 0 }}>
              {/* Search & Categories */}
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="flex gap-2">
                  <div className="relative group flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#01a9fb] transition-colors" size={14} strokeWidth={2.2} />
                    <input
                      type="text"
                      placeholder="Search name or SKU..."
                      className="w-full bg-white border border-slate-200/80 rounded-md py-2.5 pl-10 pr-3 text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#01a9fb] transition-all shadow-xs"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex bg-white border border-slate-200/80 rounded-md p-0.5 shadow-xs shrink-0">
                    <button
                      type="button"
                      onClick={() => setProductViewMode('grid')}
                      className={`w-7 h-7 rounded flex items-center justify-center transition-all ${productViewMode === 'grid' ? 'bg-[#01a9fb] text-white' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <LayoutGrid size={13} strokeWidth={2.2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductViewMode('list')}
                      className={`w-7 h-7 rounded flex items-center justify-center transition-all ${productViewMode === 'list' ? 'bg-[#01a9fb] text-white' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <List size={13} strokeWidth={2.2} />
                    </button>
                  </div>
                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="bg-slate-900 text-white px-3.5 py-2.5 rounded-md font-extrabold text-xs hover:bg-slate-800 transition-all shrink-0 flex items-center justify-center group"
                  >
                    <ScanLine size={16} className="group-hover:scale-110 transition-transform" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCustomFormOpen(true)}
                    className="bg-white border border-slate-200/80 hover:border-[#01a9fb] text-slate-900 px-3 py-2.5 rounded-md font-extrabold text-xs shadow-xs transition-all shrink-0 flex items-center justify-center gap-1"
                  >
                    <Plus size={13} strokeWidth={2.5} />
                    <span className="hidden sm:inline">Manual</span>
                  </button>
                </div>
              </div>

              {/* Product Grid / List View */}
              <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '4px', paddingRight: '4px' }} className="hide-scrollbar">
                {filteredProducts.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: 'white', borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                    <Package size={28} className="text-slate-300 mb-2" />
                    <h4 className="text-xs font-extrabold text-slate-800">No matching products found</h4>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5 mb-3">Add a custom manual item to checkout</p>
                    <button
                      type="button"
                      onClick={() => setIsCustomFormOpen(true)}
                      className="bg-[#01a9fb] hover:bg-[#0098e6] text-white text-[10px] font-extrabold uppercase tracking-wider px-3.5 py-2 rounded-md transition-all shadow-xs active:scale-95"
                    >
                      + Add Manual Item
                    </button>
                  </div>
                ) : productViewMode === 'grid' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px', alignContent: 'start' }}>
                    {filteredProducts.map(product => {
                      const cartItem = cart.find(item => item.productId === product.id);
                      return (
                        <div
                          key={product.id}
                          className={`p-2 rounded-md border flex flex-col justify-between group cursor-pointer transition-all relative ${cartItem ? 'bg-[#01a9fb]/5 border-[#01a9fb]' : 'bg-white border-slate-200/80 hover:border-[#01a9fb]/50'}`}
                          onClick={() => addToCart(product.id)}
                        >
                          <div className="aspect-square bg-slate-50 rounded overflow-hidden shrink-0 relative border border-slate-100">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <Package size={18} strokeWidth={1.5} />
                              </div>
                            )}
                            {cartItem && (
                              <div className="absolute top-1 left-1 bg-[#01a9fb] text-white text-[9px] font-black px-1.5 py-0.2 rounded leading-none">
                                x{cartItem.quantity}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 mt-1.5">
                            <h4 className="text-[10px] font-extrabold text-slate-900 truncate leading-tight group-hover:text-[#01a9fb] transition-colors">{product.name}</h4>
                            <p className="text-[11px] font-black text-slate-900 font-mono mt-0.5">{formatCurrency(product.sellingPrice)}</p>
                          </div>
                          {cartItem && (
                            <div className="absolute top-1 right-1 z-10" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => removeFromCart(product.id)}
                                className="w-4 h-4 flex items-center justify-center bg-rose-500 text-white rounded shadow-xs active:scale-90 transition-all"
                              >
                                <X size={9} strokeWidth={3} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* List View */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {filteredProducts.map(product => {
                      const cartItem = cart.find(item => item.productId === product.id);
                      return (
                        <div
                          key={product.id}
                          className={`flex items-center gap-2.5 p-2 rounded-md cursor-pointer transition-all group ${cartItem ? 'bg-[#01a9fb]/5 border border-[#01a9fb]' : 'bg-white border border-slate-200/80 hover:border-[#01a9fb]/50'}`}
                          onClick={() => addToCart(product.id)}
                        >
                          <div className="w-8 h-8 rounded overflow-hidden shrink-0 border border-slate-100 bg-slate-50">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <Package size={14} strokeWidth={1.5} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[10px] font-extrabold text-slate-900 truncate leading-tight group-hover:text-[#01a9fb] transition-colors">{product.name}</h4>
                            <p className="text-[9px] font-bold text-slate-400 mt-0.5">{product.sku || product.category}</p>
                          </div>
                          <p className="text-[11px] font-black text-slate-900 font-mono shrink-0">{formatCurrency(product.sellingPrice)}</p>
                          {cartItem ? (
                            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => removeFromCart(product.id)} className="w-5 h-5 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-900 transition-all">
                                <Minus size={9} strokeWidth={3} />
                              </button>
                              <span className="text-[10px] font-black text-slate-900 w-5 text-center font-mono">{cartItem.quantity}</span>
                              <button onClick={() => addToCart(product.id)} className="w-5 h-5 rounded bg-[#01a9fb] text-white flex items-center justify-center transition-all">
                                <Plus size={9} strokeWidth={3} />
                              </button>
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#01a9fb] group-hover:text-white transition-all shrink-0">
                              <Plus size={11} strokeWidth={2.5} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Floating review bar on mobile */}
              {terminalTab === 'PRODUCTS' && cartItems.length > 0 && (
                <div className="lg:hidden" style={{ flexShrink: 0, paddingTop: '4px' }}>
                  <button
                    onClick={() => setTerminalTab('BASKET')}
                    type="button"
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-3 shadow-2xl flex items-center justify-between hover:bg-slate-800 active:scale-[0.98] transition-all text-xs font-bold uppercase tracking-wider"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-lg bg-highlight text-gray-900 flex items-center justify-center text-[10px] font-bold leading-none">
                        {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                      </span>
                      <span>Review Basket</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-highlight font-mono font-bold">{formatCurrency(total)}</span>
                      <ArrowUpRight size={14} strokeWidth={3} className="text-highlight" />
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Cart/Basket Column */}
            <div className={`${terminalTab === 'BASKET' ? 'flex' : 'hidden lg:flex'} flex-col`} style={{ flex: 2, minWidth: '340px', background: 'white', borderRadius: '8px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              {/* Basket Header */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #F8FAFC', flexShrink: 0 }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-tight flex items-center gap-2">
                    <ShoppingBag size={14} className="text-highlight" /> Basket
                  </h3>
                  <span className="text-[8px] font-bold bg-gray-50 text-gray-400 px-2 py-0.5 rounded-md uppercase">{cartItems.length} items</span>
                </div>
              </div>

              {/* Cart Items */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }} className="hide-scrollbar">
                {cartItems.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.4, padding: '24px' }}>
                    <ShoppingBag size={24} strokeWidth={1} className="text-gray-300 mb-2" />
                    <p className="text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-1">Empty basket</p>
                    <p className="text-[8px] font-medium text-gray-400 uppercase tracking-widest text-center">Tap products to add</p>
                  </div>
                ) : (
                  cartItems.map(item => (
                    <div key={item.productId} className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 p-3 bg-white rounded-xl border border-gray-200/60/60 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200/60 shrink-0 bg-[#F8FAFC]">
                          {item.product?.imageUrl ? (
                            <img src={item.product.imageUrl} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package size={16} className="text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[11px] font-bold text-gray-900 uppercase truncate leading-tight">{item.product?.name}</h4>
                          <p className="text-[10px] font-bold text-gray-400 font-mono mt-0.5">{formatCurrency(item.product?.sellingPrice || 0)} each</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-3 mt-1 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-gray-100">
                        <div className="flex items-center gap-0.5 bg-[#F8FAFC] rounded-lg p-0.5 border border-gray-200/60 shrink-0">
                          <button onClick={() => removeFromCart(item.productId)} disabled={item.quantity <= 1} className="w-8 h-8 rounded-md bg-white border border-slate-200 flex items-center justify-center text-gray-600 hover:text-gray-900 disabled:opacity-30 transition-all shadow-sm">
                            <Minus size={12} strokeWidth={3} />
                          </button>
                          <span className="text-xs font-bold text-gray-900 w-9 text-center font-mono">{item.quantity}</span>
                          <button onClick={() => addToCart(item.productId)} className="w-8 h-8 rounded-md bg-white border border-slate-200 flex items-center justify-center text-gray-600 hover:text-highlight transition-all shadow-sm">
                            <Plus size={12} strokeWidth={3} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-xs font-bold text-gray-900 font-mono min-w-[3.5rem] text-right">{formatCurrency((item.product?.sellingPrice || 0) * item.quantity)}</span>
                          <button onClick={() => deleteFromCart(item.productId)} className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500 hover:bg-rose-100 transition-colors">
                            <Trash2 size={13} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div style={{ flexShrink: 0, padding: '10px 14px', borderTop: '1px solid #F1F5F9', background: '#FAFBFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                  <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 shrink-0">
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
                    <span className="font-mono font-bold" style={{ color: '#1E293B' }}>{formatCurrency(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#F43F5E' }}>
                      <span>Discount</span>
                      <span className="font-mono font-bold">-{formatCurrency(Math.abs(discountAmount))}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748B' }}>
                    <label className="flex items-center gap-1.5 cursor-pointer hover:text-gray-900">
                      <input 
                        type="checkbox" 
                        checked={includeGst} 
                        onChange={(e) => setIncludeGst(e.target.checked)}
                        className="rounded border-slate-300 text-gray-800 focus:ring-slate-800"
                      />
                      <span>GST (5%)</span>
                    </label>
                    <span className="font-mono font-bold" style={{ color: '#1E293B' }}>{formatCurrency(tax)}</span>
                  </div>
                  {customerCredit > 0 && (
                    <div className="pt-2 mt-1 border-t border-gray-200/60/60 flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={useCredit}
                          onChange={(e) => setUseCredit(e.target.checked)}
                          className="rounded border-slate-300 text-[#8B5CF6] focus:ring-[#8B5CF6] w-3.5 h-3.5"
                        />
                        <span className="text-[8px] font-bold uppercase text-gray-500 tracking-wider">Apply Store Credit (Avail: {formatCurrency(customerCredit)})</span>
                      </label>
                      {useCredit && (
                        <div className="flex items-center gap-1.5 animate-nano">
                          <span className="text-[8px] font-bold text-gray-400 tracking-wider">USE:</span>
                          <input 
                            type="number"
                            value={creditAmountInput}
                            onChange={(e) => {
                              const val = e.target.value;
                              const numVal = Number(val);
                              // Prevent entering more than available credit
                              if (numVal > customerCredit) {
                                setCreditAmountInput(customerCredit.toString());
                              } else {
                                setCreditAmountInput(val);
                              }
                            }}
                            max={customerCredit}
                            min={0}
                            className="w-16 px-1.5 py-0.5 border border-slate-200 rounded-lg text-[9px] font-bold font-mono text-emerald-600 outline-none focus:border-[#8B5CF6]/30 text-right"
                          />
                          <span className="font-mono font-bold text-emerald-500 text-[10px]">-{formatCurrency(Math.abs(creditApplied))}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Payment Method Selector */}
                <div className="mt-2 space-y-1.5 border-t border-gray-200/60 pt-2">
                  <label className="text-[8px] font-bold uppercase text-gray-400 tracking-widest block">Payment Method</label>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { id: PaymentMethod.CASH, label: 'Cash', icon: <Wallet size={11} /> },
                      { id: PaymentMethod.UPI, label: 'UPI', icon: <Smartphone size={11} /> },
                      { id: PaymentMethod.CARD, label: 'Card', icon: <CreditCard size={11} /> },
                      { id: PaymentMethod.BANK_TRANSFER, label: 'Bank', icon: <Landmark size={11} /> },
                    ].map(pm => (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setSelectedPaymentMethod(pm.id)}
                        className={`py-1.5 px-1 rounded-lg text-[8px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all border ${
                          selectedPaymentMethod === pm.id
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-gray-50 text-gray-500 border-gray-200/60 hover:bg-gray-100'
                        }`}
                      >
                        {pm.icon}
                        <span>{pm.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Type: Full vs Partial */}
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[8px] font-bold uppercase text-gray-400 tracking-widest">Payment Amount</label>
                    <div className="flex bg-gray-100 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsPartialPayment(false);
                          setPartialPaidAmountInput('');
                        }}
                        className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded-md transition-all ${!isPartialPayment ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                      >
                        Full Paid
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsPartialPayment(true);
                          if (!partialPaidAmountInput) {
                            setPartialPaidAmountInput((finalAmountToPay / 2).toString());
                          }
                        }}
                        className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded-md transition-all ${isPartialPayment ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                      >
                        Partial Pay
                      </button>
                    </div>
                  </div>

                  {isPartialPayment && (
                    <div className="p-2 bg-amber-50/70 border border-amber-100 rounded-xl space-y-1.5 animate-nano">
                      <div className="flex items-center gap-2">
                        <span className="text-[8.5px] font-bold uppercase text-gray-600 tracking-wider">Received (₹):</span>
                        <input
                          type="number"
                          placeholder="Amount received..."
                          value={partialPaidAmountInput}
                          onChange={(e) => setPartialPaidAmountInput(e.target.value)}
                          className="flex-1 bg-white border border-amber-200 rounded-lg px-2 py-1 text-[10px] font-mono font-bold text-gray-900 outline-none focus:border-[#8B5CF6]"
                        />
                      </div>
                      <div className="flex justify-between items-center text-[9px] pt-1 border-t border-amber-200/50">
                        <span className="font-bold text-gray-500">Paid: <strong className="text-emerald-600 font-mono">{formatCurrency(actualPaidAmount)}</strong></span>
                        <span className="font-bold text-gray-500">Due: <strong className="text-rose-600 font-mono font-bold">{formatCurrency(remainingDue)}</strong></span>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px dashed #E2E8F0', marginTop: '8px', paddingTop: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 900, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{isPartialPayment ? 'Paid / Due' : (useCredit ? 'Final Due' : 'Total')}</span>
                  <span style={{ fontSize: '20px', fontWeight: 900, color: isPartialPayment ? '#D97706' : '#01a9fb', fontFamily: 'monospace', letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {isPartialPayment ? formatCurrency(actualPaidAmount) : formatCurrency(useCredit ? finalAmountToPay : total)}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button
                    onClick={() => { setCart([]); onClose(); }}
                    style={{ width: '40px', height: '40px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid #E2E8F0', color: '#94A3B8', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={handleCheckout}
                    disabled={cartItems.length === 0}
                    style={{ flex: 1, height: '40px', background: cartItems.length === 0 ? '#94A3B8' : '#01a9fb', color: 'white', borderRadius: '6px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', border: 'none', cursor: cartItems.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: cartItems.length === 0 ? 0.5 : 1 }}
                  >
                    <CheckCircle size={14} strokeWidth={2.5} /> {isPartialPayment ? `Pay ${formatCurrency(actualPaidAmount)}` : 'Pay Now'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Custom / Manual Item Dialog */}
          {isCustomFormOpen && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', padding: '24px' }}>
              <div className="bg-white rounded-lg p-6 shadow-2xl animate-nano text-left" style={{ maxWidth: '360px', width: '100%' }}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Add Manual Item</h3>
                  <button type="button" onClick={() => setIsCustomFormOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                    <X size={16} />
                  </button>
                </div>
                <form onSubmit={handleAddCustomItem} className="space-y-4">
                  <div className="space-y-1 relative">
                    <label className="text-[8px] font-bold uppercase text-gray-400 tracking-widest">Item Name</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Custom Toys / Repairs" 
                      value={customName}
                      onChange={e => {
                        setCustomName(e.target.value);
                        setSelectedCustomProductId(null); // Clear selected product if they type
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                      className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-md p-3 text-[10px] font-bold uppercase tracking-widest outline-none transition-all text-gray-900"
                    />
                    {isDropdownOpen && customName.length > 1 && products.filter(p => p.name.toLowerCase().includes(customName.toLowerCase())).length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white rounded-md shadow-lg border border-gray-200/60 z-50">
                        {products
                          .filter(p => p.name.toLowerCase().includes(customName.toLowerCase()))
                          .slice(0, 5)
                          .map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setCustomName(p.name);
                                setSelectedCustomProductId(p.id); // Link to real product
                                setCustomPrice(p.sellingPrice.toString());
                                setCustomPurchasePrice(p.purchasePrice ? p.purchasePrice.toString() : '');
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                            >
                              <div className="text-[10px] font-bold text-gray-800 uppercase truncate">{p.name}</div>
                              <div className="text-[8px] font-semibold text-gray-400 uppercase">Sale: ₹{p.sellingPrice} {p.purchasePrice ? `| Pur: ₹${p.purchasePrice}` : ''}</div>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold uppercase text-gray-400 tracking-widest">Sale Price (₹)</label>
                    <input 
                      type="number" 
                      required 
                      placeholder="0.00" 
                      value={customPrice}
                      onChange={e => setCustomPrice(e.target.value)}
                      className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-md p-3 text-[10px] font-bold outline-none transition-all text-gray-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold uppercase text-gray-400 tracking-widest">Purchase Price (₹) - Optional</label>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={customPurchasePrice}
                      onChange={e => setCustomPurchasePrice(e.target.value)}
                      className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-md p-3 text-[10px] font-bold outline-none transition-all text-gray-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold uppercase text-gray-400 tracking-widest flex items-center justify-between">
                      <span>Discount - Optional</span>
                      <div className="flex bg-slate-200 rounded p-0.5">
                        <button
                          type="button"
                          onClick={() => setCustomDiscountType('PERCENT')}
                          className={`px-2 py-0.5 text-[8px] rounded-sm transition-colors ${customDiscountType === 'PERCENT' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                        >%</button>
                        <button
                          type="button"
                          onClick={() => setCustomDiscountType('FIXED')}
                          className={`px-2 py-0.5 text-[8px] rounded-sm transition-colors ${customDiscountType === 'FIXED' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                        >₹</button>
                      </div>
                    </label>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={customDiscountValue}
                      onChange={e => setCustomDiscountValue(e.target.value)}
                      className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-md p-3 text-[10px] font-bold outline-none transition-all text-gray-900"
                    />
                  </div>
                  {!selectedCustomProductId && (
                    <label className="flex items-center gap-2 cursor-pointer mt-2">
                      <input 
                        type="checkbox" 
                        checked={saveToInventory}
                        onChange={(e) => setSaveToInventory(e.target.checked)}
                        className="rounded border-slate-300 text-highlight focus:ring-highlight w-4 h-4"
                      />
                      <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Save to Inventory for future sales</span>
                    </label>
                  )}
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
