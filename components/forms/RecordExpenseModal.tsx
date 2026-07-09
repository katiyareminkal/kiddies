import React, { useState, useMemo } from 'react';
import { 
  X, 
  Wallet, 
  ShoppingBag, 
  CheckCircle2, 
  ChevronDown 
} from 'lucide-react';
import { Modal } from '../Shared';
import { useApp } from '../../store/AppContext';
import { formatCurrency } from '../../utils/helpers';

interface RecordExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RecordExpenseModal: React.FC<RecordExpenseModalProps> = ({ isOpen, onClose }) => {
  const { products, addExpense } = useApp();
  
  const [type, setType] = useState<'CASH_OUT' | 'GOODS_CONSUMPTION'>('CASH_OUT');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Goods Consumption Fields
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [customAmount, setCustomAmount] = useState<string>('');
  
  // Find selected product
  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId);
  }, [products, selectedProductId]);

  // Auto-calculated amount based on selling price
  const calculatedAmount = useMemo(() => {
    if (type === 'CASH_OUT') return 0;
    if (!selectedProduct) return 0;
    return selectedProduct.sellingPrice * quantity;
  }, [type, selectedProduct, quantity]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);

    const formData = new FormData(e.currentTarget);
    const reason = formData.get('reason') as string;
    const paidTo = formData.get('paidTo') as string;
    const date = formData.get('date') as string;

    const amount = type === 'CASH_OUT' 
      ? Number(formData.get('amount')) 
      : (customAmount ? Number(customAmount) : calculatedAmount);

    try {
      await addExpense({
        type,
        amount,
        productId: type === 'GOODS_CONSUMPTION' ? selectedProductId : undefined,
        quantity: type === 'GOODS_CONSUMPTION' ? quantity : undefined,
        reason: reason.trim(),
        paidTo: paidTo ? paidTo.trim() : undefined,
        date: date ? new Date(date + 'T12:00:00').toISOString() : undefined
      });

      setSuccessMessage(type === 'CASH_OUT' ? 'Cash Out logged successfully!' : 'Goods withdrawal logged successfully!');
      
      setTimeout(() => {
        setSuccessMessage(null);
        handleClose();
      }, 2000);
    } catch (err: any) {
      alert('Failed to save: ' + (err?.message || String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setType('CASH_OUT');
    setSelectedProductId('');
    setQuantity(1);
    setCustomAmount('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Record Expense / Cash Out">
      {successMessage && (
        <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 rounded-[2rem]">
          <div className="bg-white rounded-3xl p-8 text-center shadow-2xl animate-nano max-w-[280px] w-full">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={24} strokeWidth={2.5} />
            </div>
            <h3 className="text-sm font-black text-slate-900 mb-1 uppercase tracking-tight">Logged!</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{successMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type Selector Toggle */}
        <div className="grid grid-cols-2 gap-3 p-1 bg-slate-50 border border-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setType('CASH_OUT')}
            className={`py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              type === 'CASH_OUT' 
                ? 'bg-white text-slate-900 shadow-md shadow-slate-100' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Wallet size={12} />
            Cash Out / Shop Expense
          </button>
          <button
            type="button"
            onClick={() => setType('GOODS_CONSUMPTION')}
            className={`py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              type === 'GOODS_CONSUMPTION' 
                ? 'bg-white text-slate-900 shadow-md shadow-slate-100' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <ShoppingBag size={12} />
            Goods Taken / Family
          </button>
        </div>

        {/* GOODS_CONSUMPTION Fields */}
        {type === 'GOODS_CONSUMPTION' && (
          <>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Select Product</label>
              <div className="relative">
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full pl-4 pr-10 py-3.5 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-[9px] text-slate-900 appearance-none"
                >
                  <option value="" disabled>-- Choose Item --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Qty: {p.saleStock} | Retail: {formatCurrency(p.sellingPrice)})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} strokeWidth={3} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-full px-4 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-2xl outline-none transition-all font-black text-slate-900 text-[11px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Custom Value (Optional)</label>
                <input
                  type="number"
                  placeholder={selectedProduct ? `Auto: ${formatCurrency(calculatedAmount)}` : '₹ Amount'}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-2xl outline-none transition-all font-black text-slate-900 text-[11px]"
                />
              </div>
            </div>
          </>
        )}

        {/* CASH_OUT Fields */}
        {type === 'CASH_OUT' && (
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Amount (₹)</label>
            <input
              name="amount"
              type="number"
              min="1"
              required
              placeholder="e.g. 500"
              className="w-full px-4 py-3.5 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-2xl outline-none transition-all font-black text-slate-900 text-[11px]"
            />
          </div>
        )}

        {/* Paid To / Given To */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Given To / Paid To (Optional)</label>
          <input
            name="paidTo"
            type="text"
            placeholder="e.g. John Doe, Delivery Guy"
            className="w-full px-4 py-3.5 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-2xl outline-none transition-all font-black text-slate-900 text-[10px]"
          />
        </div>

        {/* Reason / Notes */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Reason / Description</label>
          <input
            name="reason"
            type="text"
            required
            placeholder={type === 'CASH_OUT' ? 'e.g. Bought tea/stationary, paid rent' : 'e.g. Taken by brother, family gift'}
            className="w-full px-4 py-3.5 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-2xl outline-none transition-all font-black text-slate-900 text-[10px]"
          />
        </div>

        {/* Date Selector */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Transaction Date</label>
          <input
            name="date"
            type="date"
            defaultValue={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-3.5 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-2xl outline-none transition-all font-black text-slate-900 text-[10px]"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-3">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[9px] border border-slate-100 text-slate-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 banana-btn h-14 text-[9px]"
          >
            {isSaving ? 'Saving...' : 'Record Entry'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
