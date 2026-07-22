import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  RefreshCcw, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ChevronDown, 
  AlertCircle 
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
    }
  };

  const handleClose = () => {
    setSelectedProductId('');
    onClose();
  };

  const activeProduct = product || products.find(p => p.id === selectedProductId);
  const isHybrid = activeProduct?.purpose === 'HYBRID';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Stock Adjustment">
      <form onSubmit={handleStockUpdate} className="space-y-4">
        {/* If no product is pre-selected, show dropdown */}
        {!product && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Select Product</label>
            <div className="relative group">
              <select 
                name="productId" 
                required 
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-[10px] text-slate-900 appearance-none"
              >
                <option value="" disabled>-- Select Product --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (SKU: {p.sku}) - Sale: {p.saleStock}, Rental: {p.rentalStock} [{p.purpose}]
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} strokeWidth={3} />
            </div>
          </div>
        )}

        {/* Product Info Card - shows purpose and current stock */}
        {activeProduct && (() => {
          const purposeColors: Record<string, string> = {
            'SALE': 'bg-blue-100 text-blue-700',
            'RENTAL': 'bg-purple-100 text-purple-700',
            'HYBRID': 'bg-amber-100 text-amber-700'
          };
          const purposeLabels: Record<string, string> = {
            'SALE': 'Sale Only',
            'RENTAL': 'Rental Only',
            'HYBRID': 'Sale + Rental'
          };
          return (
            <div className="bg-slate-50 rounded-2xl p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">{activeProduct.name}</p>
                <div className="flex gap-3 mt-1">
                  {(activeProduct.purpose === 'SALE' || activeProduct.purpose === 'HYBRID') && (
                    <span className="text-[8px] font-bold text-slate-500">Sale Stock: <span className="text-slate-800 font-extrabold">{activeProduct.saleStock}</span></span>
                  )}
                  {(activeProduct.purpose === 'RENTAL' || activeProduct.purpose === 'HYBRID') && (
                    <span className="text-[8px] font-bold text-slate-500">Rental Stock: <span className="text-slate-800 font-extrabold">{activeProduct.rentalStock}</span></span>
                  )}
                </div>
              </div>
              <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${purposeColors[activeProduct.purpose] || 'bg-slate-200 text-slate-600'}`}>
                {purposeLabels[activeProduct.purpose] || activeProduct.purpose}
              </span>
            </div>
          );
        })()}

        {/* Stock Pool selection (Only if product is not HYBRID) */}
        {!isHybrid && (
          <>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Stock Type</label>
            <div className="grid grid-cols-2 gap-3">
              <label className="relative border-2 border-slate-50 rounded-[2rem] p-4 flex flex-col items-center justify-center gap-2 cursor-pointer has-[:checked]:bg-primary/5 has-[:checked]:border-primary has-[:checked]:text-primary transition-all group">
                <input type="radio" name="pool" value="SALE" defaultChecked={activeProduct?.purpose !== 'RENTAL'} className="hidden" />
                <ShoppingBag size={20} className="text-slate-400 group-has-[:checked]:text-primary transition-colors" strokeWidth={3} />
                <span className="text-[9px] font-black uppercase tracking-widest">Sale Stock</span>
              </label>
              <label className="relative border-2 border-slate-50 rounded-[2rem] p-4 flex flex-col items-center justify-center gap-2 cursor-pointer has-[:checked]:bg-primary/5 has-[:checked]:border-primary has-[:checked]:text-primary transition-all group">
                <input type="radio" name="pool" value="RENTAL" defaultChecked={activeProduct?.purpose === 'RENTAL'} className="hidden" />
                <RefreshCcw size={20} className="text-slate-400 group-has-[:checked]:text-primary transition-colors" strokeWidth={3} />
                <span className="text-[9px] font-black uppercase tracking-widest">Rental Stock</span>
              </label>
            </div>
          </>
        )}

        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Action</label>
        <div className="grid grid-cols-2 gap-3">
          <label className="relative border-2 border-slate-50 rounded-[2rem] p-4 flex flex-col items-center justify-center gap-2 cursor-pointer has-[:checked]:bg-emerald-50 has-[:checked]:border-emerald-600 has-[:checked]:text-emerald-700 transition-all group">
            <input type="radio" name="type" value="IN" defaultChecked className="hidden" />
            <ArrowDownLeft size={20} className="text-slate-400 group-has-[:checked]:text-emerald-600 transition-colors" strokeWidth={3} />
            <span className="text-[9px] font-black uppercase tracking-widest">Stock In</span>
          </label>
          <label className="relative border-2 border-slate-50 rounded-[2rem] p-4 flex flex-col items-center justify-center gap-2 cursor-pointer has-[:checked]:bg-secondary/5 has-[:checked]:border-secondary has-[:checked]:text-secondary transition-all group">
            <input type="radio" name="type" value="OUT" className="hidden" />
            <ArrowUpRight size={20} className="text-slate-400 group-has-[:checked]:text-secondary transition-colors" strokeWidth={3} />
            <span className="text-[9px] font-black uppercase tracking-widest">Stock Out</span>
          </label>
        </div>

        {/* Quantity Fields */}
        {isHybrid ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-blue-600 ml-1">Sale Stock Qty</label>
              <input name="saleQuantity" type="number" min="0" className="w-full px-4 py-3 bg-slate-50 border-slate-50 border-2 focus:bg-white focus:border-primary rounded-2xl outline-none transition-all font-bold text-slate-700 text-sm" placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-purple-600 ml-1">Rental Stock Qty</label>
              <input name="rentalQuantity" type="number" min="0" className="w-full px-4 py-3 bg-slate-50 border-slate-50 border-2 focus:bg-white focus:border-primary rounded-2xl outline-none transition-all font-bold text-slate-700 text-sm" placeholder="0" />
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Quantity</label>
            <input name="quantity" type="number" required className="w-full px-4 py-3 bg-slate-50 border-slate-50 border-2 focus:bg-white focus:border-primary rounded-2xl outline-none transition-all font-bold text-slate-700 text-sm" placeholder="0" min="1" />
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Reason / Notes (Optional)</label>
          <input name="reason" type="text" className="w-full px-4 py-3 bg-slate-50 border-slate-50 border-2 focus:bg-white focus:border-primary rounded-2xl outline-none transition-all font-bold text-slate-700 text-sm" placeholder="e.g. Initial stock, audit, damage" />
        </div>

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={handleClose} className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[9px] text-slate-400 border border-slate-100">Cancel</button>
          <button type="submit" className="flex-1 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-primary/20">Update Stock</button>
        </div>
      </form>
    </Modal>
  );
};
