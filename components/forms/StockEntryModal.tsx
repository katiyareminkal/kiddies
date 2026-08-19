import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  ShoppingBag, 
  RefreshCcw, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ChevronDown, 
  AlertCircle,
  CheckCircle2,
  Check
} from 'lucide-react';
import { Modal } from '../Shared';
import { useApp } from '../../store/AppContext';
import { Product } from '../../types';

interface StockEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
}

export const StockEntryModal: React.FC<StockEntryModalProps> = ({ isOpen, onClose, product }) => {
  const { products, updateStock } = useApp();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setSelectedProductId(product.id);
    } else {
      setSelectedProductId('');
    }
  }, [product, isOpen]);

  const handleStockUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const prodId = selectedProductId || (formData.get('productId') as string);
    const activeProd = product || products.find(p => p.id === prodId);

    if (prodId && activeProd) {
      const type = formData.get('type') as 'IN' | 'OUT';
      const reason = (formData.get('reason') as string) || 'Stock adjustment';

      if (activeProd.purpose === 'HYBRID') {
        const saleQty = Number(formData.get('saleQuantity') || 0);
        const rentalQty = Number(formData.get('rentalQuantity') || 0);

        if (saleQty > 0) {
          updateStock(prodId, 'SALE', saleQty, type, reason);
        }
        if (rentalQty > 0) {
          updateStock(prodId, 'RENTAL', rentalQty, type, reason);
        }
      } else {
        const pool = (formData.get('pool') as 'SALE' | 'RENTAL') || (activeProd.purpose === 'RENTAL' ? 'RENTAL' : 'SALE');
        const qty = Number(formData.get('quantity') || 0);
        if (qty > 0) {
          updateStock(prodId, pool, qty, type, reason);
        }
      }
      handleClose();
      setSuccessMessage('SUCCESS');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 1000);
    }
  };

  const handleClose = () => {
    setSelectedProductId('');
    onClose();
  };

  const activeProduct = product || products.find(p => p.id === selectedProductId);
  const isHybrid = activeProduct?.purpose === 'HYBRID';

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title="Stock Adjustment">
      <form onSubmit={handleStockUpdate} className="space-y-4">
        {/* If no product is pre-selected, show dropdown */}
        {!product && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Select Product</label>
            <div className="relative group">
              <select 
                name="productId" 
                required 
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl outline-none transition-all font-bold uppercase tracking-widest text-[10px] text-gray-900 appearance-none"
              >
                <option value="" disabled>-- Select Product --</option>
                {products.map(p => {
                  const totalStock = p.saleStock + p.rentalStock;
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name} (SKU: {p.sku}) — Total: {totalStock} Pcs (Sale: {p.saleStock}, Rental: {p.rentalStock})
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} strokeWidth={3} />
            </div>
          </div>
        )}

        {/* Product Info Card - shows purpose and current stock */}
        {activeProduct && (() => {
          const purposeColors: Record<string, string> = {
            'SALE': 'bg-emerald-50 text-emerald-600',
            'RENTAL': 'bg-blue-50 text-blue-600',
            'HYBRID': 'bg-purple-50 text-purple-600'
          };
          const purposeLabels: Record<string, string> = {
            'SALE': 'Sale Only',
            'RENTAL': 'Rental Only',
            'HYBRID': 'Sale + Rental'
          };
          const total = activeProduct.saleStock + activeProduct.rentalStock;

          return (
            <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-900">{activeProduct.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] font-bold text-gray-900 bg-slate-200/80 px-2 py-0.5 rounded-md">Total: {total} Pcs</span>
                  <span className="text-[8px] font-bold text-gray-500">
                    (Sale: <span className="text-gray-800 font-extrabold">{activeProduct.saleStock}</span> | Rental: <span className="text-gray-800 font-extrabold">{activeProduct.rentalStock}</span>)
                  </span>
                </div>
              </div>
              <span className={`text-[8px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full ${purposeColors[activeProduct.purpose] || 'bg-slate-200 text-gray-600'}`}>
                {purposeLabels[activeProduct.purpose] || activeProduct.purpose}
              </span>
            </div>
          );
        })()}

        {/* Stock Pool selection (Show only if no product is selected or if purpose requires selecting pool) */}
        {(!activeProduct || activeProduct.purpose === 'HYBRID') ? null : (
          <>
            {/* For SALE only or RENTAL only products, pass a hidden pool input */}
            <input type="hidden" name="pool" value={activeProduct.purpose === 'RENTAL' ? 'RENTAL' : 'SALE'} />
          </>
        )}

        {/* If no product selected yet, allow picking pool */}
        {!activeProduct && (
          <>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Stock Type</label>
            <div className="grid grid-cols-2 gap-3">
              <label className="relative border border-gray-200 rounded-md p-4 flex flex-col items-center justify-center gap-2 cursor-pointer has-[:checked]:bg-primary/5 has-[:checked]:border-primary has-[:checked]:text-primary transition-all group">
                <input type="radio" name="pool" value="SALE" defaultChecked className="hidden" />
                <ShoppingBag size={20} className="text-gray-400 group-has-[:checked]:text-primary transition-colors" strokeWidth={3} />
                <span className="text-[9px] font-bold uppercase tracking-widest">Sale Stock</span>
              </label>
              <label className="relative border border-gray-200 rounded-md p-4 flex flex-col items-center justify-center gap-2 cursor-pointer has-[:checked]:bg-primary/5 has-[:checked]:border-primary has-[:checked]:text-primary transition-all group">
                <input type="radio" name="pool" value="RENTAL" className="hidden" />
                <RefreshCcw size={20} className="text-gray-400 group-has-[:checked]:text-primary transition-colors" strokeWidth={3} />
                <span className="text-[9px] font-bold uppercase tracking-widest">Rental Stock</span>
              </label>
            </div>
          </>
        )}

        {/* Adjustment Type: IN (Add) vs OUT (Deduct) */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Adjustment Type</label>
          <div className="grid grid-cols-2 gap-3">
            <label className="relative border border-gray-200 rounded-md p-3.5 flex items-center justify-center gap-2.5 cursor-pointer has-[:checked]:bg-emerald-50 has-[:checked]:border-emerald-500 has-[:checked]:text-emerald-700 transition-all group">
              <input type="radio" name="type" value="IN" defaultChecked className="hidden" />
              <ArrowDownLeft size={16} className="text-emerald-500 group-has-[:checked]:text-emerald-700" strokeWidth={3} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Add Stock (+)</span>
            </label>
            <label className="relative border border-gray-200 rounded-md p-3.5 flex items-center justify-center gap-2.5 cursor-pointer has-[:checked]:bg-rose-50 has-[:checked]:border-rose-500 has-[:checked]:text-rose-700 transition-all group">
              <input type="radio" name="type" value="OUT" className="hidden" />
              <ArrowUpRight size={16} className="text-rose-500 group-has-[:checked]:text-rose-700" strokeWidth={3} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Deduct Stock (-)</span>
            </label>
          </div>
        </div>

        {/* Hybrid stock inputs: separate Sale Qty & Rental Qty */}
        {isHybrid ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Sale Qty</label>
              <input 
                type="number" 
                name="saleQuantity" 
                min="0" 
                defaultValue="0"
                placeholder="0"
                className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl outline-none transition-all font-extrabold text-sm text-gray-900"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Rental Qty</label>
              <input 
                type="number" 
                name="rentalQuantity" 
                min="0" 
                defaultValue="0"
                placeholder="0"
                className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl outline-none transition-all font-extrabold text-sm text-gray-900"
              />
            </div>
          </div>
        ) : (
          /* Single Quantity Input */
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Quantity</label>
            <input 
              type="number" 
              name="quantity" 
              required 
              min="1" 
              placeholder="e.g. 5"
              className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl outline-none transition-all font-extrabold text-sm text-gray-900"
            />
          </div>
        )}

        {/* Reason / Notes */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Reason / Notes</label>
          <input 
            type="text" 
            name="reason" 
            placeholder="e.g. Restock from supplier, Damaged piece, Return"
            className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl outline-none transition-all font-bold text-xs text-gray-900"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-3">
          <button 
            type="button" 
            onClick={handleClose}
            className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-md font-bold uppercase tracking-widest text-[9px] hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="flex-1 px-4 py-3 bg-[#01a9fb] hover:bg-[#0098e6] text-white rounded-md font-bold uppercase tracking-widest text-[9px] shadow-sm transition-all active:scale-95"
          >
            Confirm Adjustment
          </button>
        </div>
      </form>
    </Modal>

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
    </>
  );
};
