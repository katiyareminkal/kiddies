import { format, parseISO } from 'date-fns';
import { Customer, Product, Rental, RentalStatus, Sale, StoreProfile } from '../types';
import { formatCurrency } from './helpers';

/**
 * Normalizes an Indian/international phone number for WhatsApp API
 * E.g., '9876543210' -> '919876543210'
 * '+91 98765-43210' -> '919876543210'
 */
export const cleanWhatsAppNumber = (phone?: string): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  return digits;
};

/**
 * Opens a WhatsApp chat with pre-filled encoded text
 */
export const openWhatsApp = (phone?: string, text?: string) => {
  const cleanPhone = cleanWhatsAppNumber(phone);
  const encodedText = encodeURIComponent(text || '');
  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;

  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * One-Click WhatsApp Return Reminder for Due Today / Overdue Rentals
 */
export const sendRentalReturnReminder = (
  customer: Customer | undefined,
  rental: Rental,
  product: Product | undefined,
  store?: StoreProfile
) => {
  const storeName = store?.storeName || 'Kiddies – Kids Wear & Boutique';
  const customerName = customer?.name || 'Valued Customer';
  const productName = product?.name || 'Kids Outfit';
  
  let formattedDueDate = rental.expectedReturnDate;
  try {
    formattedDueDate = format(parseISO(rental.expectedReturnDate), 'dd MMM yyyy (EEE)');
  } catch (e) {}

  const isOverdue = new Date() > new Date(rental.expectedReturnDate);

  let message = `*${storeName} – ${isOverdue ? '⚠️ Rental Return Overdue Reminder' : '👗 Rental Return Reminder'}*\n\n`;
  message += `Dear *${customerName}*,\n\n`;
  
  if (isOverdue) {
    message += `We hope you enjoyed the event! Your rental outfit was scheduled for return on *${formattedDueDate}* and is currently pending check-in.\n\n`;
  } else {
    message += `This is a friendly reminder that your rental outfit is scheduled for return *today / soon* (${formattedDueDate}).\n\n`;
  }

  message += `📋 *Rental Details:*\n`;
  message += `• *Outfit:* ${productName} (Qty: ${rental.quantity})\n`;
  message += `• *Invoice No:* #${rental.invoiceNumber}\n`;
  message += `• *Security Deposit to Refund:* ${formatCurrency(rental.securityDeposit)}\n`;
  if (rental.paidAmount > 0) {
    message += `• *Rent Paid:* ${formatCurrency(rental.paidAmount)}\n`;
  }

  message += `\n✨ *Important Notes:*\n`;
  message += `• Please return the outfit along with any accessories/hangers provided.\n`;
  message += `• Your security deposit will be processed promptly upon inspection.\n\n`;
  message += `📍 *Store Address:* ${store?.address || 'Shop 203, 204 C-30, next to HDFC Bank'}\n`;
  message += `📞 *Helpline:* ${store?.phone || '097134 69928'}\n\n`;
  message += `Thank you for choosing ${storeName}!`;

  openWhatsApp(customer?.phone, message);
};

/**
 * One-Click WhatsApp Advance Reservation Confirmation
 */
export const sendReservationConfirmationWhatsApp = (
  customer: Customer | undefined,
  rental: Rental,
  product: Product | undefined,
  store?: StoreProfile
) => {
  const storeName = store?.storeName || 'Kiddies – Kids Wear & Boutique';
  const customerName = customer?.name || 'Valued Customer';
  const productName = product?.name || 'Kids Party Wear';

  let pickupDate = rental.startDate;
  let returnDate = rental.expectedReturnDate;
  try {
    pickupDate = format(parseISO(rental.startDate), 'dd MMM yyyy');
    returnDate = format(parseISO(rental.expectedReturnDate), 'dd MMM yyyy');
  } catch (e) {}

  let message = `*${storeName} – 🎉 Advance Reservation Confirmed!*\n\n`;
  message += `Dear *${customerName}*,\n\n`;
  message += `We have successfully reserved your selected designer outfit for your upcoming event! Details are below:\n\n`;

  message += `📋 *Reservation Details:*\n`;
  message += `• *Booking Ref:* #${rental.invoiceNumber}\n`;
  message += `• *Outfit Reserved:* ${productName}\n`;
  message += `• *Quantity:* ${rental.quantity}\n`;
  message += `• *Pickup Date:* ${pickupDate}\n`;
  message += `• *Scheduled Return:* ${returnDate}\n`;
  message += `• *Daily Rate:* ${formatCurrency(rental.dailyRate)}/day\n`;
  message += `• *Security Deposit:* ${formatCurrency(rental.securityDeposit)} (Refundable)\n`;
  if (rental.paidAmount > 0) {
    message += `• *Advance Advance Paid:* ${formatCurrency(rental.paidAmount)}\n`;
  }

  message += `\n👗 *Preparation Guarantee:*\n`;
  message += `Your outfit will be professionally steam-pressed, checked, and kept ready for handover on your pickup date.\n\n`;
  message += `📍 *Store Location:* ${store?.address || 'Shop 203, 204 C-30, next to HDFC Bank'}\n`;
  message += `📞 *Store Contact:* ${store?.phone || '097134 69928'}\n\n`;
  message += `Thank you for reserving with ${storeName}!`;

  openWhatsApp(customer?.phone, message);
};

/**
 * One-Click WhatsApp Rental Handover / Active Lease Receipt
 */
export const sendActiveRentalHandoverWhatsApp = (
  customer: Customer | undefined,
  rental: Rental,
  product: Product | undefined,
  store?: StoreProfile
) => {
  const storeName = store?.storeName || 'Kiddies – Kids Wear & Boutique';
  const customerName = customer?.name || 'Valued Customer';
  const productName = product?.name || 'Kids Outfit';

  let returnDate = rental.expectedReturnDate;
  try {
    returnDate = format(parseISO(rental.expectedReturnDate), 'dd MMM yyyy');
  } catch (e) {}

  let message = `*${storeName} – 🛍️ Rental Invoice & Handover Receipt*\n\n`;
  message += `Dear *${customerName}*,\n\n`;
  message += `Thank you for renting with us! Here is your rental summary:\n\n`;
  message += `• *Invoice No:* #${rental.invoiceNumber}\n`;
  message += `• *Outfit:* ${productName} (Qty: ${rental.quantity})\n`;
  message += `• *Scheduled Return:* ${returnDate}\n`;
  message += `• *Total Rent:* ${formatCurrency(rental.totalRentAmount)}\n`;
  message += `• *Refundable Deposit:* ${formatCurrency(rental.securityDeposit)}\n`;
  message += `• *Amount Paid Today:* ${formatCurrency(rental.paidAmount)}\n\n`;
  message += `Please return the garment on or before *${returnDate}* to avoid late penalty.\n\n`;
  message += `📍 *Store Contact:* ${store?.phone || '097134 69928'}\n`;
  message += `Warm regards, ${storeName}`;

  openWhatsApp(customer?.phone, message);
};

/**
 * WhatsApp Sales Receipt Share (with Split Payment & Change details)
 */
export const sendSaleReceiptWhatsApp = (
  customer: Customer | null | undefined,
  sale: Sale,
  store?: StoreProfile
) => {
  const storeName = store?.storeName || 'Kiddies – Kids Wear & Baby Clothing';
  let dateFormatted = sale.date;
  try {
    dateFormatted = format(parseISO(sale.date), 'dd MMM yyyy, hh:mm a');
  } catch (e) {}

  let message = `*${storeName}*\n`;
  message += `🧾 *Tax Invoice / Cash Receipt*\n`;
  message += `*Invoice:* ${sale.invoiceNumber}\n`;
  message += `*Date:* ${dateFormatted}\n`;
  message += `*Customer:* ${customer?.name || 'Valued Customer'}\n`;
  message += `----------------------------------------\n`;
  message += `*Items:*\n`;

  (sale.items || []).forEach(item => {
    message += `• ${item.name} (x${item.quantity}) - ${formatCurrency(item.total)}\n`;
  });

  message += `----------------------------------------\n`;
  message += `*Subtotal:* ${formatCurrency(sale.totalAmount)}\n`;
  if ((sale.discount || 0) > 0) {
    message += `*Discount:* -${formatCurrency(sale.discount)}\n`;
  }
  message += `*Final Total:* ${formatCurrency(sale.netPayout ?? sale.totalAmount)}\n`;

  if (sale.splitPayments && sale.splitPayments.length > 0) {
    message += `\n*Payment Breakdown:*\n`;
    sale.splitPayments.forEach(sp => {
      message += `• ${sp.method}: ${formatCurrency(sp.amount)}\n`;
    });
  } else {
    message += `*Payment Mode:* ${sale.paymentMethod}\n`;
  }

  if (sale.cashTendered !== undefined && sale.cashTendered > 0) {
    message += `*Cash Tendered:* ${formatCurrency(sale.cashTendered)}\n`;
    if (sale.changeDue !== undefined && sale.changeDue > 0) {
      message += `*Change Returned:* ${formatCurrency(sale.changeDue)}\n`;
    }
  }

  message += `\nThank you for shopping at ${storeName}!\n`;
  message += `📍 ${store?.address || 'Shop 203, 204 C-30, next to HDFC Bank'}\n`;
  message += `📞 ${store?.phone || '097134 69928'}`;

  openWhatsApp(customer?.phone, message);
};
