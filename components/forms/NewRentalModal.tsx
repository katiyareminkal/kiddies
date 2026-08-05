import React, { useState, useRef, useMemo } from 'react';
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
  Clock
} from 'lucide-react';
import { Modal } from '../Shared';
import { useApp } from '../../store/AppContext';
import { formatCurrency } from '../../utils/helpers';
import { PaymentStatus } from '../../types';

interface NewRentalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewRentalModal: React.FC<NewRentalModalProps> = ({ isOpen, onClose }) => {
  const { products, customers, addCustomer, addRental } = useApp();

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
  const discountAmount = autoRentalAmount - effectiveRentalAmount;

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
    <Modal isOpen={isOpen} onClose={handleResetAndClose} title="Create New Rental">
      <form onSubmit={handleCreateRental} className="space-y-2.5">
        {/* Top Stock Notice */}
        <div className="px-2.5 py-1.5 bg-[#8B5CF6]/5 rounded-xl border border-[#8B5CF6]/15 flex items-center gap-2">
          <AlertCircle size={13} className="text-[#8B5CF6] shrink-0" strokeWidth={2.5} />
          <p className="text-[9px] font-medium text-slate-600 leading-tight">
            Stock deducted from <span className="text-[#8B5CF6] font-bold">Rental Pool</span>. Refundable = Deposit - Rent upon return.
          </p>
        </div>

        {/* Customer Selection (Separate Line - Full Width) */}
        <div className="space-y-1">
          <div className="flex justify-between items-center px-0.5">
            <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Customer *</label>
            <button
              type="button"
              onClick={() => setIsAddingCustomer(!isAddingCustomer)}
              className="text-[7.5px] font-black uppercase text-[#8B5CF6] hover:text-slate-900 tracking-wider transition-colors flex items-center gap-0.5"
            >
              <Plus size={8} strokeWidth={3} /> Quick Add
            </button>
          </div>

