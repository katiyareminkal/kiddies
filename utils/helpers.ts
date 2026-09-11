/**
 * General application helper utilities
 */

export const formatCurrency = (amount: number = 0, currency: string = 'INR'): string => {
  const validAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(validAmount);
};

export const calculateLateFee = (
  expectedReturnDate: string,
  actualReturnDate?: string,
  dailyRate: number = 0,
  quantity: number = 1
): number => {
  if (!expectedReturnDate) return 0;
  const expected = new Date(expectedReturnDate);
  const actual = actualReturnDate ? new Date(actualReturnDate) : new Date();

  if (isNaN(expected.getTime()) || isNaN(actual.getTime())) return 0;

  const diffTime = actual.getTime() - expected.getTime();
  if (diffTime <= 0) return 0;

  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays * (dailyRate || 0) * (quantity || 1));
};

export const getStatusColor = (status: string): string => {
  const s = (status || '').toUpperCase();
  switch (s) {
    case 'ACTIVE':
    case 'PAID':
    case 'COMPLETED':
    case 'DELIVERED':
    case 'IN_STOCK':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'PENDING':
    case 'PARTIAL':
    case 'BOOKED':
    case 'PROCESSING':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'OVERDUE':
    case 'CANCELLED':
    case 'FAILED':
    case 'OUT_OF_STOCK':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'RETURNED':
    case 'REFUNDED':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

export const extractBaseSku = (sku?: string, sizes?: string[]): string => {
  if (!sku) return '';
  const trimmed = sku.trim();
  if (Array.isArray(sizes) && sizes.length > 0) {
    for (const size of sizes) {
      if (size) {
        const cleanSize = size.trim();
        if (cleanSize && trimmed.toUpperCase().endsWith(`-${cleanSize.toUpperCase()}`)) {
          return trimmed.slice(0, -(cleanSize.length + 1));
        }
      }
    }
  }
  return trimmed;
};

export const generateID = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const isValidUUID = (id?: any): boolean => {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
};
