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
  CheckCircle
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
  const defaultReturnStr = format(addDays(new Date(), 3), 'yyyy-MM-dd');
  const [startDate, setStartDate] = useState<string>(todayStr);
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

    if (selectedProduct) {
      addRental({
        customerId: selectedCustomerId,
        productId: selectedProductId,
        quantity: quantity || 1,
        startDate: startDate || todayStr,
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
    setExpectedReturnDate(defaultReturnStr);
    setSecurityDeposit('');
    setCustomRentalAmount('');
    setIsAddingCustomer(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleResetAndClose} title="Create New Rental Agreement">
      <form onSubmit={handleCreateRental} className="space-y-5">
        <div className="p-3.5 bg-[#8B5CF6]/5 rounded-2xl border border-[#8B5CF6]/15 flex items-start gap-3">
           <div className="p-2 bg-[#8B5CF6]/15 text-[#8B5CF6] rounded-xl shrink-0">
              <AlertCircle size={16} strokeWidth={2.5} />
           </div>
           <div>
               <p className="text-[9px] font-black uppercase tracking-wider text-slate-900 mb-0.5">Rental Stock Pool Notice</p>
               <p className="text-[10px] font-bold text-slate-500 leading-relaxed">Items will be deducted from <span className="text-[#8B5CF6] font-black">Rental Stock</span>. Refundable amount equals Security Deposit minus Rental Fee upon return.</p>
           </div>
        </div>

        {/* Section: Customer & Product */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-100"></div>
            <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Customer & Product</h4>
            <div className="h-px flex-1 bg-slate-100"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-2">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Customer</label>
                <button 
                  type="button" 
                  onClick={() => setIsAddingCustomer(!isAddingCustomer)}
                  className="text-[8.5px] font-black uppercase text-[#8B5CF6] hover:text-slate-900 tracking-widest transition-colors flex items-center gap-1"
                >
                  <Plus size={10} strokeWidth={3} /> Quick Add Customer
                </button>
              </div>
              
              {!isAddingCustomer ? (
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#8B5CF6] transition-colors" size={16} strokeWidth={2.5} />
                  <select 
                    name="customerId" 
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    required 
                    className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/10 rounded-2xl outline-none transition-all font-bold uppercase tracking-wider text-xs text-slate-900 appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select Customer</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone || 'No phone'})</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} strokeWidth={2.5} />
                </div>
              ) : (
                <div className="p-4 border border-slate-100 rounded-2xl bg-slate-50/50 space-y-3 text-left">
                  <div className="space-y-1">
                    <label className="text-[7.5px] font-black uppercase text-slate-400 tracking-widest ml-1">Name *</label>
                    <input 
                      type="text" 
                      placeholder="Customer Name"
                      value={newCustName}
                      onChange={(e) => setNewCustName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[7.5px] font-black uppercase text-slate-400 tracking-widest ml-1">Phone *</label>
                    <input 
                      type="text" 
                      placeholder="Phone Number"
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[7.5px] font-black uppercase text-slate-400 tracking-widest ml-1">Email</label>
                    <input 
                      type="email" 
                      placeholder="Email Address"
                      value={newCustEmail}
                      onChange={(e) => setNewCustEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[7.5px] font-black uppercase text-slate-400 tracking-widest ml-1">Address</label>
                    <textarea 
                      placeholder="Billing Address"
                      value={newCustAddress}
                      onChange={(e) => setNewCustAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none resize-none h-12 focus:border-[#8B5CF6]"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button 
                      type="button" 
                      onClick={() => setIsAddingCustomer(false)}
                      className="flex-1 py-2 border border-slate-200 text-slate-400 hover:text-slate-600 rounded-lg text-[8.5px] font-black uppercase tracking-wider"
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      onClick={handleSaveCustomerInline}
                      disabled={isSavingCustomer}
                      className="flex-1 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-[8.5px] font-black uppercase tracking-wider disabled:opacity-50"
                    >
                      {isSavingCustomer ? 'Saving...' : 'Save Customer'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Product</label>
              <div className="relative group">
                <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#8B5CF6] transition-colors" size={16} strokeWidth={2.5} />
                <select 
                  name="productId" 
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  required 
                  className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/10 rounded-2xl outline-none transition-all font-bold uppercase tracking-wider text-xs text-slate-900 appearance-none cursor-pointer"
                >
                  <option value="" disabled>Select Product</option>
                  {products
                    .filter(p => p.purpose === 'RENTAL' || p.purpose === 'HYBRID')
                    .map(p => {
                      const avail = p.rentalStock > 0 ? p.rentalStock : (p.purpose === 'HYBRID' ? p.saleStock : 0);
                      const isShared = p.rentalStock === 0 && p.purpose === 'HYBRID' && p.saleStock > 0;
                      return (
                        <option key={p.id} value={p.id} disabled={avail === 0}>
                          {p.name} ({formatCurrency(p.rentalPrice)}/day) - Avail: {avail} {isShared ? '(Sale Stock)' : ''}
                        </option>
                      );
                    })}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} strokeWidth={2.5} />
              </div>
            </div>
          </div>
        </div>

        {/* Section: Rental Period */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-100"></div>
            <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Rental Period</h4>
            <div className="h-px flex-1 bg-slate-100"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Quantity</label>
              <div className="relative group">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#8B5CF6] transition-colors" size={16} strokeWidth={2.5} />
                <input 
                  name="quantity" 
                  type="number" 
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  min="1" 
                  required 
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/10 rounded-2xl outline-none transition-all font-bold text-xs text-slate-900" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Start Date</label>
              <input 
                name="startDate" 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/10 rounded-2xl outline-none transition-all font-bold text-xs text-slate-900 uppercase" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Expected Return</label>
              <input 
                name="expectedReturnDate" 
                type="date" 
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
                required 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/10 rounded-2xl outline-none transition-all font-bold text-xs text-slate-900 uppercase" 
              />
            </div>
          </div>
        </div>

        {/* Section: Financials (Security Deposit & Editable Rental Amount) */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-100"></div>
            <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Financials & Security Deposit</h4>
            <div className="h-px flex-1 bg-slate-100"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-2">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Security Deposit</label>
                <span className="text-[8px] font-bold text-[#8B5CF6] uppercase tracking-wider">Gross Deposit</span>
              </div>
              <div className="relative group">
                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#8B5CF6] transition-colors" size={16} strokeWidth={2.5} />
                <input 
                  name="securityDeposit" 
                  type="number" 
                  value={securityDeposit}
                  onChange={(e) => setSecurityDeposit(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/10 rounded-2xl outline-none transition-all font-bold text-xs text-slate-900" 
                  placeholder="e.g. 5000" 
                />
              </div>
            </div>

            {/* Editable Rental Amount (Allows Manual Discount) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-2">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Rental Amount</label>
                {isDiscounted ? (
                  <button 
                    type="button" 
                    onClick={() => setCustomRentalAmount('')}
                    className="text-[8px] font-bold text-rose-500 hover:underline uppercase tracking-wider flex items-center gap-1"
                  >
                    <RotateCcw size={10} /> Reset Auto (₹{autoRentalAmount})
                  </button>
                ) : (
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Editable / Discount</span>
                )}
              </div>
              <div className="relative group">
                <Tag className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDiscounted ? 'text-amber-500' : 'text-slate-400 group-focus-within:text-[#8B5CF6]'}`} size={16} strokeWidth={2.5} />
                <input 
                  name="rentalAmount" 
                  type="number" 
                  value={customRentalAmount !== '' ? customRentalAmount : (autoRentalAmount > 0 ? autoRentalAmount : '')}
                  onChange={(e) => setCustomRentalAmount(e.target.value)}
                  required 
                  className={`w-full pl-12 pr-4 py-3 border rounded-2xl outline-none transition-all font-bold text-xs ${isDiscounted ? 'bg-amber-50/60 border-amber-300 text-amber-950 focus:bg-white focus:border-amber-500' : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-[#8B5CF6] text-slate-900'}`} 
                  placeholder={String(autoRentalAmount)} 
                />
              </div>
            </div>
          </div>

          {/* Real-time Rental Fee, Security Deposit & Net Refundable Breakdown Box */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5 text-left">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Standard Rate</span>
              <span className="font-bold text-slate-700 font-mono text-[10px]">
                {selectedProduct ? `${formatCurrency(dailyRate)}/day × ${rentalDays} day(s) × ${quantity} qty = ${formatCurrency(autoRentalAmount)}` : 'Select product to calculate'}
              </span>
            </div>

            {isDiscounted && (
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-amber-600 uppercase tracking-wider text-[9.5px]">Discount Applied</span>
                <span className="font-black text-amber-600 font-mono text-xs">-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[9.5px]">Final Rental Amount</span>
              <span className="font-black text-slate-900 font-mono text-sm">{formatCurrency(effectiveRentalAmount)}</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[9.5px]">Security Deposit (Held Upfront)</span>
              <span className="font-black text-slate-900 font-mono text-sm">{formatCurrency(numericDeposit)}</span>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
              <div>
                <span className="font-black text-emerald-600 uppercase tracking-wider text-[10.5px]">Net Refundable Amount</span>
                <p className="text-[8.5px] font-bold text-slate-400">
                  Deposit ({formatCurrency(numericDeposit)}) minus Rental Fee ({formatCurrency(effectiveRentalAmount)})
                </p>
              </div>
              <span className="font-black text-emerald-600 font-mono text-base">{formatCurrency(netRefundable)}</span>
            </div>

            {/* Refund Calculation Notice */}
            <div className="mt-2 p-2.5 bg-emerald-50/90 border border-emerald-100 rounded-xl flex items-start gap-2">
              <CheckCircle size={14} className="text-emerald-600 shrink-0 mt-0.5" strokeWidth={2.5} />
              <p className="text-[9.5px] font-bold text-emerald-800 leading-relaxed">
                Refundable to customer upon return: <span className="font-mono font-black text-emerald-950 underline decoration-emerald-400">{formatCurrency(netRefundable)}</span> (Security Deposit {formatCurrency(numericDeposit)} minus Rental Fee {formatCurrency(effectiveRentalAmount)}).
              </p>
            </div>
          </div>
        </div>

        {/* Section: Conditions / Proof */}
        <div className="space-y-4">
           <div className="flex items-center gap-3">
             <div className="h-px flex-1 bg-slate-100"></div>
             <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Conditions / ID Proof</h4>
             <div className="h-px flex-1 bg-slate-100"></div>
           </div>
           <div className="flex gap-3 flex-wrap pt-1">
              {rentalImages.map((img, i) => (
                 <div key={i} className="relative w-24 h-24 rounded-3xl overflow-hidden border border-slate-100 group shadow-nano">
                    <img src={img} alt="proof" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(i)} className="absolute top-2 right-2 bg-rose-500 text-white p-1.5 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100">
                       <X size={12} strokeWidth={3} />
                    </button>
                 </div>
              ))}
              <button 
                type="button"
                className="w-24 h-24 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:border-[#8B5CF6] hover:text-[#8B5CF6] hover:bg-[#8B5CF6]/5 transition-all group" 
                onClick={() => fileInputRef.current?.click()}
              >
                 <Upload size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                 <span className="text-[8px] font-black uppercase tracking-widest">Add <span className="opacity-40">(Max 5MB)</span></span>
              </button>
           </div>
           <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" multiple className="hidden" />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-3">
          <button 
            type="button" 
            onClick={handleResetAndClose} 
            className="w-full sm:flex-1 py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs text-slate-500 border border-slate-200 hover:border-slate-300 transition-all"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="w-full sm:flex-1 py-3.5 rounded-xl font-black uppercase tracking-wider text-xs bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-md shadow-[#8B5CF6]/20 transition-all active:scale-95"
          >
            Issue Rental Invoice
          </button>
        </div>
      </form>
    </Modal>
  );
};
