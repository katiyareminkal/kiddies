import React, { useState, useRef, useMemo, useEffect } from 'react';
import { differenceInDays, parseISO, addDays, format } from 'date-fns';
import {
  AlertCircle,
  User,
  ChevronDown,
  Package,
  Hash,
  IndianRupee,
  Upload,
  X,
  Plus,
  Tag,
  RotateCcw,
  CheckCircle,
  Clock,
  CalendarCheck
} from 'lucide-react';
import { Modal } from '../Shared';
import { useApp } from '../../store/AppContext';
import { formatCurrency } from '../../utils/helpers';
import { PaymentStatus, RentalStatus } from '../../types';

interface NewRentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProductId?: string;
  initialStartDate?: string;
  initialExpectedReturnDate?: string;
  initialMode?: 'IMMEDIATE' | 'RESERVATION';
}

export const NewRentalModal: React.FC<NewRentalModalProps> = ({
  isOpen,
  onClose,
  initialProductId,
  initialStartDate,
  initialExpectedReturnDate,
  initialMode
}) => {
  const { products, customers, addCustomer, addRental } = useApp();

  // Mode switcher: Immediate rental vs Advance reservation
  const [bookingType, setBookingType] = useState<'IMMEDIATE' | 'RESERVATION'>('IMMEDIATE');

  // Custom quick customer creation states
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  // Controlled form states for dynamic real-time financial calculations
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const currentTimeStr = format(new Date(), 'HH:mm');
  const defaultReturnStr = format(addDays(new Date(), 3), 'yyyy-MM-dd');

  const [startDate, setStartDate] = useState<string>(todayStr);
  const [startTime, setStartTime] = useState<string>(currentTimeStr);
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>(defaultReturnStr);
  const [securityDeposit, setSecurityDeposit] = useState<string>('');
  const [customRentalAmount, setCustomRentalAmount] = useState<string>('');

  // Synchronize when modal opens with prefilled data
  useEffect(() => {
    if (isOpen) {
      if (initialMode) setBookingType(initialMode);
      if (initialProductId) setSelectedProductId(initialProductId);
      if (initialStartDate) setStartDate(initialStartDate);
      if (initialExpectedReturnDate) setExpectedReturnDate(initialExpectedReturnDate);
    }
  }, [isOpen, initialMode, initialProductId, initialStartDate, initialExpectedReturnDate]);

  // Selected product & calculated breakdown
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

  const dailyRate = selectedProduct?.rentalPrice || 0;
  const autoRentalAmount = rentalDays * dailyRate * (quantity || 1);

  // Effective rental amount (either manual custom/discounted or auto-calculated)
  const effectiveRentalAmount = customRentalAmount !== '' ? Math.max(0, Number(customRentalAmount)) : autoRentalAmount;
  const isDiscounted = customRentalAmount !== '' && Number(customRentalAmount) !== autoRentalAmount;
  const actualDiscount = Math.max(0, autoRentalAmount - effectiveRentalAmount);

  const numericDeposit = Number(securityDeposit) || 0;

  // Net Refundable Amount = Security Deposit - Rental Amount
  const netRefundable = Math.max(0, numericDeposit - effectiveRentalAmount);

  const handleSaveCustomerInline = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      alert("Name and Phone are required to add a customer.");
      return;
    }
    setIsSavingCustomer(true);
    try {
      const newId = await addCustomer({
        name: newCustName,
        phone: newCustPhone,
        email: newCustEmail,
        address: newCustAddress,
        gstin: ''
      });
      if (newId) {
        setSelectedCustomerId(newId);
        setIsAddingCustomer(false);
        setNewCustName('');
        setNewCustPhone('');
        setNewCustEmail('');
        setNewCustAddress('');
      } else {
        alert("Failed to create customer.");
      }
    } catch (err) {
      alert("Error creating customer.");
    } finally {
      setIsSavingCustomer(false);
    }
  };

  // Image Upload State
  const [rentalImages, setRentalImages] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      setSelectedFiles(prev => [...prev, ...validFiles]);
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setRentalImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setRentalImages(prev => prev.filter((_, i) => i !== index));
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateRental = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedProductId) {
      alert("Please select a product for rental.");
      return;
    }

    if (!selectedCustomerId) {
      alert("Please select a customer first.");
      return;
    }

    const startISO = `${startDate || todayStr}T${startTime || currentTimeStr}`;

    if (selectedProduct) {
      addRental({
        customerId: selectedCustomerId,
        productId: selectedProductId,
        quantity: quantity || 1,
        startDate: startISO,
        expectedReturnDate: expectedReturnDate || defaultReturnStr,
        dailyRate: selectedProduct.rentalPrice,
        securityDeposit: numericDeposit,
        totalRentAmount: effectiveRentalAmount,
        paidAmount: numericDeposit, // Deposit collected upfront
        paymentStatus: numericDeposit >= effectiveRentalAmount ? PaymentStatus.PAID : PaymentStatus.PARTIAL,
        status: bookingType === 'RESERVATION' ? RentalStatus.RESERVED : RentalStatus.ACTIVE,
        images: rentalImages,
      }, selectedFiles);

      handleResetAndClose();
    }
  };

  const handleResetAndClose = () => {
    setRentalImages([]);
    setSelectedFiles([]);
    setSelectedCustomerId('');
    setSelectedProductId('');
    setQuantity(1);
    setStartDate(todayStr);
    setStartTime(currentTimeStr);
    setExpectedReturnDate(defaultReturnStr);
    setSecurityDeposit('');
    setCustomRentalAmount('');
    setIsAddingCustomer(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetAndClose}
      title={bookingType === 'RESERVATION' ? 'Advance Reservation Booking' : 'Create New Rental'}
    >
      <form onSubmit={handleCreateRental} className="space-y-3">
        {/* Booking Mode Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold gap-1">
          <button
            type="button"
            onClick={() => setBookingType('IMMEDIATE')}
            className={bookingType === 'IMMEDIATE' ? 'flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 bg-white text-slate-900 shadow-xs' : 'flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-800'}
          >
            <span>⚡ Instant Rental</span>
            <span className="text-[9px] font-normal text-slate-400 hidden sm:inline">(Handover today)</span>
          </button>
          <button
            type="button"
            onClick={() => setBookingType('RESERVATION')}
            className={bookingType === 'RESERVATION' ? 'flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 bg-[#fe569f] text-white shadow-xs' : 'flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-800'}
          >
            <CalendarCheck size={13} className={bookingType === 'RESERVATION' ? 'text-white' : 'text-slate-400'} />
            <span>Advance Reservation</span>
            <span className={bookingType === 'RESERVATION' ? 'text-[9px] font-normal text-pink-100 hidden sm:inline' : 'text-[9px] font-normal text-slate-400 hidden sm:inline'}>(Future event)</span>
          </button>
        </div>

        {/* Top Stock Notice */}
        <div className={bookingType === 'RESERVATION' ? 'px-3 py-2 rounded-md border flex items-center gap-2 bg-amber-50 border-amber-200' : 'px-3 py-2 rounded-md border flex items-center gap-2 bg-[#fe569f]/10 border-[#fe569f]/20'}>
          <AlertCircle size={14} className={bookingType === 'RESERVATION' ? 'text-amber-600 shrink-0' : 'text-[#fe569f] shrink-0'} strokeWidth={2.2} />
          <p className="text-[10px] font-bold text-slate-700 leading-tight">
            {bookingType === 'RESERVATION'
              ? 'Advance booking: Garment stock is reserved on the rack for upcoming function date. Handover is recorded when customer collects.'
              : 'Stock deducted from Rental Pool. Net Refundable = Deposit - Rent.'}
          </p>
        </div>

        {/* Customer Selection */}
        <div className="space-y-1">
          <div className="flex justify-between items-center px-0.5">
            <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Customer *</label>
            <button
              type="button"
              onClick={() => setIsAddingCustomer(!isAddingCustomer)}
              className="text-[9px] font-extrabold uppercase text-[#fe569f] hover:underline tracking-wider transition-colors flex items-center gap-0.5"
            >
              <Plus size={10} strokeWidth={3} /> Quick Add
            </button>
          </div>

          {!isAddingCustomer ? (
            <div className="relative group">
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#fe569f] transition-colors" size={13} strokeWidth={2.2} />
              <select
                name="customerId"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                required
                className="w-full pl-7 pr-6 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#fe569f] rounded-md outline-none transition-all font-bold text-xs text-slate-900 appearance-none cursor-pointer"
              >
                <option value="" disabled>Select Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone || 'No phone'})</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} strokeWidth={2.2} />
            </div>
          ) : (
            <div className="p-2.5 border border-slate-200 rounded-md bg-slate-50 space-y-2 text-left">
              <input
                type="text"
                placeholder="Customer Name *"
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-bold outline-none focus:border-[#fe569f]"
              />
              <input
                type="text"
                placeholder="Phone Number *"
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-bold outline-none focus:border-[#fe569f]"
              />
              <div className="flex gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setIsAddingCustomer(false)}
                  className="flex-1 py-1.5 border border-slate-200 text-slate-500 hover:text-slate-700 rounded-md text-[9px] font-extrabold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomerInline}
                  disabled={isSavingCustomer}
                  className="flex-1 py-1.5 bg-[#fe569f] text-white hover:bg-[#eb4890] rounded-md text-[9px] font-extrabold uppercase tracking-wider disabled:opacity-50 transition-colors"
                >
                  {isSavingCustomer ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Product Selection */}
        <div className="space-y-1">
          <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider px-0.5">Product Outfit *</label>
          <div className="relative group">
            <Package className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#fe569f] transition-colors" size={13} strokeWidth={2.2} />
            <select
              name="productId"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              required
              className="w-full pl-7 pr-6 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#fe569f] rounded-md outline-none transition-all font-bold text-xs text-slate-900 appearance-none cursor-pointer"
            >
              <option value="" disabled>Select Product</option>
              {products
                .filter(p => p.purpose === 'RENTAL' || p.purpose === 'HYBRID')
                .map(p => {
                  const avail = p.rentalStock > 0 ? p.rentalStock : (p.purpose === 'HYBRID' ? p.saleStock : 0);
                  const isShared = p.rentalStock === 0 && p.purpose === 'HYBRID' && p.saleStock > 0;
                  return (
                    <option key={p.id} value={p.id} disabled={avail === 0}>
                      {p.name} ({formatCurrency(p.rentalPrice)}/d) - Avail: {avail} {isShared ? '(Sale Stock)' : ''}
                    </option>
                  );
                })}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} strokeWidth={2.2} />
          </div>
        </div>

        {/* Start Date & Expected Return Date */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider px-0.5">Start Date *</label>
            <input
              name="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#fe569f] rounded-md outline-none font-bold text-xs text-slate-900"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider px-0.5">Return Date *</label>
            <input
              name="expectedReturnDate"
              type="date"
              value={expectedReturnDate}
              onChange={(e) => setExpectedReturnDate(e.target.value)}
              required
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#fe569f] rounded-md outline-none font-bold text-xs text-slate-900"
            />
          </div>
        </div>

        {/* Quantity & Start Time */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider px-0.5">Quantity *</label>
            <input
              name="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              min="1"
              required
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#fe569f] rounded-md outline-none font-bold text-xs text-slate-900"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider px-0.5">Start Time *</label>
            <div className="relative group">
              <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#fe569f]" size={13} strokeWidth={2.2} />
              <input
                name="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full pl-7 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#fe569f] rounded-md outline-none font-bold text-xs text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Security Deposit & Rental Amount */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <div className="flex justify-between items-center px-0.5">
              <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Deposit *</label>
              <span className="text-[8px] font-extrabold text-[#01a9fb] uppercase tracking-wider">Gross</span>
            </div>
            <div className="relative group">
              <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#01a9fb] transition-colors" size={13} strokeWidth={2.2} />
              <input
                name="securityDeposit"
                type="number"
                value={securityDeposit}
                onChange={(e) => setSecurityDeposit(e.target.value)}
                required
                className="w-full pl-7 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-md outline-none font-bold text-xs text-slate-900"
                placeholder="5000"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center px-0.5">
              <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Rent Total *</label>
              {isDiscounted && (
                <button
                  type="button"
                  onClick={() => setCustomRentalAmount('')}
                  className="text-[8px] font-bold text-rose-500 hover:underline uppercase tracking-wider flex items-center gap-0.5"
                >
                  <RotateCcw size={8} /> Reset
                </button>
              )}
            </div>
            <div className="relative group">
              <IndianRupee className={`absolute left-2.5 top-1/2 -translate-y-1/2 transition-colors ${isDiscounted ? 'text-amber-500' : 'text-slate-400 group-focus-within:text-[#fe569f]'}`} size={13} strokeWidth={2.2} />
              <input
                name="rentalAmount"
                type="number"
                value={customRentalAmount !== '' ? customRentalAmount : (autoRentalAmount > 0 ? autoRentalAmount : '')}
                onChange={(e) => setCustomRentalAmount(e.target.value)}
                required
                className={`w-full pl-7 pr-2.5 py-1.5 border rounded-md outline-none transition-all font-bold text-xs ${isDiscounted ? 'bg-amber-50/60 border-amber-300 text-amber-950 focus:bg-white focus:border-amber-500' : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-[#fe569f] text-slate-900'}`}
                placeholder={String(autoRentalAmount)}
              />
            </div>
          </div>
        </div>

        {/* Compact Real-time Financial Breakdown Summary */}
        <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-md space-y-1 text-left">
          <div className="flex justify-between items-center text-[10px]">
            <span className="font-extrabold text-slate-500 uppercase tracking-wider text-[9px]">Rate Breakdown</span>
            <span className="font-bold text-slate-700 font-mono text-[10px]">
              {selectedProduct ? `${formatCurrency(dailyRate)}/d × ${rentalDays}d × ${quantity} = ${formatCurrency(autoRentalAmount)}` : 'Select product'}
            </span>
          </div>

          <div className="pt-1.5 border-t border-slate-200 flex justify-between items-center">
            <div>
              <span className="font-extrabold text-emerald-700 uppercase tracking-wider text-[10px]">Net Refundable</span>
              <p className="text-[8px] font-bold text-slate-400">
                Deposit ({formatCurrency(numericDeposit)}) - Rent ({formatCurrency(effectiveRentalAmount)})
              </p>
            </div>
            <span className="font-black text-emerald-700 font-mono text-sm">{formatCurrency(netRefundable)}</span>
          </div>
        </div>

        {/* Conditions / ID Proof Upload */}
        <div className="space-y-1 pt-0.5">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-slate-100"></div>
            <h4 className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Conditions / ID Proof</h4>
            <div className="h-px flex-1 bg-slate-100"></div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {rentalImages.map((img, i) => (
              <div key={i} className="relative w-11 h-11 rounded-md overflow-hidden border border-slate-200 group">
                <img src={img} alt="proof" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImage(i)} className="absolute top-0.5 right-0.5 bg-rose-500 text-white p-0.5 rounded opacity-0 group-hover:opacity-100 transition-all">
                  <X size={9} strokeWidth={3} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="w-11 h-11 rounded-md border border-dashed border-slate-300 flex flex-col items-center justify-center gap-0.5 text-slate-400 hover:border-[#fe569f] hover:text-[#fe569f] hover:bg-[#fe569f]/5 transition-all group"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={13} strokeWidth={2.2} className="group-hover:scale-110 transition-transform" />
              <span className="text-[8px] font-extrabold uppercase tracking-wider">Add</span>
            </button>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" multiple className="hidden" />
        </div>

        {/* Form Action Buttons */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleResetAndClose}
            className="flex-1 py-2 rounded-md font-bold uppercase tracking-wider text-[10px] text-slate-600 border border-slate-200 hover:border-slate-300 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 py-2 rounded-md font-extrabold uppercase tracking-wider text-[10px] bg-[#fe569f] hover:bg-[#eb4890] text-white shadow-xs transition-all active:scale-95"
          >
            {bookingType === 'RESERVATION' ? 'Confirm Advance Reservation' : 'Issue Rental Booking'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
