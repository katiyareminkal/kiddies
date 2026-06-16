import React, { useState, useRef, useEffect } from 'react';
import { 
  IndianRupee, 
  Upload, 
  X, 
  ArrowRight, 
  ChevronDown, 
  AlertCircle 
} from 'lucide-react';
import { Modal } from '../Shared';
import { useApp } from '../../store/AppContext';
import { formatCurrency, calculateLateFee } from '../../utils/helpers';
import { Rental } from '../../types';

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

  const getReturnSummary = () => {
    if (!selectedRental) return { lateFee: 0, totalDue: 0, settlement: 0 };
    
    const lateFee = calculateLateFee(selectedRental.expectedReturnDate, undefined, selectedRental.dailyRate, selectedRental.quantity);
    const outstandingRent = selectedRental.totalRentAmount - selectedRental.paidAmount;
    
    const totalCharges = outstandingRent + lateFee + damageFee;
    const settlement = selectedRental.securityDeposit - totalCharges;
    
    return { lateFee, totalDue: totalCharges, settlement };
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

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Rental Check-In">
      <div className="space-y-6">
        {/* If no rental is selected, show dropdown */}
        {!rental && (
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Select Active Rental</label>
            <div className="relative group">
              <select 
                value={selectedRental?.id || ''} 
                onChange={(e) => {
                  const r = activeRentals.find(item => item.id === e.target.value);
                  setSelectedRental(r || null);
                }}
                className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-[10px] text-slate-900 appearance-none"
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
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} strokeWidth={3} />
            </div>
          </div>
        )}

        {selectedRental ? (
          <>
            {selectedRental.images && selectedRental.images.length > 0 && (
              <div className="space-y-3">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Condition Photos (At Rent)</p>
                 <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                    {selectedRental.images.map((img, i) => (
                       <img key={i} src={img} alt="proof" className="w-24 h-24 rounded-3xl object-cover border border-slate-100 shadow-nano shrink-0" />
                    ))}
                 </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div className="space-y-1">
                    <p className="text-slate-400 text-[9px] uppercase font-black tracking-widest">Customer</p>
                    <p className="font-black text-slate-900 text-[11px] uppercase tracking-tight">{customers.find(c => c.id === selectedRental.customerId)?.name}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-slate-400 text-[9px] uppercase font-black tracking-widest">Deposit Held</p>
                    <p className="font-black text-slate-900 text-[11px] font-mono">{formatCurrency(selectedRental.securityDeposit)}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-slate-400 text-[9px] uppercase font-black tracking-widest">Outstanding</p>
                    <p className="font-black text-slate-900 text-[11px] font-mono">{formatCurrency(Math.max(0, selectedRental.totalRentAmount - selectedRental.paidAmount))}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-slate-400 text-[9px] uppercase font-black tracking-widest">Late Fees</p>
                    <p className="font-black text-rose-500 text-[11px] font-mono">{formatCurrency(summary.lateFee)}</p>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Damage / Cleaning Fee</label>
                <div className="relative group">
                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-highlight transition-colors" size={16} strokeWidth={3} />
                    <input 
                       type="number" 
                       value={damageFee} 
                       onChange={e => setDamageFee(Number(e.target.value))} 
                       className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-2xl outline-none font-black text-slate-900 text-[10px] uppercase tracking-widest"
                       placeholder="0"
                    />
                </div>
            </div>

            {/* Return Condition Photos */}
            <div className="space-y-4">
               <div className="flex items-center gap-3">
                 <div className="h-px flex-1 bg-slate-100"></div>
                 <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Return Condition Photos</h4>
                 <div className="h-px flex-1 bg-slate-100"></div>
               </div>
               <div className="flex gap-3 flex-wrap pt-1">
                  {returnImages.map((img, i) => (
                     <div key={i} className="relative w-20 h-20 rounded-2xl overflow-hidden border border-slate-100 group shadow-nano">
                        <img src={img} alt="return proof" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeReturnImage(i)} className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100">
                           <X size={12} strokeWidth={3} />
                        </button>
                     </div>
                  ))}
                  <button 
                    type="button"
                    className="w-20 h-20 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-highlight hover:text-highlight hover:bg-highlight/5 transition-all group" 
                    onClick={() => returnFileInputRef.current?.click()}
                  >
                     <Upload size={18} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
                     <span className="text-[8px] font-black uppercase tracking-widest">Add <br/><span className="opacity-40 lowercase tracking-normal">(Max 5MB)</span></span>
                  </button>
               </div>
               <input type="file" ref={returnFileInputRef} onChange={handleReturnImageChange} accept="image/*" multiple className="hidden" />
            </div>

            <div className={`p-6 rounded-3xl flex justify-between items-center ${summary.settlement >= 0 ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'}`}>
                <div>
                    <p className="text-[9px] font-black uppercase opacity-60 tracking-widest mb-1">Final Settlement</p>
                    <p className={`text-xl font-display font-black tracking-tighter ${summary.settlement >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {summary.settlement >= 0 ? `Refund: ${formatCurrency(summary.settlement)}` : `Collect: ${formatCurrency(Math.abs(summary.settlement))}`}
                    </p>
                </div>
                <div className={`p-3 rounded-2xl ${summary.settlement >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                    {summary.settlement >= 0 ? <ArrowRight size={24} strokeWidth={3} className="-rotate-45" /> : <IndianRupee size={24} strokeWidth={3} />}
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
               <button type="button" onClick={handleClose} className="w-full sm:flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[9px] text-slate-400 border border-slate-100">Cancel</button>
               <button type="button" onClick={handleConfirmReturn} className="w-full sm:flex-1 h-14 rounded-2xl shadow-banana font-black uppercase tracking-widest text-[9px] bg-highlight text-slate-900">Confirm Return</button>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <AlertCircle size={24} className="mx-auto mb-2 opacity-50" />
            <p className="text-[10px] font-black uppercase tracking-widest">No active rentals available or select one from the list above</p>
          </div>
        )}
      </div>
    </Modal>
  );
};
