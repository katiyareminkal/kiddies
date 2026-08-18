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
  Calendar,
  RotateCcw,
  Tag
} from 'lucide-react';
import { Modal } from '../Shared';
import { useApp } from '../../store/AppContext';
import { formatCurrency, calculateLateFee } from '../../utils/helpers';
import { Rental } from '../../types';
import { differenceInMinutes, parseISO, isAfter, format } from 'date-fns';

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
  const [customLateFee, setCustomLateFee] = useState<string>('');
  const [customRefundAmount, setCustomRefundAmount] = useState<string>('');

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
    setCustomLateFee('');
    setCustomRefundAmount('');
    setReturnImages([]);
    setSelectedReturnFiles([]);
  }, [rental, isOpen]);

  const activeRentals = rentals.filter(r => r.status === 'ACTIVE');

  // Overdue Hours & Minutes Calculation
  const getOverdueDetails = () => {
    if (!selectedRental?.expectedReturnDate) return { isOverdue: false, totalMinutes: 0, days: 0, hrs: 0, mins: 0, formatted: '' };

    const expectedDate = parseISO(selectedRental.expectedReturnDate);
    const now = new Date();

    if (isAfter(now, expectedDate)) {
      const totalMinutes = Math.max(1, differenceInMinutes(now, expectedDate));
      const days = Math.floor(totalMinutes / (24 * 60));
      const hrs = Math.floor((totalMinutes % (24 * 60)) / 60);
      const mins = totalMinutes % 60;

      let formatted = '';
      if (days > 0) {
        formatted = `${days} day${days > 1 ? 's' : ''} ${hrs} hr${hrs !== 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
      } else if (hrs > 0) {
        formatted = `${hrs} hr${hrs !== 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
      } else {
        formatted = `${mins} min${mins !== 1 ? 's' : ''}`;
      }

      return { isOverdue: true, totalMinutes, days, hrs, mins, formatted };
    }

    return { isOverdue: false, totalMinutes: 0, days: 0, hrs: 0, mins: 0, formatted: '' };
  };

  const overdueInfo = getOverdueDetails();

  // Financial Engine with Editable Late Fee and Editable Refund Amount
  const autoLateFee = selectedRental
    ? calculateLateFee(selectedRental.expectedReturnDate, undefined, selectedRental.dailyRate, selectedRental.quantity)
    : 0;

  const effectiveLateFee = customLateFee !== '' ? Math.max(0, Number(customLateFee)) : autoLateFee;
  const isLateFeeModified = customLateFee !== '' && Number(customLateFee) !== autoLateFee;

  // Formula: Refundable = Deposit - Rent - Late Fee - Damage Fee
  const autoRefundAmount = selectedRental
    ? (selectedRental.securityDeposit - selectedRental.totalRentAmount - effectiveLateFee - damageFee)
    : 0;

  const effectiveRefundAmount = customRefundAmount !== '' ? Number(customRefundAmount) : autoRefundAmount;
  const isRefundModified = customRefundAmount !== '' && Number(customRefundAmount) !== autoRefundAmount;

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
      const totalExtraFees = effectiveLateFee + damageFee;

      returnRental(selectedRental.id, totalExtraFees, selectedReturnFiles);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedRental(null);
    setDamageFee(0);
    setCustomLateFee('');
    setCustomRefundAmount('');
    setReturnImages([]);
    setSelectedReturnFiles([]);
    onClose();
  };

  const customerObj = selectedRental ? customers.find(c => c.id === selectedRental.customerId) : null;
  const productObj = selectedRental ? products.find(p => p.id === selectedRental.productId) : null;

  // Format Date + Time
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const parsed = parseISO(dateStr);
      if (dateStr.includes('T') || dateStr.includes(':')) {
        return format(parsed, 'MMM dd, yyyy @ hh:mm a');
      }
      return format(parsed, 'MMM dd, yyyy');
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Rental Check-In">
      <div className="space-y-3.5">
        {/* Dropdown if no rental pre-selected */}
        {!rental && (
          <div className="space-y-1">
            <label className="text-[8px] font-bold uppercase text-gray-400 tracking-wider ml-0.5">Select Active Rental *</label>
            <div className="relative group">
              <select
                value={selectedRental?.id || ''}
                onChange={(e) => {
                  const r = activeRentals.find(item => item.id === e.target.value);
                  setSelectedRental(r || null);
                }}
                className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-slate-200 focus:bg-white focus:border-[#8B5CF6] rounded-xl outline-none font-bold text-xs text-gray-900 appearance-none cursor-pointer"
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
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={13} strokeWidth={2.5} />
            </div>
          </div>
        )}

        {selectedRental ? (
          <>
            {/* Customer Details Header */}
            <div className="p-3 bg-gray-50 border border-slate-200/80 rounded-xl space-y-1 text-left">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[8px] font-bold uppercase text-gray-400 tracking-wider">Customer Details</span>
                  <h4 className="font-bold text-gray-900 text-xs">{customerObj?.name || 'Customer'}</h4>
                  <p className="text-[9.5px] text-gray-500 font-medium">{customerObj?.phone || 'No phone'} • {customerObj?.address || 'No address'}</p>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-bold uppercase text-gray-400 tracking-wider">Product & Qty</span>
                  <h4 className="font-bold text-gray-900 text-xs">{productObj?.name || 'Product'}</h4>
                  <p className="text-[9.5px] text-gray-500 font-bold">Qty: {selectedRental.quantity}</p>
                </div>
              </div>
            </div>

            {/* Overdue Warning Banner (With Hours & Minutes) */}
            {overdueInfo.isOverdue && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5">
                <Clock size={15} className="text-rose-600 shrink-0 animate-pulse" strokeWidth={2.5} />
                <div>
                  <span className="text-[8px] font-bold uppercase tracking-wider text-rose-700">Late Return Warning</span>
                  <p className="text-[10px] font-bold text-rose-950 leading-tight mt-0.5">
                    Late by <span className="font-mono font-bold text-rose-700 underline">{overdueInfo.formatted}</span>.
                  </p>
                </div>
              </div>
            )}

            {/* Condition Photos At Rent */}
            {selectedRental.images && selectedRental.images.length > 0 && (
              <div className="space-y-1">
                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Condition Photos (At Rent)</p>
                <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
                  {selectedRental.images.map((img, i) => (
                    <img key={i} src={img} alt="proof" className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0" />
                  ))}
                </div>
              </div>
            )}

            {/* Grid: Start Date (with Time), Expected Return, Security Deposit & Rent */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-gray-50 rounded-xl border border-slate-200/80 text-left">
              <div>
                <p className="text-gray-400 text-[8px] uppercase font-bold tracking-wider">Start Date & Time</p>
                <p className="font-bold text-gray-900 text-[9.5px] font-mono leading-tight">{formatDateTime(selectedRental.startDate)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-[8px] uppercase font-bold tracking-wider">Expected Return</p>
                <p className="font-bold text-gray-900 text-[9.5px] font-mono leading-tight">{formatDateTime(selectedRental.expectedReturnDate)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-[8px] uppercase font-bold tracking-wider">Security Deposit</p>
                <p className="font-bold text-[#8B5CF6] text-[11px] font-mono">{formatCurrency(selectedRental.securityDeposit)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-[8px] uppercase font-bold tracking-wider">Total Rent Amount</p>
                <p className="font-bold text-gray-900 text-[11px] font-mono">{formatCurrency(selectedRental.totalRentAmount)}</p>
              </div>
            </div>

            {/* Editable Fees Row: Late Fee & Damage Fee */}
            <div className="grid grid-cols-2 gap-2">
              {/* Editable Late Fee */}
              <div className="space-y-1">
                <div className="flex justify-between items-center px-0.5">
                  <label className="text-[8px] font-bold uppercase text-gray-400 tracking-wider">Late Fee *</label>
                  {isLateFeeModified && (
                    <button
                      type="button"
                      onClick={() => setCustomLateFee('')}
                      className="text-[7px] font-bold text-rose-500 hover:underline uppercase flex items-center gap-0.5"
                    >
                      <RotateCcw size={7} /> Reset (₹{autoLateFee})
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <IndianRupee className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${isLateFeeModified ? 'text-rose-500' : 'text-gray-400 group-focus-within:text-[#8B5CF6]'}`} size={13} strokeWidth={2.5} />
                  <input
                    type="number"
                    value={customLateFee !== '' ? customLateFee : (autoLateFee > 0 ? autoLateFee : '0')}
                    onChange={e => setCustomLateFee(e.target.value)}
                    className={`w-full pl-7 pr-2 py-2 border rounded-xl outline-none font-bold text-xs ${isLateFeeModified ? 'bg-rose-50/60 border-rose-300 text-rose-950' : 'bg-gray-50 border-slate-200 focus:bg-white focus:border-[#8B5CF6] text-gray-900'}`}
                    placeholder={String(autoLateFee)}
                  />
                </div>
              </div>

              {/* Editable Damage Fee */}
              <div className="space-y-1">
                <label className="text-[8px] font-bold uppercase text-gray-400 tracking-wider px-0.5">Damage / Cleaning Fee *</label>
                <div className="relative group">
                  <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#8B5CF6]" size={13} strokeWidth={2.5} />
                  <input
                    type="number"
                    value={damageFee}
                    onChange={e => setDamageFee(Number(e.target.value))}
                    className="w-full pl-7 pr-2 py-2 bg-gray-50 border border-slate-200 focus:bg-white focus:border-[#8B5CF6] rounded-xl outline-none font-bold text-gray-900 text-xs"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Editable Refundable Amount / Final Settlement */}
            <div className={`p-3 rounded-xl border space-y-2 ${effectiveRefundAmount >= 0 ? 'bg-emerald-50/80 border-emerald-200' : 'bg-rose-50/80 border-rose-200'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-wider opacity-70">Refundable Settlement Amount</p>
                  <p className="text-[7.5px] font-medium text-gray-500 mt-0.5">
                    Deposit ({formatCurrency(selectedRental.securityDeposit)}) - Rent ({formatCurrency(selectedRental.totalRentAmount)}) - Late ({formatCurrency(effectiveLateFee)}) - Damage ({formatCurrency(damageFee)})
                  </p>
                </div>
                {isRefundModified && (
                  <button
                    type="button"
                    onClick={() => setCustomRefundAmount('')}
                    className="text-[7.5px] font-bold text-gray-600 hover:underline uppercase flex items-center gap-0.5 bg-white px-2 py-0.5 rounded-lg border border-slate-200"
                  >
                    <RotateCcw size={8} /> Auto Formula (₹{autoRefundAmount})
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 group">
                  <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-600" size={13} strokeWidth={2.5} />
                  <input
                    type="number"
                    value={customRefundAmount !== '' ? customRefundAmount : (autoRefundAmount !== 0 ? autoRefundAmount : '0')}
                    onChange={e => setCustomRefundAmount(e.target.value)}
                    className={`w-full pl-7 pr-3 py-2 border rounded-xl outline-none font-mono font-bold text-sm ${effectiveRefundAmount >= 0 ? 'bg-white border-emerald-300 text-emerald-950' : 'bg-white border-rose-300 text-rose-950'}`}
                    placeholder={String(autoRefundAmount)}
                  />
                </div>
                <div className={`px-3 py-2 rounded-xl font-bold text-xs font-mono shrink-0 ${effectiveRefundAmount >= 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                  {effectiveRefundAmount >= 0 ? `Refund Customer` : `Collect Balance`}
                </div>
              </div>
            </div>

            {/* Return Condition Photos Upload */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-gray-100"></div>
                <h4 className="text-[8px] font-bold uppercase text-gray-400 tracking-wider">Return Condition Photos</h4>
                <div className="h-px flex-1 bg-gray-100"></div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {returnImages.map((img, i) => (
                  <div key={i} className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 group">
                    <img src={img} alt="return proof" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeReturnImage(i)} className="absolute top-0.5 right-0.5 bg-rose-500 text-white p-0.5 rounded opacity-0 group-hover:opacity-100 transition-all">
                      <X size={9} strokeWidth={3} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="w-12 h-12 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:border-[#8B5CF6] hover:text-[#8B5CF6] hover:bg-[#8B5CF6]/5 transition-all group"
                  onClick={() => returnFileInputRef.current?.click()}
                >
                  <Upload size={12} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[7px] font-bold uppercase tracking-wider">Add</span>
                </button>
              </div>
              <input type="file" ref={returnFileInputRef} onChange={handleReturnImageChange} accept="image/*" multiple className="hidden" />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={handleClose} className="flex-1 py-2 rounded-xl font-bold uppercase tracking-wider text-[9.5px] text-gray-500 border border-slate-200 hover:border-slate-300">Cancel</button>
              <button type="button" onClick={handleConfirmReturn} className="flex-1 py-2 rounded-xl font-bold uppercase tracking-wider text-[9.5px] bg-[#8B5CF6] text-white hover:bg-[#7C3AED] shadow-md shadow-[#8B5CF6]/20">Confirm Return</button>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <AlertCircle size={24} className="mx-auto mb-2 opacity-50" />
            <p className="text-[10px] font-bold uppercase tracking-wider">No active rentals available or select one from the list above</p>
          </div>
        )}
      </div>
    </Modal>
  );
};
