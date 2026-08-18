import React from 'react';
import { User, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { Modal } from '../Shared';
import { useApp } from '../../store/AppContext';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({ isOpen, onClose }) => {
  const { addCustomer } = useApp();

  const handleAddCustomer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    addCustomer({
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      address: formData.get('address') as string,
      gstin: formData.get('gstin') as string,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Customer">
      <form onSubmit={handleAddCustomer} className="space-y-5">
        <div className="space-y-2">
          <label className="text-[9px] font-bold uppercase text-gray-400 tracking-widest ml-2">Full Name</label>
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-900 transition-colors" size={18} strokeWidth={3} />
            <input name="name" required className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl outline-none transition-all font-bold text-[10px] uppercase tracking-widest text-gray-900" placeholder="John Doe" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[9px] font-bold uppercase text-gray-400 tracking-widest ml-2">Phone</label>
            <div className="relative group">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-900 transition-colors" size={18} strokeWidth={3} />
              <input name="phone" required className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl outline-none transition-all font-bold text-[10px] uppercase tracking-widest text-gray-900" placeholder="9876543210" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-bold uppercase text-gray-400 tracking-widest ml-2">Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-900 transition-colors" size={18} strokeWidth={3} />
              <input name="email" type="email" required className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl outline-none transition-all font-bold text-[10px] uppercase tracking-widest text-gray-900" placeholder="john@example.com" />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[9px] font-bold uppercase text-gray-400 tracking-widest ml-2">Address</label>
          <div className="relative group">
            <MapPin className="absolute left-4 top-4 text-gray-400 group-focus-within:text-gray-900 transition-colors" size={18} strokeWidth={3} />
            <textarea name="address" required className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl outline-none transition-all font-bold text-[10px] uppercase tracking-widest text-gray-900 h-24 resize-none" placeholder="Full billing address"></textarea>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[9px] font-bold uppercase text-gray-400 tracking-widest ml-2">GSTIN (Optional)</label>
          <div className="relative group">
            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-900 transition-colors" size={18} strokeWidth={3} />
            <input name="gstin" className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl outline-none transition-all font-bold text-[10px] uppercase tracking-widest text-gray-900" placeholder="Tax Identification Number" />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 pt-6">
          <button type="button" onClick={onClose} className="w-full sm:flex-1 h-14 rounded-xl font-bold uppercase tracking-widest text-[9px] text-gray-400 border border-gray-200/60">Cancel</button>
          <button type="submit" className="banana-btn w-full sm:flex-1 h-14 text-[9px]">Save Customer</button>
        </div>
      </form>
    </Modal>
  );
};
