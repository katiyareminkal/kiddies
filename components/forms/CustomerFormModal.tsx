import React, { useState } from 'react';
import { User, Phone, Mail, MapPin, FileText, CheckCircle2 } from 'lucide-react';
import { Modal } from '../Shared';
import { useApp } from '../../store/AppContext';
import { Customer } from '../../types';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  customer
}) => {
  const { addCustomer, updateCustomer } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string)?.trim();
    const phone = (formData.get('phone') as string)?.trim();
    const email = (formData.get('email') as string)?.trim() || '';
    const address = (formData.get('address') as string)?.trim() || '';
    const gstin = (formData.get('gstin') as string)?.trim() || '';

    try {
      if (customer) {
        await updateCustomer(customer.id, {
          name,
          phone,
          email,
          address,
          gstin
        });
      } else {
        await addCustomer({
          name,
          phone,
          email,
          address,
          gstin
        });
      }
      onClose();
    } catch (err) {
      console.error('Error saving customer:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customer ? 'Edit Customer Profile' : 'Register New Customer'}
    >
      <form
        key={customer?.id || 'new'}
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div className="space-y-1">
          <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
            Full Customer Name *
          </label>
          <div className="relative group">
            <User
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#01a9fb] transition-colors"
              size={16}
              strokeWidth={2.2}
            />
            <input
              name="name"
              defaultValue={customer?.name || ''}
              required
              className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-xl outline-none font-bold text-xs text-slate-900 transition-all shadow-2xs"
              placeholder="e.g. Ramesh Sharma"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              Phone Number *
            </label>
            <div className="relative group">
              <Phone
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#01a9fb] transition-colors"
                size={16}
                strokeWidth={2.2}
              />
              <input
                name="phone"
                defaultValue={customer?.phone || ''}
                required
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={15}
                onInput={(e: React.FormEvent<HTMLInputElement>) => {
                  e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '');
                }}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-xl outline-none font-mono font-bold text-xs text-slate-900 transition-all shadow-2xs"
                placeholder="10-digit number"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              Email Address (Optional)
            </label>
            <div className="relative group">
              <Mail
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#01a9fb] transition-colors"
                size={16}
                strokeWidth={2.2}
              />
              <input
                name="email"
                type="email"
                defaultValue={customer?.email || ''}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-xl outline-none font-bold text-xs text-slate-900 transition-all shadow-2xs"
                placeholder="customer@email.com"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
            Address / City (Optional)
          </label>
          <div className="relative group">
            <MapPin
              className="absolute left-3.5 top-3 text-slate-400 group-focus-within:text-[#01a9fb] transition-colors"
              size={16}
              strokeWidth={2.2}
            />
            <textarea
              name="address"
              defaultValue={customer?.address || ''}
              className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-xl outline-none font-bold text-xs text-slate-900 h-20 resize-none transition-all shadow-2xs"
              placeholder="Apartment, Street, City"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
            GSTIN / Tax ID (Optional)
          </label>
          <div className="relative group">
            <FileText
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#01a9fb] transition-colors"
              size={16}
              strokeWidth={2.2}
            />
            <input
              name="gstin"
              defaultValue={customer?.gstin || ''}
              className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-xl outline-none font-mono font-bold text-xs text-slate-900 transition-all shadow-2xs"
              placeholder="e.g. 29AAAAA0000A1Z5"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs bg-[#01a9fb] hover:bg-[#0098e6] text-white shadow-xs transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 size={14} />
            <span>{isSubmitting ? 'Saving...' : customer ? 'Update Profile' : 'Save Customer'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