          {!isAddingCustomer ? (
            <div className="relative group">
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#8B5CF6] transition-colors" size={13} strokeWidth={2.5} />
              <select
                name="customerId"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                required
                className="w-full pl-7 pr-6 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#8B5CF6] rounded-xl outline-none transition-all font-bold text-[11px] text-slate-900 appearance-none cursor-pointer"
              >
                <option value="" disabled>Select Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone || 'No phone'})</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} strokeWidth={2.5} />
            </div>
          ) : (
            <div className="p-2 border border-slate-200 rounded-xl bg-slate-50/50 space-y-1.5 text-left">
              <input
                type="text"
                placeholder="Customer Name *"
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-[#8B5CF6]"
              />
              <input
                type="text"
                placeholder="Phone Number *"
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-[#8B5CF6]"
              />
              <div className="flex gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => setIsAddingCustomer(false)}
                  className="flex-1 py-1 border border-slate-200 text-slate-400 hover:text-slate-600 rounded-lg text-[7.5px] font-black uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomerInline}
                  disabled={isSavingCustomer}
                  className="flex-1 py-1 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-[7.5px] font-black uppercase tracking-wider disabled:opacity-50"
                >
                  {isSavingCustomer ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Product Selection (Separate Line - Full Width) */}
        <div className="space-y-1">
          <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider px-0.5">Product *</label>
          <div className="relative group">
            <Package className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#8B5CF6] transition-colors" size={13} strokeWidth={2.5} />
            <select
              name="productId"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              required
              className="w-full pl-7 pr-6 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#8B5CF6] rounded-xl outline-none transition-all font-bold text-[11px] text-slate-900 appearance-none cursor-pointer"
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
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} strokeWidth={2.5} />
          </div>
        </div>

        {/* Start Date & Expected Return Date in 1 Row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider px-0.5">Start Date *</label>
            <input
              name="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full px-2 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#8B5CF6] rounded-xl outline-none font-bold text-[10px] text-slate-900 uppercase"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider px-0.5">Expected Return *</label>
            <input
              name="expectedReturnDate"
              type="date"
              value={expectedReturnDate}
              onChange={(e) => setExpectedReturnDate(e.target.value)}
              required
              className="w-full px-2 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#8B5CF6] rounded-xl outline-none font-bold text-[10px] text-slate-900 uppercase"
            />
          </div>
        </div>

        {/* Quantity & Start Time in Next Row (Together in 1 Line) */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider px-0.5">Quantity *</label>
            <input
              name="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              min="1"
              required
              className="w-full px-2 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#8B5CF6] rounded-xl outline-none font-bold text-[11px] text-slate-900"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider px-0.5">Start Time *</label>
            <div className="relative group">
              <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#8B5CF6]" size={13} strokeWidth={2.5} />
              <input
                name="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full pl-7 pr-2 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#8B5CF6] rounded-xl outline-none font-bold text-[10px] text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Security Deposit & Rental Amount (Strictly 2 Columns on 1 Row) */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <div className="flex justify-between items-center px-0.5">
              <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Deposit *</label>
              <span className="text-[7px] font-bold text-[#8B5CF6] uppercase tracking-wider">Gross</span>
            </div>
            <div className="relative group">
              <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#8B5CF6] transition-colors" size={13} strokeWidth={2.5} />
              <input
                name="securityDeposit"
                type="number"
                value={securityDeposit}
                onChange={(e) => setSecurityDeposit(e.target.value)}
                required
                className="w-full pl-7 pr-2 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#8B5CF6] rounded-xl outline-none font-bold text-[11px] text-slate-900"
                placeholder="5000"
              />
            </div>
          </div>

          {/* Editable Rental Amount (Allows Manual Discount) */}
          <div className="space-y-1">
            <div className="flex justify-between items-center px-0.5">
              <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Rent Amount *</label>
              {isDiscounted ? (
                <button
                  type="button"
                  onClick={() => setCustomRentalAmount('')}
                  className="text-[7px] font-bold text-rose-500 hover:underline uppercase tracking-wider flex items-center gap-0.5"
                >
                  <RotateCcw size={7} /> Reset (₹{autoRentalAmount})
                </button>
              ) : (
                <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">Discount</span>
              )}
            </div>
            <div className="relative group">
              <Tag className={`absolute left-2.5 top-1/2 -translate-y-1/2 transition-colors ${isDiscounted ? 'text-amber-500' : 'text-slate-400 group-focus-within:text-[#8B5CF6]'}`} size={13} strokeWidth={2.5} />
              <input
                name="rentalAmount"
                type="number"
                value={customRentalAmount !== '' ? customRentalAmount : (autoRentalAmount > 0 ? autoRentalAmount : '')}
                onChange={(e) => setCustomRentalAmount(e.target.value)}
                required
                className={`w-full pl-7 pr-2 py-2 border rounded-xl outline-none transition-all font-bold text-[11px] ${isDiscounted ? 'bg-amber-50/60 border-amber-300 text-amber-950 focus:bg-white focus:border-amber-500' : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-[#8B5CF6] text-slate-900'}`}
                placeholder={String(autoRentalAmount)}
              />
            </div>
          </div>
        </div>

        {/* Compact Real-time Financial Breakdown Summary */}
        <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1 text-left">
          <div className="flex justify-between items-center text-[10px]">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[8px]">Standard Rate</span>
            <span className="font-bold text-slate-700 font-mono text-[9px]">
              {selectedProduct ? `${formatCurrency(dailyRate)}/d × ${rentalDays}d × ${quantity} = ${formatCurrency(autoRentalAmount)}` : 'Select product'}
            </span>
          </div>

          {isDiscounted && (
            <div className="flex justify-between items-center text-[10px]">
              <span className="font-bold text-amber-600 uppercase tracking-wider text-[8px]">Discount</span>
              <span className="font-black text-amber-600 font-mono text-[10px]">-{formatCurrency(discountAmount)}</span>
            </div>
          )}

          <div className="pt-1 border-t border-slate-200/80 flex justify-between items-center">
            <div>
              <span className="font-black text-emerald-600 uppercase tracking-wider text-[9px]">Net Refundable</span>
              <p className="text-[7.5px] font-bold text-slate-400">
                Deposit ({formatCurrency(numericDeposit)}) - Rent ({formatCurrency(effectiveRentalAmount)})
              </p>
            </div>
            <span className="font-black text-emerald-600 font-mono text-xs">{formatCurrency(netRefundable)}</span>
          </div>
        </div>

        {/* Section: Conditions / Proof Upload */}
        <div className="space-y-1 pt-0.5">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-slate-100"></div>
            <h4 className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Conditions / ID Proof</h4>
            <div className="h-px flex-1 bg-slate-100"></div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {rentalImages.map((img, i) => (
              <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 group">
                <img src={img} alt="proof" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImage(i)} className="absolute top-0.5 right-0.5 bg-rose-500 text-white p-0.5 rounded opacity-0 group-hover:opacity-100 transition-all">
                  <X size={9} strokeWidth={3} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="w-12 h-12 rounded-lg border border-dashed border-slate-300 flex flex-col items-center justify-center gap-0.5 text-slate-400 hover:border-[#8B5CF6] hover:text-[#8B5CF6] hover:bg-[#8B5CF6]/5 transition-all group"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={12} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
              <span className="text-[7px] font-black uppercase tracking-wider">Add</span>
            </button>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" multiple className="hidden" />
        </div>

        {/* Form Action Buttons */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleResetAndClose}
            className="flex-1 py-2 rounded-xl font-bold uppercase tracking-wider text-[9.5px] text-slate-500 border border-slate-200 hover:border-slate-300 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 py-2 rounded-xl font-black uppercase tracking-wider text-[9.5px] bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-md shadow-[#8B5CF6]/20 transition-all active:scale-95"
          >
            Issue Rental Invoice
          </button>
        </div>
      </form>
    </Modal>
  );
};
