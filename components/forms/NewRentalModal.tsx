import React, { useState, useRef } from 'react';
import { 
  AlertCircle, 
  User, 
  ChevronDown, 
  Package, 
  Hash, 
  IndianRupee, 
  CreditCard, 
  Upload, 
  X 
} from 'lucide-react';
import { Modal } from '../Shared';
import { useApp } from '../../store/AppContext';
import { formatCurrency, calculateRentalTotal } from '../../utils/helpers';
import { PaymentStatus } from '../../types';

interface NewRentalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewRentalModal: React.FC<NewRentalModalProps> = ({ isOpen, onClose }) => {
  const { products, customers, addRental } = useApp();
  
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
    const formData = new FormData(e.currentTarget);
    const productId = formData.get('productId') as string;
    const qty = Number(formData.get('quantity'));
    const start = formData.get('startDate') as string;
    const end = formData.get('expectedReturnDate') as string;
    const product = products.find(p => p.id === productId);

    if (product) {
      const total = calculateRentalTotal(start, end, product.rentalPrice, qty);
      addRental({
        customerId: formData.get('customerId') as string,
        productId,
        quantity: qty,
        startDate: start,
        expectedReturnDate: end,
        dailyRate: product.rentalPrice,
        securityDeposit: Number(formData.get('securityDeposit')),
        totalRentAmount: total,
        paidAmount: Number(formData.get('paidAmount')),
        paymentStatus: Number(formData.get('paidAmount')) >= total ? PaymentStatus.PAID : PaymentStatus.PARTIAL,
        images: rentalImages,
      }, selectedFiles);
      
      // Reset state and close
      setRentalImages([]);
      setSelectedFiles([]);
      onClose();
    }
  };

  const handleClose = () => {
    setRentalImages([]);
    setSelectedFiles([]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Rental">
      <form onSubmit={handleCreateRental} className="space-y-5">
        <div className="p-4 bg-highlight/5 rounded-3xl border border-highlight/20 flex items-start gap-4">
           <div className="p-2 bg-highlight/20 text-slate-900 rounded-2xl">
              <AlertCircle size={18} strokeWidth={3} />
           </div>
           <div>
               <p className="text-[9px] font-black uppercase tracking-widest text-slate-900 mb-1">Rental Pool Notice</p>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-relaxed">Items will be deducted from the <span className="text-slate-900">Rental Stock</span>.</p>
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
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Customer</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-highlight transition-colors" size={16} strokeWidth={3} />
                <select name="customerId" required className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-[10px] text-slate-900 appearance-none">
                  <option value="" disabled selected>Select Customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} strokeWidth={3} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Product</label>
              <div className="relative group">
                <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-highlight transition-colors" size={16} strokeWidth={3} />
                <select name="productId" required className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-[10px] text-slate-900 appearance-none">
                  <option value="" disabled selected>Select Product</option>
                  {products.map(p => <option key={p.id} value={p.id} disabled={p.rentalStock === 0}>{p.name} ({formatCurrency(p.rentalPrice)}/day) - Avail: {p.rentalStock}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} strokeWidth={3} />
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
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-highlight transition-colors" size={16} strokeWidth={3} />
                <input name="quantity" type="number" defaultValue="1" min="1" required className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-[10px] text-slate-900" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Start Date</label>
              <input name="startDate" type="date" required className="w-full px-4 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-[10px] text-slate-900" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Expected Return</label>
              <input name="expectedReturnDate" type="date" required className="w-full px-4 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-[10px] text-slate-900" />
            </div>
          </div>
        </div>

        {/* Section: Financials */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-100"></div>
            <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Financials</h4>
            <div className="h-px flex-1 bg-slate-100"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Security Deposit</label>
              <div className="relative group">
                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-highlight transition-colors" size={16} strokeWidth={3} />
                <input name="securityDeposit" type="number" required className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-[10px] text-slate-900" placeholder="Refundable amount" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Payment Received</label>
              <div className="relative group">
                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-highlight transition-colors" size={16} strokeWidth={3} />
                <input name="paidAmount" type="number" required className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-2xl outline-none transition-all font-black uppercase tracking-widest text-[10px] text-slate-900" placeholder="Total payment received" />
              </div>
            </div>
          </div>
        </div>

        {/* Section: Proof */}
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
                className="w-24 h-24 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:border-highlight hover:text-highlight hover:bg-highlight/5 transition-all group" 
                onClick={() => fileInputRef.current?.click()}
              >
                 <Upload size={20} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
                 <span className="text-[8px] font-black uppercase tracking-widest">Add <span className="opacity-40">(Max 5MB)</span></span>
              </button>
           </div>
           <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" multiple className="hidden" />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button type="button" onClick={handleClose} className="w-full sm:flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[9px] text-slate-400 border border-slate-100">Cancel</button>
          <button type="submit" className="w-full sm:flex-1 h-14 rounded-2xl shadow-banana font-black uppercase tracking-widest text-[9px] bg-highlight text-slate-900">Issue Rental Invoice</button>
        </div>
      </form>
    </Modal>
  );
};
