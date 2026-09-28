import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  Smartphone,
  Copy,
  Check,
  Calendar,
  Package,
  User,
  AlertTriangle,
  Clock,
  Sparkles,
  Phone
} from 'lucide-react';
import { Modal } from '../Shared';
import { useApp } from '../../store/AppContext';
import { Rental, Customer, Product, RentalStatus } from '../../types';
import {
  openWhatsApp,
  openSMS,
  buildRentalReturnReminderMessage,
  buildReservationConfirmationMessage,
  cleanWhatsAppNumber,
  cleanSMSNumber
} from '../../utils/whatsapp';
import { format, parseISO, isBefore, isSameDay } from 'date-fns';

interface RentalReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  rental: Rental | null;
}

export const RentalReminderModal: React.FC<RentalReminderModalProps> = ({
  isOpen,
  onClose,
  rental
}) => {
  const { customers, products, storeProfile } = useApp();

  const customer = customers.find(c => c.id === rental?.customerId);
  const product = products.find(p => p.id === rental?.productId);

  const [messageText, setMessageText] = useState('');
  const [copied, setCopied] = useState(false);
  const [customNote, setCustomNote] = useState('');

  const isReserved = rental?.status === RentalStatus.RESERVED;
  const isReturned = rental?.status === RentalStatus.RETURNED;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const returnDate = rental?.expectedReturnDate ? parseISO(rental.expectedReturnDate) : today;
  returnDate.setHours(0, 0, 0, 0);

  const isDueToday = isSameDay(returnDate, today) && rental?.status === RentalStatus.ACTIVE;
  const isOverdue = isBefore(returnDate, today) && rental?.status === RentalStatus.ACTIVE;

  // Generate template message when rental changes
  useEffect(() => {
    if (!rental) {
      setMessageText('');
      setCustomNote('');
      return;
    }

    let text = '';
    if (isReserved) {
      text = buildReservationConfirmationMessage(customer, rental, product, storeProfile);
    } else {
      text = buildRentalReturnReminderMessage(customer, rental, product, storeProfile);
    }

    if (customNote.trim()) {
      text = `${text}\n\n*Note:* ${customNote.trim()}`;
    }

    setMessageText(text);
  }, [rental, customer, product, storeProfile, isReserved, customNote]);

  if (!rental) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const handleSendWhatsApp = () => {
    if (!customer?.phone) {
      alert('Please add a phone number for this customer first.');
      return;
    }
    openWhatsApp(customer.phone, messageText);
    onClose();
  };

  const handleSendSMS = () => {
    if (!customer?.phone) {
      alert('Please add a phone number for this customer first.');
      return;
    }
    openSMS(customer.phone, messageText);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        {/* Header Badge & Title */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                isOverdue
                  ? 'bg-rose-100 text-rose-700'
                  : isDueToday
                  ? 'bg-amber-100 text-amber-800'
                  : isReserved
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {isOverdue
                  ? '⚠️ Overdue Return'
                  : isDueToday
                  ? '⏰ Due Today'
                  : isReserved
                  ? '📅 Advance Reservation'
                  : '👗 Active Rental'}
              </span>
              <span className="text-xs font-mono text-slate-400 font-bold">#{rental.invoiceNumber}</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {isReserved ? 'Send Reservation Details' : 'Send Return Reminder'}
            </h3>
            <p className="text-xs text-slate-500">
              Notify customer directly through WhatsApp or standard SMS
            </p>
          </div>
        </div>

        {/* Customer & Booking Summary Card */}
        <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#fe569f]/10 text-[#fe569f] font-black flex items-center justify-center shrink-0">
              <User size={16} />
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-slate-900 truncate">{customer?.name || 'Customer'}</p>
              <p className="text-slate-500 font-mono text-[11px] flex items-center gap-1">
                <Phone size={11} className="text-slate-400" />
                {customer?.phone || 'No phone number'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#01a9fb]/10 text-[#01a9fb] font-black flex items-center justify-center shrink-0">
              <Package size={16} />
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-slate-900 truncate">{product?.name || 'Rental Garment'}</p>
              <p className="text-slate-500 text-[11px] flex items-center gap-1 font-semibold">
                <Calendar size={11} className="text-slate-400" />
                Due: {rental.expectedReturnDate ? format(parseISO(rental.expectedReturnDate), 'dd MMM yyyy') : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Optional Custom Note */}
        <div className="space-y-1">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Optional Custom Note / Store Instruction
          </label>
          <input
            type="text"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="e.g. Please return by 7:00 PM today; store closes at 8:00 PM"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:border-[#fe569f] outline-none transition-all"
          />
        </div>

        {/* Message Preview Box */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Message Content Preview
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-100 transition-colors"
            >
              {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>
          </div>
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            rows={8}
            className="w-full p-3 bg-slate-50 font-mono text-xs text-slate-800 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-400 outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Action Buttons: WhatsApp & SMS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <MessageSquare size={16} />
            <span>Send via WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleSendSMS}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <Smartphone size={16} />
            <span>Send via SMS</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
