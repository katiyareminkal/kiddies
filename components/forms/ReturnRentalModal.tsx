import React, { useState, useRef, useEffect } from 'react';
import { 
  IndianRupee, 
  Upload, 
  X, 
  ArrowRight, 
  ChevronDown, 
  AlertCircle,
  Clock,
  CheckCircle,
  Package,
  User,
  Calendar
} from 'lucide-react';
import { Modal } from '../Shared';
import { useApp } from '../../store/AppContext';
import { formatCurrency, calculateLateFee } from '../../utils/helpers';
import { Rental } from '../../types';
import { differenceInHours, parseISO, isAfter, format } from 'date-fns';

interface ReturnRentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  rental?: Rental | null;
}

export const ReturnRentalModal: React.FC<ReturnRentalModalProps> = ({ isOpen, onClose, rental }) => {
  const { rentals, customers, products, returnRental } = useApp();
  
  // Selection state if no rental is pre-selected
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  
  // Return Modal State
  const [damageFee, setDamageFee] = useState(0);
  const [returnImages, setReturnImages] = useState<string[]>([]);
  const [selectedReturnFiles, setSelectedReturnFiles] = useState<File[]>([]);
  const returnFileInputRef = useRef<HTMLInputElement>(null);

  // Sync prop rental to state
  useEffect(() => {
    if (rental) {
      setSelectedRental(rental);
    } else {
      setSelectedRental(null);
    }
    setDamageFee(0);
    setReturnImages([]);
    setSelectedReturnFiles([]);
  }, [rental, isOpen]);

  const activeRentals = rentals.filter(r => r.status === 'ACTIVE');

  // Overdue Hours Calculation
  const getOverdueDetails = () => {
    if (!selectedRental?.expectedReturnDate) return { isOverdue: false, totalHours: 0, days: 0, hrs: 0, formatted: '' };

    const expectedDate = parseISO(selectedRental.expectedReturnDate);
    const now = new Date();

    if (isAfter(now, expectedDate)) {
      const totalHours = Math.max(1, differenceInHours(now, expectedDate));
      const days = Math.floor(totalHours / 24);
      const hrs = totalHours % 24;

      let formatted = '';
      if (days > 0) {
        formatted = `${days} day${days > 1 ? 's' : ''} ${hrs} hr${hrs !== 1 ? 's' : ''} (${totalHours} hrs total)`;
      } else {
        formatted = `${totalHours} hr${totalHours !== 1 ? 's' : ''}`;
      }

      return { isOverdue: true, totalHours, days, hrs, formatted };
    }

    return { isOverdue: false, totalHours: 0, days: 0, hrs: 0, formatted: '' };
  };

  const overdueInfo = getOverdueDetails();

  const getReturnSummary = () => {
    if (!selectedRental) return { lateFee: 0, totalDue: 0, settlement: 0 };
    
    const lateFee = calculateLateFee(selectedRental.expectedReturnDate, undefined, selectedRental.dailyRate, selectedRental.quantity);
    const outstandingRent = Math.max(0, selectedRental.totalRentAmount - selectedRental.paidAmount);
    
    const totalCharges = outstandingRent + lateFee + damageFee;
    const settlement = selectedRental.securityDeposit - totalCharges;
    
    return { lateFee, outstandingRent, totalDue: totalCharges, settlement };
  };

  const handleReturnImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      
      const validFiles: File[] = [];
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          alert(`File too large: ${file.name} is ${(file.size / (1024 * 1024)).toFixed(2)}MB. Limit is 5MB.`);
        } else {
          validFiles.push(file);
        }
      }

      if (validFiles.length === 0) {
        if (e.target) e.target.value = '';
        return;
      }

      setSelectedReturnFiles(prev => [...prev, ...validFiles]);
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setReturnImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeReturnImage = (index: number) => {
    setReturnImages(prev => prev.filter((_, i) => i !== index));
    setSelectedReturnFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirmReturn = () => {
    if (selectedRental) {
      const lateFee = calculateLateFee(selectedRental.expectedReturnDate, undefined, selectedRental.dailyRate, selectedRental.quantity);
      const totalExtraFees = lateFee + damageFee;
      
      returnRental(selectedRental.id, totalExtraFees, selectedReturnFiles);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedRental(null);
    setDamageFee(0);
    setReturnImages([]);
    setSelectedReturnFiles([]);
    onClose();
  };

  const summary = getReturnSummary();
  const customerObj = selectedRental ? customers.find(c => c.id === selectedRental.customerId) : null;
  const productObj = selectedRental ? products.find(p => p.id === selectedRental.productId) : null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Rental Check-In">
      <div className="space-y-4">
        {/* If no rental is selected, show dropdown */}
        {!rental && (
          <div className="space-y-1.5">
            <label className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider ml-1">Select Active Rental *</label>
            <div className="relative group">
              <select 
                value={selectedRental?.id || ''} 
                onChange={(e) => {
                  const r = activeRentals.find(item => item.id === e.target.value);
                  setSelectedRental(r || null);
                }}
                className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#8B5CF6] rounded-xl outline-none font-bold text-xs text-slate-900 appearance-none cursor-pointer"
              >
                <option value="" disabled>-- Choose Active Rental --</option>
                {activeRentals.map(r => {
                  const cust = customers.find(c => c.id === r.customerId);
                  const prod = products.find(p => p.id === r.productId);
                  return (
                    <option key={r.id} value={r.id}>
                      {r.invoiceNumber} - {cust?.name || 'Unknown'} ({prod?.name || 'Unknown'})
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} strokeWidth={2.5} />
            </div>
          </div>
        )}

        {selectedRental ? (
          <>
            {/* Overdue Warning Banner (Shows Overdue Duration in Hours & Days) */}
            {overdueInfo.isOverdue && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5">
                <Clock size={16} className="text-rose-600 shrink-0 animate-pulse" strokeWidth={2.5} />
                <div>
                  <span className="text-[8.5px] font-black uppercase tracking-wider text-rose-700">Late Return Warning</span>
                  <p className="text-[10px] font-bold text-rose-950 leading-tight mt-0.5">
                    Return is <span className="font-mono font-black text-rose-700 underline">{overdueInfo.formatted}</span>. Late penalty applied.
                  </p>
                </div>
              </div>
            )}

            {/* Condition Photos At Rent */}
            {selectedRental.images && selectedRental.images.length > 0 && (
              <div className="space-y-1.5">
                 <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Condition Photos (At Rent)</p>
                 <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                    {selectedRental.images.map((img, i) => (
                       <img key={i} src={img} alt="proof" className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0" />
                    ))}
                 </div>
              </div>
            )}

            {/* Detailed Financial & Order Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-left">
                <div className="space-y-0.5">
                    <p className="text-slate-400 text-[8px] uppercase font-black tracking-wider">Customer</p>
                    <p className="font-black text-slate-900 text-[11px] truncate">{customerObj?.name || 'Customer'}</p>
                    <p className="text-[8.5px] text-slate-400 font-medium">{customerObj?.phone || 'No phone'}</p>
                </div>
                <div className="space-y-0.5">
                    <p className="text-slate-400 text-[8px] uppercase font-black tracking-wider">Product & Qty</p>
                    <p className="font-black text-slate-900 text-[11px] truncate">{productObj?.name || 'Product'}</p>
                    <p className="text-[8.5px] text-slate-500 font-bold">Qty: {selectedRental.quantity}</p>
                </div>
                <div className="space-y-0.5">
                    <p className="text-slate-400 text-[8px] uppercase font-black tracking-wider">Expected Return</p>
                    <p className="font-black text-slate-900 text-[10px] font-mono">
                      {format(parseISO(selectedRental.expectedReturnDate), 'MMM dd, yyyy')}
                    </p>
                </div>
                <div className="space-y-0.5">
                    <p className="text-slate-400 text-[8px] uppercase font-black tracking-wider">Security Deposit</p>
                    <p className="font-black text-[#8B5CF6] text-[11px] font-mono">{formatCurrency(selectedRental.securityDeposit)}</p>
                </div>

                <div className="space-y-0.5 pt-2 border-t border-slate-200">
                    <p className="text-slate-400 text-[8px] uppercase font-black tracking-wider">Total Rent</p>
                    <p className="font-black text-slate-900 text-[11px] font-mono">{formatCurrency(selectedRental.totalRentAmount)}</p>
                </div>
                <div className="space-y-0.5 pt-2 border-t border-slate-200">
                    <p className="text-slate-400 text-[8px] uppercase font-black tracking-wider">Paid Amount</p>
                    <p className="font-black text-slate-700 text-[11px] font-mono">{formatCurrency(selectedRental.paidAmount)}</p>
                </div>
                <div className="space-y-0.5 pt-2 border-t border-slate-200">
                    <p className="text-slate-400 text-[8px] uppercase font-black tracking-wider">Outstanding Rent</p>
                    <p className="font-black text-slate-900 text-[11px] font-mono">{formatCurrency(summary.outstandingRent)}</p>
                </div>
                <div className="space-y-0.5 pt-2 border-t border-slate-200">
                    <p className="text-slate-400 text-[8px] uppercase font-black tracking-wider">Late Fee</p>
                    <p className="font-black text-rose-500 text-[11px] font-mono">{formatCurrency(summary.lateFee)}</p>
                </div>
            </div>

            {/* Damage / Cleaning Fee Input */}
            <div className="space-y-1">
                <label className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider px-1">Damage / Cleaning Fee</label>
                <div className="relative group">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#8B5CF6]" size={14} strokeWidth={2.5} />
                    <input 
                       type="number" 
                       value={damageFee} 
                       onChange={e => setDamageFee(Number(e.target.value))} 
                       className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#8B5CF6] rounded-xl outline-none font-bold text-slate-900 text-xs"
                       placeholder="0"
                    />
                </div>
            </div>

            {/* Return Condition Photos */}
            <div className="space-y-2">
               <div className="flex items-center gap-2">
                 <div className="h-px flex-1 bg-slate-100"></div>
                 <h4 className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider">Return Condition Photos</h4>
                 <div className="h-px flex-1 bg-slate-100"></div>
               </div>
               <div className="flex gap-1.5 flex-wrap">
                  {returnImages.map((img, i) => (
                     <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200 group">
                        <img src={img} alt="return proof" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeReturnImage(i)} className="absolute top-0.5 right-0.5 bg-rose-500 text-white p-0.5 rounded opacity-0 group-hover:opacity-100 transition-all">
                           <X size={10} strokeWidth={3} />
                        </button>
                     </div>
                  ))}
                  <button 
                    type="button"
                    className="w-14 h-14 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center gap-0.5 text-slate-400 hover:border-[#8B5CF6] hover:text-[#8B5CF6] hover:bg-[#8B5CF6]/5 transition-all group" 
                    onClick={() => returnFileInputRef.current?.click()}
                  >
                     <Upload size={14} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                     <span className="text-[7.5px] font-black uppercase tracking-wider">Add</span>
                  </button>
               </div>
               <input type="file" ref={returnFileInputRef} onChange={handleReturnImageChange} accept="image/*" multiple className="hidden" />
            </div>

            {/* Final Settlement Display */}
            <div className={`p-4 rounded-2xl flex justify-between items-center ${summary.settlement >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
                <div>
                    <p className="text-[8.5px] font-black uppercase tracking-wider opacity-70 mb-0.5">Final Settlement</p>
                    <p className={`text-lg font-black font-mono tracking-tight ${summary.settlement >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                        {summary.settlement >= 0 ? `Refund: ${formatCurrency(summary.settlement)}` : `Collect: ${formatCurrency(Math.abs(summary.settlement))}`}
                    </p>
                    <p className="text-[8px] font-medium text-slate-500 mt-0.5">
                      Deposit ({formatCurrency(selectedRental.securityDeposit)}) minus Total Due ({formatCurrency(summary.totalDue)})
                    </p>
                </div>
                <div className={`p-2.5 rounded-xl ${summary.settlement >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                    {summary.settlement >= 0 ? <ArrowRight size={20} strokeWidth={3} className="-rotate-45" /> : <IndianRupee size={20} strokeWidth={3} />}
                </div>
            </div>

            <div className="flex gap-2 pt-1">
               <button type="button" onClick={handleClose} className="flex-1 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[9.5px] text-slate-500 border border-slate-200 hover:border-slate-300">Cancel</button>
               <button type="button" onClick={handleConfirmReturn} className="flex-1 py-2.5 rounded-xl font-black uppercase tracking-wider text-[9.5px] bg-[#8B5CF6] text-white hover:bg-[#7C3AED] shadow-md shadow-[#8B5CF6]/20">Confirm Return</button>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <AlertCircle size={24} className="mx-auto mb-2 opacity-50" />
            <p className="text-[10px] font-black uppercase tracking-wider">No active rentals available or select one from the list above</p>
          </div>
        )}
      </div>
    </Modal>
  );
};
