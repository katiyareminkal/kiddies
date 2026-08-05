import React, { useState, useEffect, useMemo } from 'react';
import { differenceInDays, parseISO, format } from 'date-fns';
import { 
  AlertCircle, 
  User, 
  ChevronDown, 
  Package, 
  Hash, 
  IndianRupee, 
  Tag, 
  RotateCcw,
  Pencil
} from 'lucide-react';
import { Modal } from '../Shared';
import { useApp } from '../../store/AppContext';
import { formatCurrency } from '../../utils/helpers';
import { Rental, PaymentStatus } from '../../types';

interface EditRentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  rental?: Rental | null;
}

export const EditRentalModal: React.FC<EditRentalModalProps> = ({ isOpen, onClose, rental }) => {
  const { products, customers, updateRental } = useApp();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>('');
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>('');
  const [securityDeposit, setSecurityDeposit] = useState<string>('');
  const [customRentalAmount, setCustomRentalAmount] = useState<string>('');

  useEffect(() => {
    if (rental) {
      setSelectedCustomerId(rental.customerId || '');
      setSelectedProductId(rental.productId || '');
      setQuantity(rental.quantity || 1);
      setStartDate(rental.startDate ? format(parseISO(rental.startDate), 'yyyy-MM-dd') : '');
      setExpectedReturnDate(rental.expectedReturnDate ? format(parseISO(rental.expectedReturnDate), 'yyyy-MM-dd') : '');
      setSecurityDeposit(String(rental.securityDeposit || 0));
      setCustomRentalAmount(String(rental.totalRentAmount || 0));
    }
  }, [rental, isOpen]);

  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId);
  }, [products, selectedProductId]);

  const rentalDays = useMemo(() => {
    if (!startDate || !expectedReturnDate) return 1;
    try {
      const days = differenceInDays(parseISO(expectedReturnDate), parseISO(startDate));
      return Math.max(1, days);
    } catch (e) {
      return 1;
    }
  }, [startDate, expectedReturnDate]);

  const dailyRate = selectedProduct?.rentalPrice || rental?.dailyRate || 0;
  const autoRentalAmount = rentalDays * dailyRate * (quantity || 1);

  const effectiveRentalAmount = customRentalAmount !== '' ? Math.max(0, Number(customRentalAmount)) : autoRentalAmount;
  const isDiscounted = customRentalAmount !== '' && Number(customRentalAmount) !== autoRentalAmount;

  const numericDeposit = Number(securityDeposit) || 0;
  const netRefundable = Math.max(0, numericDeposit - effectiveRentalAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rental) return;

    updateRental(rental.id, {
      customerId: selectedCustomerId,
      productId: selectedProductId,
      quantity,
      startDate,
      expectedReturnDate,
      dailyRate,
      securityDeposit: numericDeposit,
      totalRentAmount: effectiveRentalAmount,
      paymentStatus: numericDeposit >= effectiveRentalAmount ? PaymentStatus.PAID : PaymentStatus.PARTIAL,
    });

    onClose();
  };

  if (!rental) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Rental (${rental.invoiceNumber})`}>
      <form onSubmit={handleSubmit} className="space-y-2.5">
        {/* Customer & Product */}
        <div className="space-y-1">
          <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider px-0.5">Customer *</label>
          <div className="relative group">
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#8B5CF6]" size={13} strokeWidth={2.5} />
            <select 
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              required 
              className="w-full pl-7 pr-6 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#8B5CF6] rounded-xl outline-none font-bold text-[11px] text-slate-900 appearance-none cursor-pointer"
            >
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone || 'No phone'})</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} strokeWidth={2.5} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider px-0.5">Product *</label>
          <div className="relative group">
            <Package className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#8B5CF6]" size={13} strokeWidth={2.5} />
            <select 
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              required 
              className="w-full pl-7 pr-6 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#8B5CF6] rounded-xl outline-none font-bold text-[11px] text-slate-900 appearance-none cursor-pointer"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({formatCurrency(p.rentalPrice)}/d)
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} strokeWidth={2.5} />
          </div>
        </div>

        {/* Qty & Dates row */}
        <div className="grid grid-cols-5 gap-2">
          <div className="col-span-1 space-y-1">
            <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider px-0.5">Qty</label>
            <input 
              type="number" 
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              min="1" 
              required 
              className="w-full px-2 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#8B5CF6] rounded-xl outline-none font-bold text-[11px] text-center text-slate-900" 
            />
          </div>

          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider px-0.5">Start Date *</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required 
              className="w-full px-2 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#8B5CF6] rounded-xl outline-none font-bold text-[10px] text-slate-900 uppercase" 
            />
          </div>

          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider px-0.5">Expected Return *</label>
            <input 
              type="date" 
              value={expectedReturnDate}
              onChange={(e) => setExpectedReturnDate(e.target.value)}
              required 
              className="w-full px-2 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#8B5CF6] rounded-xl outline-none font-bold text-[10px] text-slate-900 uppercase" 
            />
          </div>
        </div>

        {/* Security Deposit & Rent row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider px-0.5">Deposit *</label>
            <div className="relative group">
              <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#8B5CF6]" size={13} strokeWidth={2.5} />
              <input 
                type="number" 
                value={securityDeposit}
                onChange={(e) => setSecurityDeposit(e.target.value)}
                required
                className="w-full pl-7 pr-2 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#8B5CF6] rounded-xl outline-none font-bold text-[11px] text-slate-900" 
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center px-0.5">
              <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Rent Amount *</label>
              {isDiscounted && (
                <button 
                  type="button" 
                  onClick={() => setCustomRentalAmount('')}
                  className="text-[7px] font-bold text-rose-500 hover:underline uppercase flex items-center gap-0.5"
                >
                  <RotateCcw size={7} /> Reset
                </button>
              )}
            </div>
            <div className="relative group">
              <Tag className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${isDiscounted ? 'text-amber-500' : 'text-slate-400 group-focus-within:text-[#8B5CF6]'}`} size={13} strokeWidth={2.5} />
              <input 
                type="number" 
                value={customRentalAmount !== '' ? customRentalAmount : (autoRentalAmount > 0 ? autoRentalAmount : '')}
                onChange={(e) => setCustomRentalAmount(e.target.value)}
                required 
                className={`w-full pl-7 pr-2 py-2 border rounded-xl outline-none font-bold text-[11px] ${isDiscounted ? 'bg-amber-50/60 border-amber-300 text-amber-950' : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-[#8B5CF6] text-slate-900'}`} 
              />
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1 text-left">
          <div className="flex justify-between items-center text-[10px]">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[8px]">Duration & Rate</span>
            <span className="font-bold text-slate-700 font-mono text-[9px]">{rentalDays} day(s) @ {formatCurrency(dailyRate)}/day</span>
          </div>
          <div className="pt-1 border-t border-slate-200/80 flex justify-between items-center">
            <span className="font-black text-emerald-600 uppercase tracking-wider text-[9px]">Net Refundable</span>
            <span className="font-black text-emerald-600 font-mono text-xs">{formatCurrency(netRefundable)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button 
            type="button" 
            onClick={onClose} 
            className="flex-1 py-2 rounded-xl font-bold uppercase tracking-wider text-[9.5px] text-slate-500 border border-slate-200 hover:border-slate-300"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="flex-1 py-2 rounded-xl font-black uppercase tracking-wider text-[9.5px] bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-md shadow-[#8B5CF6]/20"
          >
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
};
