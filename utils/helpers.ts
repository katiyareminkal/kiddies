
import { differenceInDays, parseISO, isAfter } from 'date-fns';
import { Rental, RentalStatus } from '../types';

export const formatCurrency = (amount: number) => {
  const val = Number(amount) || 0;
  const isNegative = val < 0;
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.abs(val));
  return isNegative ? `-${formatted}` : formatted;
};

export const calculateRentalTotal = (startDate: string, endDate: string, dailyRate: number, quantity: number) => {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const days = Math.max(1, differenceInDays(end, start));
  return days * dailyRate * quantity;
};

export const calculateLateFee = (expectedReturnDate: string, actualReturnDate: string | undefined, dailyRate: number, quantity: number) => {
  const expected = parseISO(expectedReturnDate);
  const actual = actualReturnDate ? parseISO(actualReturnDate) : new Date();

  if (isAfter(actual, expected)) {
    const overdueDays = differenceInDays(actual, expected);
    return overdueDays * dailyRate * quantity * 1.5; // 1.5x penalty for late return
  }
  return 0;
};

export const isValidUUID = (str?: string | null): boolean => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (e) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const generateID = () => generateUUID();

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'bg-blue-100 text-blue-700';
    case 'RETURNED': return 'bg-green-100 text-green-700';
    case 'OVERDUE': return 'bg-red-100 text-red-700';
    case 'PAID': return 'bg-green-100 text-green-700';
    case 'PARTIAL': return 'bg-orange-100 text-orange-700';
    case 'UNPAID': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

export const cleanSku = (sku?: string): string => {
  if (!sku) return '';
  return sku.replace(/\s*\([^)]*\)|\s*\[[^\]]*\]|\s*\{[^}]*\}/g, '').trim();
};

export const extractBaseSku = (sku: string, sizes?: string[]): string => {
  if (!sku) return '';
  const cleaned = cleanSku(sku);
  if (sizes && sizes.length > 0) {
    for (const size of sizes) {
      const cleanS = cleanSku(size);
      if (cleanS && cleaned.toUpperCase().endsWith(`-${cleanS.toUpperCase()}`)) {
        return cleaned.substring(0, cleaned.length - cleanS.length - 1);
      }
      if (size && cleaned.toUpperCase().endsWith(`-${size.trim().toUpperCase()}`)) {
        return cleaned.substring(0, cleaned.length - size.trim().length - 1);
      }
    }
  }
  return cleaned;
};
