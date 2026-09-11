
export enum RentalStatus {
  ACTIVE = 'ACTIVE',
  RETURNED = 'RETURNED',
  OVERDUE = 'OVERDUE',
  RESERVED = 'RESERVED',
  CANCELLED = 'CANCELLED'
}

export enum PaymentStatus {
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  UNPAID = 'UNPAID',
  REFUNDED = 'REFUNDED'
}

export enum PaymentMethod {
  CASH = 'CASH',
  UPI = 'UPI',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  SPLIT = 'SPLIT'
}

export interface PaymentSplit {
  method: PaymentMethod;
  amount: number;
  notes?: string;
}

export enum SalesChannel {
  IN_STORE = 'IN_STORE',
  AMAZON = 'AMAZON',
  FLIPKART = 'FLIPKART',
  MEESHO = 'MEESHO',
  WEBSITE = 'WEBSITE'
}

export enum OrderStatus {
  COMPLETED = 'COMPLETED',       // Instant for offline
  PENDING = 'PENDING',           // New online order
  READY_TO_SHIP = 'READY_TO_SHIP',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  RETURNED = 'RETURNED',
  PARTIALLY_RETURNED = 'PARTIALLY_RETURNED',
  CANCELLED = 'CANCELLED'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF'
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // In a real app, this should be hashed. Optional for Firebase Auth users.
  role: UserRole;
  permissions: string[]; // List of specific module IDs this user can access
  avatar?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  subCategory?: string;
  gender?: string;
  clothingType?: string;
  brand?: string;
  color?: string;
  material?: string;
  sizes: string[]; // e.g. ['2-3Y', '4-5Y']
  purchasePrice: number;
  sellingPrice: number;
  rentalPrice: number; // Daily rate
  taxPercent: number;
  
  // Stock Split
  saleStock: number;   // Items available for purchase
  rentalStock: number; // Items available for rent
  
  purpose: 'SALE' | 'RENTAL' | 'HYBRID';
  
  minStockAlert: number;
  supplierId?: string;
  supplierName?: string;
  billNumber?: string;
  billDate?: string;
  description: string;
  imageUrl?: string;
  images?: string[]; // Multiple product photos
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  gstin?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  location?: string;
  category?: string;
  createdAt: string;
}

export interface SupplierBillItem {
  id: string;
  billId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  createdAt: string;
}

export interface SupplierBill {
  id: string;
  supplierId: string;
  billNumber: string;
  date: string;
  items: SupplierBillItem[];
  subtotal?: number;
  discountType?: 'PERCENT' | 'FIXED';
  discountValue?: number;
  discountAmount?: number;
  taxType?: 'NONE' | 'GST' | 'SPLIT_GST'; // NONE, GST (integrated/overall), SPLIT_GST (CGST + SGST)
  taxRate?: number; // e.g. 5, 12, 18
  taxAmount?: number;
  totalAmount: number;
  paidAmount: number;
  status: 'UNPAID' | 'PARTIAL' | 'PAID';
  notes?: string;
  imageUrl?: string;
  createdAt: string;
}

export interface InvoiceItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  total: number;
  returnedQuantity?: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string; // Internal Invoice ID
  externalOrderId?: string; // e.g., Amazon Order ID
  channel: SalesChannel;
  customerId: string; // For marketplaces, this might be a generic "Amazon Customer"
  items: InvoiceItem[];
  totalAmount: number; // Gross Sale Amount
  marketplaceFees: number; // Commission + Shipping + Fixed Fees
  netPayout: number; // Total - Fees
  taxTotal: number;
  discount: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  splitPayments?: PaymentSplit[];
  cashTendered?: number;
  changeDue?: number;
  orderStatus: OrderStatus;
  date: string;
}

export type LaundryStatus = 'NOT_REQUIRED' | 'IN_LAUNDRY' | 'CLEANED';

export interface Rental {
  id: string;
  invoiceNumber: string;
  customerId: string;
  productId: string;
  quantity: number;
  startDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  dailyRate: number;
  securityDeposit: number;
  totalRentAmount: number;
  lateFee: number;
  paidAmount: number;
  status: RentalStatus;
  paymentStatus: PaymentStatus;
  images?: string[]; // Array of base64 strings for condition photos/ID proofs
  returnImages?: string[]; // Array of base64 strings for return condition photos
  date: string;
  laundryStatus?: LaundryStatus;
  laundryNotes?: string;
  laundryPartner?: string;
  laundrySentDate?: string;
  laundryReadyDate?: string;
}

export interface StockLog {
  id: string;
  productId: string;
  pool: 'SALE' | 'RENTAL';
  type: 'IN' | 'OUT';
  quantity: number;
  reason: string;
  date: string;
}

export interface StoreProfile {
  storeName: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  website: string;
  logo?: string;
}

export interface AppSettings {
  defaultTaxRate: number;
  currency: string;
  enableLowStockAlerts: boolean;
  lowStockThreshold: number; // Default global threshold
  salesInvoicePrefix: string;
  rentalInvoicePrefix: string;
  enableDeleteInventory: boolean;
  enableDeleteCustomers: boolean;
  enableDeleteTransactions: boolean;
  enableDeleteRentals: boolean;
  enableDeleteSuppliers: boolean;
  enableDeleteUsers: boolean;
}

export interface AppNotification {
  id: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  category: 'SALE' | 'RENTAL' | 'INVENTORY' | 'SYSTEM' | 'CUSTOMER';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  linkTo?: string; // Tab ID
}

export interface CreditNote {
  id: string;
  customerId: string;
  amount: number;
  reason: string;
  status: 'ACTIVE' | 'USED';
  createdAt: string;
  usedAt?: string;
}

export interface Expense {
  id: string;
  type: 'CASH_OUT' | 'GOODS_CONSUMPTION';
  amount: number;
  productId?: string;
  quantity?: number;
  reason: string;
  paidTo?: string;
  date: string;
}

export interface AppState {
  currentUser: User | null;
  users: User[];
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  supplierBills: SupplierBill[];
  sales: Sale[];
  rentals: Rental[];
  stockLogs: StockLog[];
  notifications: AppNotification[];
  storeProfile: StoreProfile;
  settings: AppSettings;
  creditNotes: CreditNote[];
  expenses: Expense[];
}
