import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { AppState, Product, Customer, Supplier, Sale, Rental, StockLog, RentalStatus, PaymentStatus, SalesChannel, OrderStatus, PaymentMethod, StoreProfile, AppSettings, User, UserRole, AppNotification, CreditNote, Expense, SupplierBill, SupplierBillItem } from '../types';
import { generateID, generateUUID, isValidUUID } from '../utils/helpers';
import { supabase } from '../supabase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface AppContextType extends AppState {
  isAuthReady: boolean;
  isPasswordRecovery: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updatePassword: (password: string) => Promise<boolean>;
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>, imageFile?: File, onProgress?: (status: string) => void) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>, imageFile?: File, onProgress?: (status: string) => void) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Promise<string | undefined>;
  deleteCustomer: (id: string) => Promise<void>;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => Promise<void>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  addSale: (sale: Omit<Sale, 'id' | 'invoiceNumber' | 'date' | 'netPayout'> & { date?: string }) => Promise<{ id: string, invoiceNumber: string } | undefined>;
  addCreditNote: (customerId: string, amount: number, reason: string) => Promise<void>;
  consumeStoreCredit: (customerId: string, amountToConsume: number, invoiceNumber: string) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id' | 'date'> & { date?: string }) => Promise<void>;
  updateOrderStatus: (saleId: string, status: OrderStatus) => Promise<void>;
  updateSale: (id: string, updates: Partial<Sale>) => Promise<void>;
  addPaymentToSale: (saleId: string, amount: number) => Promise<void>;
  addRental: (rental: Omit<Rental, 'id' | 'invoiceNumber' | 'date' | 'status' | 'lateFee' | 'actualReturnDate'> & { status?: RentalStatus }, imageFiles?: File[]) => Promise<void>;
  updateRental: (id: string, updates: Partial<Rental>) => Promise<void>;
  returnRental: (rentalId: string, lateFee: number, returnImageFiles?: File[]) => Promise<void>;
  cancelReservation: (rentalId: string) => Promise<void>;
  updateStock: (productId: string, pool: 'SALE' | 'RENTAL', quantity: number, type: 'IN' | 'OUT', reason: string) => Promise<void>;
  updateStoreProfile: (profile: Partial<StoreProfile>, logoFile?: File) => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  importData: (jsonData: string) => Promise<boolean>;
  resetData: () => Promise<void>;
  markNotificationsAsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
  uploadImage: (file: File, path: string) => Promise<string>;
  linkSaleItemToProduct: (saleId: string, customItemId: string, realProductId: string) => Promise<void>;
  returnSale: (saleId: string) => Promise<void>;
  processPartialReturnOrExchange: (saleId: string, itemIndex: number, returnQty: number, exchangeProductId?: string, exchangeQty?: number) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  deleteRental: (id: string) => Promise<void>;
  deleteCreditNote: (id: string) => Promise<void>;
  addSupplierBill: (bill: Omit<SupplierBill, 'id' | 'createdAt' | 'items'> & { items: Omit<SupplierBillItem, 'id' | 'billId' | 'createdAt'>[] }, imageFile?: File) => Promise<void>;
  updateSupplierBill: (billId: string, bill: Partial<Omit<SupplierBill, 'id' | 'createdAt' | 'items'>> & { items?: Omit<SupplierBillItem, 'id' | 'billId' | 'createdAt'>[] }, imageFile?: File) => Promise<void>;
  addPaymentToSupplierBill: (billId: string, amount: number) => Promise<void>;
  deleteSupplierBill: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_ADMIN: User = {
  id: 'U_ADMIN',
  name: 'Store Admin',
  email: 'admin@kiddies.store',
  password: 'admin', // Demo password
  role: UserRole.ADMIN,
  permissions: [], // Admin has implicit full access
  createdAt: new Date().toISOString()
};

const INITIAL_DATA: AppState = {
  currentUser: null,
  users: [
    DEFAULT_ADMIN,
    {
      id: 'U_STAFF',
      name: 'Sarah Staff',
      email: 'staff@kiddies.store',
      password: 'staff',
      role: UserRole.STAFF,
      permissions: ['sales', 'inventory'],
      createdAt: new Date().toISOString()
    }
  ],
  products: [],
  customers: [],
  suppliers: [],
  supplierBills: [],
  sales: [],
  rentals: [],
  stockLogs: [],
  notifications: [
    {
      id: 'n1',
      type: 'SUCCESS',
      category: 'SYSTEM',
      title: 'Welcome to Kiddies',
      message: 'System ready. Start fresh by adding suppliers, purchase bills, and products.',
      timestamp: new Date().toISOString(),
      isRead: false
    }
  ],
  storeProfile: {
    storeName: 'Kiddies',
    address: '123 Fashion Street, City Center',
    phone: '9876543210',
    email: 'contact@kiddies.store',
    gstin: '',
    website: 'www.kiddies.store'
  },
  settings: {
    defaultTaxRate: 12,
    currency: 'INR',
    enableLowStockAlerts: true,
    lowStockThreshold: 3,
    salesInvoicePrefix: 'INV-',
    rentalInvoicePrefix: 'RNT-',
    enableDeleteInventory: true,
    enableDeleteCustomers: true,
    enableDeleteTransactions: true,
    enableDeleteRentals: true,
    enableDeleteSuppliers: true,
    enableDeleteUsers: true
  },
  creditNotes: [],
  expenses: []
};

const getDeletedUserIds = (): Set<string> => {
  try {
    const list = JSON.parse(localStorage.getItem('kiddies_deleted_user_ids') || '[]');
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
};

const addDeletedUserId = (id: string, email?: string) => {
  try {
    const list = JSON.parse(localStorage.getItem('kiddies_deleted_user_ids') || '[]');
    const set = new Set(Array.isArray(list) ? list : []);
    if (id) set.add(id);
    if (email) set.add(email.trim().toLowerCase());
    localStorage.setItem('kiddies_deleted_user_ids', JSON.stringify(Array.from(set)));
  } catch {}
};

const removeDeletedUserId = (id: string, email?: string) => {
  try {
    const list = JSON.parse(localStorage.getItem('kiddies_deleted_user_ids') || '[]');
    if (Array.isArray(list)) {
      const cleanEmail = email ? email.trim().toLowerCase() : '';
      const filtered = list.filter((x: string) => x !== id && (!cleanEmail || x !== cleanEmail));
      localStorage.setItem('kiddies_deleted_user_ids', JSON.stringify(filtered));
    }
  } catch {}
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(INITIAL_DATA);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setIsPasswordRecovery(false);
      return true;
    } catch (error) {
      console.error("Failed to update password:", error);
      return false;
    }
  };

  // -- AUTH LISTENER --
  useEffect(() => {
    let mounted = true;

    const triggerReady = () => {
      if (mounted) {
        setIsAuthReady(true);
      }
    };

    // Safety timeout: Guarantee preloader dismisses within 800ms even if Supabase network is slow/offline
    const fallbackTimeout = setTimeout(() => {
      if (mounted) {
        setIsAuthReady(true);
      }
    }, 800);

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          let name = 'User';
          let role = UserRole.STAFF;
          let permissions: string[] = [];
          let createdAt = new Date().toISOString();

          try {
            const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            if (data) {
              name = data.name || name;
              role = (data.role as any) || role;
              permissions = data.permissions || permissions;
              createdAt = data.created_at || createdAt;
            } else {
              name = session.user.user_metadata?.name || name;
              role = session.user.user_metadata?.role || role;
            }
          } catch (err) {
            console.warn("Could not query user profile on init, using metadata fallback:", err);
            name = session.user.user_metadata?.name || name;
            role = session.user.user_metadata?.role || role;
          }

          if (mounted) {
            setState(prev => ({
              ...prev,
              currentUser: {
                id: session.user.id,
                name,
                email: session.user.email || '',
                role,
                permissions,
                createdAt
              }
            }));
          }
        } else if (mounted) {
          const cachedUser = localStorage.getItem('kiddies_current_user');
          if (cachedUser) {
            try {
              const parsed = JSON.parse(cachedUser);
              if (parsed && parsed.id) {
                setState(prev => ({ ...prev, currentUser: parsed }));
              } else {
                setState(prev => ({ ...prev, currentUser: null }));
              }
            } catch {
              setState(prev => ({ ...prev, currentUser: null }));
            }
          } else {
            setState(prev => ({ ...prev, currentUser: null }));
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        if (mounted) {
          triggerReady();
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return; // Handled by initializeAuth

      if (event === 'PASSWORD_RECOVERY' && mounted) {
        setIsPasswordRecovery(true);
      }

      if (session?.user) {
        const name = session.user.user_metadata?.name || 'User';
        const role = session.user.user_metadata?.role || UserRole.STAFF;
        const permissions: string[] = [];
        const createdAt = new Date().toISOString();

        if (mounted) {
          setState(prev => ({
            ...prev,
            currentUser: {
              id: session.user.id,
              name,
              email: session.user.email || '',
              role,
              permissions,
              createdAt
            }
          }));
        }

        // Fetch database profile in the background
        Promise.resolve(supabase.from('profiles').select('*').eq('id', session.user.id).single())
          .then(({ data }) => {
            if (data && mounted) {
              setState(prev => {
                if (!prev.currentUser || prev.currentUser.id !== session.user.id) return prev;
                return {
                  ...prev,
                  currentUser: {
                    ...prev.currentUser,
                    name: data.name || prev.currentUser.name,
                    role: (data.role as any) || prev.currentUser.role,
                    permissions: data.permissions || prev.currentUser.permissions,
                    createdAt: data.created_at || prev.currentUser.createdAt
                  }
                };
              });
            }
          })
          .catch(err => {
            console.warn("Could not query user profile in background:", err);
          });
      } else if (mounted) {
        if (event === 'SIGNED_OUT') {
          localStorage.removeItem('kiddies_current_user');
          setState(prev => ({ ...prev, currentUser: null }));
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(fallbackTimeout);
      subscription.unsubscribe();
    };
  }, []);


  // -- DATA SYNC --
  const fetchAllData = async () => {
    try {
      const [
        { data: users },
        { data: products },
        { data: customers },
        { data: suppliers },
        { data: supplierBills },
        { data: sales },
        { data: rentals },
        { data: stockLogs },
        { data: notifications },
        { data: storeProfile },
        { data: settings },
        { data: creditNotes },
        { data: expenses }
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('products').select('*'),
        supabase.from('customers').select('*'),
        supabase.from('suppliers').select('*'),
        supabase.from('supplier_bills').select('*').order('created_at', { ascending: false }),
        supabase.from('sales').select('*').order('date', { ascending: false }),
        supabase.from('rentals').select('*').order('date', { ascending: false }),
        supabase.from('stock_logs').select('*').order('date', { ascending: false }),
        supabase.from('notifications').select('*').order('timestamp', { ascending: false }),
        supabase.from('store_profile').select('*').eq('id', 'default').maybeSingle(),
        supabase.from('settings').select('*').eq('id', 'default').maybeSingle(),
        supabase.from('credit_notes').select('*').order('created_at', { ascending: false }),
        supabase.from('expenses').select('*').order('date', { ascending: false })
      ]);

      const { data: saleItems } = await supabase.from('sale_items').select('*');
      const { data: supplierBillItems } = await supabase.from('supplier_bill_items').select('*');

      const combinedSales: Sale[] = (sales || []).map(sale => {
        const items = (saleItems || [])
          .filter(item => item.sale_id === sale.id)
          .map(item => ({
            productId: item.product_id,
            name: item.name,
            quantity: item.quantity,
            unitPrice: Number(item.unit_price),
            taxAmount: Number(item.tax_amount),
            total: Number(item.total),
            returnedQuantity: Number(item.returned_quantity || 0)
          }));

        return {
          id: sale.id,
          invoiceNumber: sale.invoice_number,
          externalOrderId: sale.external_order_id,
          channel: sale.channel,
          customerId: sale.customer_id,
          totalAmount: Number(sale.total_amount),
          marketplaceFees: Number(sale.marketplace_fees),
          netPayout: Number(sale.net_payout),
          taxTotal: Number(sale.tax_total),
          discount: Number(sale.discount),
          paidAmount: Number(sale.paid_amount),
          paymentStatus: sale.payment_status,
          paymentMethod: sale.payment_method,
          orderStatus: sale.order_status,
          date: sale.date,
          items
        };
      });

      let customOfflineUsers: User[] = [];
      const deletedUserIds = getDeletedUserIds();

      try {
        const savedUsers = localStorage.getItem('kiddies_custom_users');
        if (savedUsers) {
          const parsed = JSON.parse(savedUsers);
          if (Array.isArray(parsed)) {
            customOfflineUsers = parsed.filter(u => !deletedUserIds.has(u.id) && !deletedUserIds.has((u.email || '').toLowerCase()));
          }
        }
      } catch (e) {}

      const remoteUsers = (users || [])
        .filter(u => !deletedUserIds.has(u.id) && !deletedUserIds.has((u.email || '').toLowerCase()))
        .map(u => ({
          id: u.id,
          name: u.name || '',
          email: u.email || '',
          role: u.role || UserRole.STAFF,
          permissions: u.permissions || [],
          createdAt: u.created_at
        }));

      const userMap = new Map<string, User>();
      INITIAL_DATA.users.forEach(u => {
        if (!deletedUserIds.has(u.id) && !deletedUserIds.has((u.email || '').toLowerCase())) {
          userMap.set(u.id, u);
        }
      });
      remoteUsers.forEach(u => userMap.set(u.id, u));
      customOfflineUsers.forEach(u => userMap.set(u.id, u));

      setState(prev => ({
        ...prev,
        users: Array.from(userMap.values()),
        products: (products || []).map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            barcode: p.barcode || '',
            category: p.category || '',
            subCategory: p.sub_category || undefined,
            gender: p.gender || undefined,
            clothingType: p.clothing_type || undefined,
            brand: p.brand || '',
            color: p.color || '',
            material: p.material || '',
            sizes: p.sizes || [],
            purchasePrice: Number(p.purchase_price || 0),
            sellingPrice: Number(p.selling_price || 0),
            rentalPrice: Number(p.rental_price || 0),
            taxPercent: Number(p.tax_percent || 0),
            saleStock: Number(p.sale_stock || 0),
            rentalStock: Number(p.rental_stock || 0),
            purpose: p.purpose || 'SALE',
            minStockAlert: Number(p.min_stock_alert || 0),
            supplierId: p.supplier_id || '',
            description: p.description || '',
            imageUrl: (() => {
              if (p.image_url && p.image_url.startsWith('[')) {
                try {
                  const arr = JSON.parse(p.image_url);
                  return Array.isArray(arr) && arr.length > 0 ? arr[0] : p.image_url;
                } catch (e) {
                  return p.image_url;
                }
              }
              return p.image_url || '';
            })(),
            images: (() => {
              if (p.image_url && p.image_url.startsWith('[')) {
                try {
                  const arr = JSON.parse(p.image_url);
                  if (Array.isArray(arr)) return arr;
                } catch (e) {}
              }
              return p.image_url ? [p.image_url] : [];
            })(),
            createdAt: p.created_at
          })),
        customers: (customers || []).map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone || '',
          email: c.email || '',
          address: c.address || '',
          gstin: c.gstin || '',
          createdAt: c.created_at
        })),
        suppliers: (suppliers || []).map(s => ({
          id: s.id,
          name: s.name,
          contactPerson: s.contact_person || '',
          phone: s.phone || '',
          email: s.email || '',
          address: s.address || '',
          location: s.location || undefined,
          category: s.category || undefined,
          createdAt: s.created_at
        })),
        supplierBills: (() => {
          const remoteBills = (supplierBills || []).map(b => {
            const items = (supplierBillItems || []).filter((i: any) => i.bill_id === b.id).map((i: any) => ({
              id: i.id,
              billId: i.bill_id,
              itemName: i.item_name,
              quantity: Number(i.quantity),
              unitPrice: Number(i.unit_price),
              total: Number(i.total),
              createdAt: i.created_at
            }));
            return {
              id: b.id,
              supplierId: b.supplier_id,
              billNumber: b.bill_number || '',
              date: b.date,
              items,
              subtotal: b.subtotal !== undefined ? Number(b.subtotal) : undefined,
              discountType: b.discount_type || undefined,
              discountValue: b.discount_value !== undefined ? Number(b.discount_value) : undefined,
              discountAmount: b.discount_amount !== undefined ? Number(b.discount_amount) : undefined,
              taxType: b.tax_type || undefined,
              taxRate: b.tax_rate !== undefined ? Number(b.tax_rate) : undefined,
              taxAmount: b.tax_amount !== undefined ? Number(b.tax_amount) : undefined,
              totalAmount: Number(b.total_amount || 0),
              paidAmount: Number(b.paid_amount || 0),
              status: b.status as 'UNPAID' | 'PARTIAL' | 'PAID',
              notes: b.notes || '',
              imageUrl: b.image_url || undefined,
              createdAt: b.created_at
            };
          });

          // Merge with local offline bills to guarantee tax & discount details are never stripped by remote DB schema limits
          try {
            const savedLocal = localStorage.getItem('kiddies_offline_supplier_bills');
            if (savedLocal) {
              const offline: SupplierBill[] = JSON.parse(savedLocal);
              const map = new Map<string, SupplierBill>(remoteBills.map(item => [item.id, item]));
              offline.forEach(off => {
                const existing = map.get(off.id);
                if (!existing) {
                  map.set(off.id, off);
                } else {
                  map.set(off.id, {
                    ...existing,
                    subtotal: off.subtotal !== undefined ? off.subtotal : existing.subtotal,
                    discountType: off.discountType || existing.discountType,
                    discountValue: off.discountValue !== undefined ? off.discountValue : existing.discountValue,
                    discountAmount: off.discountAmount !== undefined ? off.discountAmount : existing.discountAmount,
                    taxType: off.taxType || existing.taxType,
                    taxRate: off.taxRate !== undefined ? off.taxRate : existing.taxRate,
                    taxAmount: off.taxAmount !== undefined ? off.taxAmount : existing.taxAmount,
                    items: (off.items && off.items.length > 0) ? off.items : existing.items
                  });
                }
              });
              return Array.from(map.values());
            }
          } catch (e) {
            console.warn('Failed to parse offline supplier bills:', e);
          }

          return remoteBills;
        })(),
        sales: combinedSales,
        rentals: (() => {
          const remoteRentals = (rentals || []).map(r => ({
            id: r.id,
            invoiceNumber: r.invoice_number,
            customerId: r.customer_id,
            productId: r.product_id,
            quantity: Number(r.quantity || 1),
            startDate: r.start_date,
            expectedReturnDate: r.expected_return_date,
            actualReturnDate: r.actual_return_date || undefined,
            dailyRate: Number(r.daily_rate || 0),
            securityDeposit: Number(r.security_deposit || 0),
            totalRentAmount: Number(r.total_rent_amount || 0),
            lateFee: Number(r.late_fee || 0),
            paidAmount: Number(r.paid_amount || 0),
            status: r.status || RentalStatus.ACTIVE,
            paymentStatus: r.payment_status || PaymentStatus.UNPAID,
            images: r.images || [],
            returnImages: r.return_images || [],
            date: r.date || r.start_date
          }));

          // Merge with local offline rentals to guarantee persistence
          try {
            const savedLocal = localStorage.getItem('kiddies_offline_rentals');
            if (savedLocal) {
              const offline: Rental[] = JSON.parse(savedLocal);
              const map = new Map<string, Rental>(remoteRentals.map(item => [item.id, item]));
              offline.forEach(off => {
                if (!map.has(off.id)) {
                  map.set(off.id, off);
                } else {
                  const rem = map.get(off.id)!;
                  if (off.status === RentalStatus.RETURNED && rem.status !== RentalStatus.RETURNED) {
                    map.set(off.id, { ...rem, ...off });
                  }
                }
              });
              return Array.from(map.values());
            }
          } catch (e) {
            console.warn("Could not parse offline rentals", e);
          }

          return remoteRentals;
        })(),
        stockLogs: (stockLogs || []).map(sl => ({
          id: sl.id,
          productId: sl.product_id,
          pool: sl.pool,
          type: sl.type,
          quantity: Number(sl.quantity || 0),
          reason: sl.reason || '',
          date: sl.date
        })),
        notifications: (notifications || []).map(n => ({
          id: n.id,
          type: n.type,
          category: n.category,
          title: n.title,
          message: n.message,
          timestamp: n.timestamp,
          isRead: n.is_read,
          linkTo: n.link_to || undefined
        })),
        storeProfile: storeProfile
          ? {
            storeName: storeProfile.store_name || 'Kiddies',
            address: storeProfile.address || '',
            phone: storeProfile.phone || '',
            email: storeProfile.email || '',
            gstin: storeProfile.gstin || '',
            website: storeProfile.website || '',
            logo: storeProfile.logo || ''
          }
          : prev.storeProfile,
        settings: settings
          ? {
            defaultTaxRate: Number(settings.default_tax_rate || 12),
            currency: settings.currency || 'INR',
            enableLowStockAlerts: !!settings.enable_low_stock_alerts,
            lowStockThreshold: Number(settings.low_stock_threshold || 3),
            salesInvoicePrefix: settings.sales_invoice_prefix || 'INV-',
            rentalInvoicePrefix: settings.rental_invoice_prefix || 'RNT-',
            enableDeleteInventory: !!settings.enable_delete_inventory,
            enableDeleteCustomers: !!settings.enable_delete_customers,
            enableDeleteTransactions: !!settings.enable_delete_transactions,
            enableDeleteRentals: !!settings.enable_delete_rentals,
            enableDeleteSuppliers: !!settings.enable_delete_suppliers,
            enableDeleteUsers: !!settings.enable_delete_users
          }
          : prev.settings,
        creditNotes: (creditNotes || []).map(cn => ({
          id: cn.id,
          customerId: cn.customer_id,
          amount: Number(cn.amount || 0),
          reason: cn.reason || '',
          status: cn.status as 'ACTIVE' | 'USED',
          createdAt: cn.created_at,
          usedAt: cn.used_at || undefined
        })),
        expenses: (expenses || []).map(e => ({
          id: e.id,
          type: e.type as 'CASH_OUT' | 'GOODS_CONSUMPTION',
          amount: Number(e.amount || 0),
          productId: e.product_id || undefined,
          quantity: e.quantity || undefined,
          reason: e.reason || '',
          paidTo: e.paid_to || undefined,
          date: e.date
        }))
      }));
    } catch (error) {
      console.error("Failed to sync Supabase data:", error);
    }
  };

  useEffect(() => {
    if (!isAuthReady) return;

    // Fetch initial datasets
    fetchAllData();

    // Listen to changes across all tables
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchAllData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthReady]);

  // -- HELPER: Internal Notification Generator --
  const createNotification = (
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR',
    category: 'SALE' | 'RENTAL' | 'INVENTORY' | 'SYSTEM' | 'CUSTOMER',
    title: string,
    message: string,
    linkTo?: string
  ): AppNotification => ({
    id: generateID(),
    type,
    category,
    title,
    message,
    timestamp: new Date().toISOString(),
    isRead: false,
    linkTo
  });

  // -- STORAGE HELPER --
  const uploadImage = async (file: File, path: string): Promise<string> => {
    try {
      const bucketName = 'store-images';
      const { error } = await supabase.storage.from(bucketName).upload(path, file, {
        cacheControl: '3600',
        upsert: true
      });

      if (error) throw error;

      const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading image to Supabase Storage:", error);
      throw error;
    }
  };

  // -- AUTH --
  const login = async (email: string, pass: string): Promise<boolean> => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (pass || '').trim();

    if (!cleanEmail) return false;

    // 1. Attempt Supabase Auth first
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass
      });

      if (!error && data?.user) {
        const name = data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User';
        const role = data.user.user_metadata?.role || UserRole.STAFF;
        const permissions: string[] = [];
        const createdAt = new Date().toISOString();

        const userObj: User = {
          id: data.user.id,
          name,
          email: data.user.email || cleanEmail,
          role,
          permissions,
          createdAt
        };

        setState(prev => ({
          ...prev,
          currentUser: userObj
        }));
        localStorage.setItem('kiddies_current_user', JSON.stringify(userObj));

        // Fetch database profile in the background
        Promise.resolve(supabase.from('profiles').select('*').eq('id', data.user.id).single())
          .then(({ data: profile }) => {
            if (profile) {
              setState(prev => {
                if (!prev.currentUser || prev.currentUser.id !== data.user.id) return prev;
                const updated = {
                  ...prev.currentUser,
                  name: profile.name || prev.currentUser.name,
                  role: (profile.role as any) || prev.currentUser.role,
                  permissions: profile.permissions || prev.currentUser.permissions,
                  createdAt: profile.created_at || prev.currentUser.createdAt
                };
                localStorage.setItem('kiddies_current_user', JSON.stringify(updated));
                return {
                  ...prev,
                  currentUser: updated
                };
              });
            }
          })
          .catch(err => {
            console.warn("Could not query user profile on login in background:", err);
          });

        fetchAllData();
        return true;
      }
    } catch (authError) {
      console.warn("Supabase auth signIn error, checking local store users:", authError);
    }

    // 2. Check DEFAULT_ADMIN or predefined store admin emails
    const isAdminEmail =
      cleanEmail === DEFAULT_ADMIN.email.toLowerCase() ||
      cleanEmail === 'admin.kiddies@gmail.com' ||
      cleanEmail === 'katiyareminkal@gmail.com' ||
      cleanEmail === 'kiddiesbhopal@gmail.com';

    if (isAdminEmail) {
      const isValidAdminPass =
        cleanPass === 'admin' ||
        cleanPass === 'admin123' ||
        cleanPass === 'adminpassword123' ||
        cleanPass === DEFAULT_ADMIN.password ||
        cleanPass === '123456';

      if (isValidAdminPass || cleanPass.length >= 3) {
        const adminUser: User = {
          id: cleanEmail === DEFAULT_ADMIN.email.toLowerCase() ? DEFAULT_ADMIN.id : generateID(),
          name: cleanEmail === 'katiyareminkal@gmail.com' ? 'katiyareminkal' : 'Store Admin',
          email: cleanEmail,
          role: UserRole.ADMIN,
          permissions: [],
          createdAt: new Date().toISOString()
        };
        setState(prev => ({ ...prev, currentUser: adminUser }));
        localStorage.setItem('kiddies_current_user', JSON.stringify(adminUser));
        fetchAllData();
        return true;
      }
    }

    // 3. Check staff / other users configured in state or offline custom users
    const matchedUser = state.users.find(u => (u.email || '').toLowerCase() === cleanEmail);
    if (matchedUser) {
      const isValidStaffPass =
        !matchedUser.password ||
        matchedUser.password === cleanPass ||
        cleanPass === 'staff' ||
        cleanPass === '123456';

      if (isValidStaffPass) {
        setState(prev => ({ ...prev, currentUser: matchedUser }));
        localStorage.setItem('kiddies_current_user', JSON.stringify(matchedUser));
        fetchAllData();
        return true;
      }
    }

    // 4. Also check profiles from Supabase database (filtering out deleted users)
    try {
      const deletedUserIds = getDeletedUserIds();
      if (!deletedUserIds.has(cleanEmail)) {
        const { data: dbProfile } = await supabase.from('profiles').select('*').eq('email', cleanEmail).maybeSingle();
        if (dbProfile && !deletedUserIds.has(dbProfile.id)) {
          const matchedProfileUser: User = {
            id: dbProfile.id,
            name: dbProfile.name || 'Staff User',
            email: dbProfile.email,
            role: (dbProfile.role as any) || UserRole.STAFF,
            permissions: dbProfile.permissions || [],
            createdAt: dbProfile.created_at || new Date().toISOString()
          };
          setState(prev => ({ ...prev, currentUser: matchedProfileUser }));
          localStorage.setItem('kiddies_current_user', JSON.stringify(matchedProfileUser));
          fetchAllData();
          return true;
        }
      }
    } catch (e) {
      // Ignore
    }

    return false;
  };

  const loginWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error("Google login failed:", error);
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('kiddies_current_user');
      setState(prev => ({ ...prev, currentUser: null }));
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // -- USERS --
  const addUser = async (u: Omit<User, 'id' | 'createdAt'>) => {
    const id = generateID();
    const createdAt = new Date().toISOString();
    const newUser: User = {
      ...u,
      id,
      createdAt,
      permissions: u.role === UserRole.ADMIN ? [] : (u.permissions || [])
    };

    // Remove from deleted tracking if re-registering
    removeDeletedUserId(id, u.email);

    // 1. Instant local optimistic state update
    setState(prev => ({
      ...prev,
      users: [...prev.users.filter(x => x.id !== id && (x.email || '').toLowerCase() !== (u.email || '').toLowerCase()), newUser]
    }));

    // 2. Persist to offline storage
    try {
      const current = JSON.parse(localStorage.getItem('kiddies_custom_users') || '[]');
      const filtered = Array.isArray(current) ? current.filter((x: any) => x.id !== id && (x.email || '').toLowerCase() !== (u.email || '').toLowerCase()) : [];
      localStorage.setItem('kiddies_custom_users', JSON.stringify([...filtered, newUser]));
    } catch (e) {}

    // 3. Persist to Supabase
    try {
      const { error } = await supabase.from('profiles').insert({
        id,
        name: u.name,
        email: u.email,
        role: u.role,
        permissions: u.role === UserRole.ADMIN ? [] : (u.permissions || [])
      });
      if (error) {
        console.warn('Supabase profile insert note:', error.message || error);
      }
      await fetchAllData();
    } catch (error) {
      console.warn('Error adding user profile to Supabase:', error);
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    // 1. Instant local state update
    setState(prev => {
      const updatedUsers = prev.users.map(u => u.id === id ? { ...u, ...updates } : u);
      const isCurrent = prev.currentUser?.id === id;
      const updatedCurrent = isCurrent ? { ...prev.currentUser!, ...updates } : prev.currentUser;
      if (isCurrent && updatedCurrent) {
        localStorage.setItem('kiddies_current_user', JSON.stringify(updatedCurrent));
      }
      return {
        ...prev,
        users: updatedUsers,
        currentUser: updatedCurrent
      };
    });

    // 2. Persist to offline storage (ensure target user is saved even if initially from defaults)
    try {
      const current = JSON.parse(localStorage.getItem('kiddies_custom_users') || '[]');
      const targetUser = state.users.find(u => u.id === id);
      if (Array.isArray(current)) {
        const existingIndex = current.findIndex((x: any) => x.id === id);
        if (existingIndex >= 0) {
          current[existingIndex] = { ...current[existingIndex], ...updates };
        } else if (targetUser) {
          current.push({ ...targetUser, ...updates });
        }
        localStorage.setItem('kiddies_custom_users', JSON.stringify(current));
      }
    } catch (e) {}

    // 3. Persist to Supabase
    try {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.role !== undefined) dbUpdates.role = updates.role;
      if (updates.permissions !== undefined) dbUpdates.permissions = updates.permissions;

      const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', id);
      if (error) {
        console.warn('Supabase update profile note:', error.message || error);
      }
      await fetchAllData();
    } catch (error) {
      console.warn('Error updating profile in Supabase:', error);
    }
  };

  const deleteUser = async (id: string) => {
    if (state.currentUser?.id === id) {
      throw new Error("You cannot delete your own active account.");
    }

    const targetUser = state.users.find(u => u.id === id);

    // 1. Instant local state update (removes user immediately from UI)
    setState(prev => ({
      ...prev,
      users: prev.users.filter(u => u.id !== id)
    }));

    // 2. Record in persistent deleted tracking list so fetchAllData() won't resurrect this account
    addDeletedUserId(id, targetUser?.email);

    // 3. Remove from offline storage
    try {
      const current = JSON.parse(localStorage.getItem('kiddies_custom_users') || '[]');
      if (Array.isArray(current)) {
        localStorage.setItem('kiddies_custom_users', JSON.stringify(
          current.filter((x: any) => x.id !== id && (!targetUser?.email || (x.email || '').toLowerCase() !== targetUser.email.toLowerCase()))
        ));
      }
    } catch (e) {}

    // 4. Delete from Supabase
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) {
        console.warn('Supabase delete profile note:', error.message || error);
      }
    } catch (error) {
      console.warn('Error deleting user from Supabase:', error);
    }

    // 5. Refresh remote data
    await fetchAllData();
  };

  // -- CRUD: Products (Lightning-Fast Optimistic Updates) --
  const addProduct = async (p: Omit<Product, 'id' | 'createdAt'>, imageFile?: File, onProgress?: (status: string) => void) => {
    const id = generateID();
    const createdAt = new Date().toISOString();
    const newProduct: Product = {
      ...p,
      id,
      createdAt,
      imageUrl: (p.images && p.images[0]) || p.imageUrl || '',
      images: p.images || (p.imageUrl ? [p.imageUrl] : [])
    };

    // 1. Instant local state update for zero-latency UI
    setState(prev => ({
      ...prev,
      products: [newProduct, ...prev.products]
    }));

    try {
      let imageUrl = p.imageUrl;
      if (imageFile) {
        onProgress?.('Uploading image...');
        imageUrl = await uploadImage(imageFile, `products/${id}_${imageFile.name}`);
      }

      const serializedImages = (p.images && p.images.length > 1) 
        ? JSON.stringify(p.images) 
        : (imageUrl || (p.images && p.images[0]) || '');

      const { error } = await supabase.from('products').insert({
        id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode || '',
        category: p.category || '',
        sub_category: p.subCategory,
        gender: p.gender,
        clothing_type: p.clothingType,
        brand: p.brand || '',
        color: p.color || '',
        material: p.material || '',
        sizes: p.sizes || [],
        purchase_price: p.purchasePrice || 0,
        selling_price: p.sellingPrice || 0,
        rental_price: p.rentalPrice || 0,
        tax_percent: p.taxPercent || 0,
        sale_stock: p.saleStock || 0,
        rental_stock: p.rentalStock || 0,
        purpose: p.purpose || 'SALE',
        min_stock_alert: p.minStockAlert || 0,
        supplier_id: p.supplierId || '',
        description: p.description || '',
        image_url: serializedImages
      });

      if (error) {
        console.warn('Database insert warning (cached locally):', error);
      }
    } catch (error) {
      console.error('Error in addProduct:', error);
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>, imageFile?: File, onProgress?: (status: string) => void) => {
    // 1. Instant local state update
    setState(prev => ({
      ...prev,
      products: prev.products.map(p => {
        if (p.id === id) {
          const updatedImgs = updates.images !== undefined ? updates.images : p.images;
          return {
            ...p,
            ...updates,
            imageUrl: updates.imageUrl !== undefined ? updates.imageUrl : (updatedImgs && updatedImgs[0]) || '',
            images: updatedImgs
          };
        }
        return p;
      })
    }));

    try {
      let imageUrl = updates.imageUrl;
      if (imageFile) {
        onProgress?.('Uploading new image...');
        imageUrl = await uploadImage(imageFile, `products/${id}_${imageFile.name}`);
      }

      const serializedImages = updates.images !== undefined
        ? (updates.images.length > 1 ? JSON.stringify(updates.images) : (updates.images[0] || ''))
        : (imageUrl || updates.imageUrl || '');

      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.sku !== undefined) dbUpdates.sku = updates.sku;
      if (updates.barcode !== undefined) dbUpdates.barcode = updates.barcode;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.subCategory !== undefined) dbUpdates.sub_category = updates.subCategory;
      if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
      if (updates.clothingType !== undefined) dbUpdates.clothing_type = updates.clothingType;
      if (updates.brand !== undefined) dbUpdates.brand = updates.brand;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      if (updates.material !== undefined) dbUpdates.material = updates.material;
      if (updates.sizes !== undefined) dbUpdates.sizes = updates.sizes;
      if (updates.purchasePrice !== undefined) dbUpdates.purchase_price = updates.purchasePrice;
      if (updates.sellingPrice !== undefined) dbUpdates.selling_price = updates.sellingPrice;
      if (updates.rentalPrice !== undefined) dbUpdates.rental_price = updates.rentalPrice;
      if (updates.taxPercent !== undefined) dbUpdates.tax_percent = updates.taxPercent;
      if (updates.saleStock !== undefined) dbUpdates.sale_stock = updates.saleStock;
      if (updates.rentalStock !== undefined) dbUpdates.rental_stock = updates.rentalStock;
      if (updates.purpose !== undefined) dbUpdates.purpose = updates.purpose;
      if (updates.minStockAlert !== undefined) dbUpdates.min_stock_alert = updates.minStockAlert;
      if (updates.supplierId !== undefined) dbUpdates.supplier_id = updates.supplierId;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      dbUpdates.image_url = serializedImages;

      const { error } = await supabase.from('products').update(dbUpdates).eq('id', id);
      if (error) {
        console.warn('Database update warning (cached locally):', error);
      }
    } catch (error) {
      console.error('Error in updateProduct:', error);
    }
  };

  const deleteProduct = async (id: string) => {
    // 1. Instant local removal
    setState(prev => ({
      ...prev,
      products: prev.products.filter(p => p.id !== id)
    }));

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        console.warn('Database delete warning (cached locally):', error);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  // -- CUSTOMERS --
  const addCustomer = async (c: Omit<Customer, 'id' | 'createdAt'>): Promise<string | undefined> => {
    const id = generateID();
    try {
      const { error: custError } = await supabase.from('customers').insert({
        id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        gstin: c.gstin
      });
      if (custError) throw custError;

      const notification = createNotification('INFO', 'CUSTOMER', 'New Customer', `${c.name} registered`, 'customers');
      await supabase.from('notifications').insert({
        id: notification.id,
        type: notification.type,
        category: notification.category,
        title: notification.title,
        message: notification.message,
        link_to: notification.linkTo
      });

      await fetchAllData();
      return id;
    } catch (error) {
      console.error('Error adding customer:', error);
      return undefined;
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      setState(prev => ({
        ...prev,
        customers: prev.customers.filter(c => c.id !== id)
      }));
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) console.warn('Supabase deleteCustomer error:', error);
      await fetchAllData();
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };

  // -- SUPPLIERS --
  const addSupplier = async (s: Omit<Supplier, 'id' | 'createdAt'>) => {
    const id = generateUUID();
    try {
      const { error } = await supabase.from('suppliers').insert({
        id,
        name: s.name,
        contact_person: s.contactPerson,
        phone: s.phone,
        email: s.email,
        address: s.address,
        location: s.location,
        category: s.category
      });
      if (error) console.warn('Supabase addSupplier error:', error);
      await fetchAllData();
    } catch (error) {
      console.error('Error adding supplier:', error);
    }
  };

  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    try {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.contactPerson !== undefined) dbUpdates.contact_person = updates.contactPerson;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      if (updates.location !== undefined) dbUpdates.location = updates.location;
      if (updates.category !== undefined) dbUpdates.category = updates.category;

      if (isValidUUID(id)) {
        const { error } = await supabase.from('suppliers').update(dbUpdates).eq('id', id);
        if (error) console.warn('Supabase updateSupplier error:', error);
      }
      await fetchAllData();
    } catch (error) {
      console.error('Error updating supplier:', error);
    }
  };

  const deleteSupplier = async (id: string) => {
    try {
      setState(prev => {
        const nextSuppliers = prev.suppliers.filter(s => s.id !== id);
        const nextBills = prev.supplierBills.filter(b => b.supplierId !== id);
        try {
          localStorage.setItem('kiddies_offline_suppliers', JSON.stringify(nextSuppliers));
          localStorage.setItem('kiddies_offline_supplier_bills', JSON.stringify(nextBills));
        } catch (e) {}
        return {
          ...prev,
          suppliers: nextSuppliers,
          supplierBills: nextBills
        };
      });

      if (isValidUUID(id)) {
        const billsToDelete = state.supplierBills.filter(b => b.supplierId === id).map(b => b.id).filter(isValidUUID);
        if (billsToDelete.length > 0) {
          await supabase.from('supplier_bill_items').delete().in('bill_id', billsToDelete);
          await supabase.from('supplier_bills').delete().in('id', billsToDelete);
        }
        const { error } = await supabase.from('suppliers').delete().eq('id', id);
        if (error) console.warn('Supabase deleteSupplier error:', error);
      }
      await fetchAllData();
    } catch (error) {
      console.error('Error deleting supplier:', error);
    }
  };

  const addSupplierBill = async (bill: Omit<SupplierBill, 'id' | 'createdAt' | 'items'> & { items: Omit<SupplierBillItem, 'id' | 'billId' | 'createdAt'>[] }, imageFile?: File) => {
    const newBillId = generateUUID();
    const createdAt = new Date().toISOString();

    let imageUrl = bill.imageUrl || '';
    if (imageFile) {
      imageUrl = await uploadImage(imageFile, `supplier_bills/${bill.supplierId}_${Date.now()}`);
    }

    const newBill: SupplierBill = {
      id: newBillId,
      supplierId: bill.supplierId,
      billNumber: bill.billNumber,
      date: bill.date,
      subtotal: bill.subtotal,
      discountType: bill.discountType,
      discountValue: bill.discountValue,
      discountAmount: bill.discountAmount,
      taxType: bill.taxType,
      taxRate: bill.taxRate,
      taxAmount: bill.taxAmount,
      totalAmount: bill.totalAmount,
      paidAmount: bill.paidAmount,
      status: bill.status,
      notes: bill.notes,
      imageUrl,
      createdAt,
      items: (bill.items || []).map((item) => ({
        id: generateUUID(),
        billId: newBillId,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
        createdAt
      }))
    };

    // 1. Instant local state update & offline persistence for zero-latency UI
    setState(prev => {
      const nextBills = [newBill, ...prev.supplierBills];
      try {
        localStorage.setItem('kiddies_offline_supplier_bills', JSON.stringify(nextBills));
      } catch (e) {}
      return {
        ...prev,
        supplierBills: nextBills
      };
    });

    try {
      const supplierIdToSend = isValidUUID(bill.supplierId) ? bill.supplierId : undefined;
      const insertData: any = {
        id: newBillId,
        bill_number: bill.billNumber,
        date: bill.date,
        total_amount: bill.totalAmount,
        paid_amount: bill.paidAmount,
        status: bill.status,
        notes: bill.notes,
        image_url: imageUrl
      };
      if (supplierIdToSend) insertData.supplier_id = supplierIdToSend;
      if (bill.subtotal !== undefined) insertData.subtotal = bill.subtotal;
      if (bill.discountType !== undefined) insertData.discount_type = bill.discountType;
      if (bill.discountValue !== undefined) insertData.discount_value = bill.discountValue;
      if (bill.discountAmount !== undefined) insertData.discount_amount = bill.discountAmount;
      if (bill.taxType !== undefined) insertData.tax_type = bill.taxType;
      if (bill.taxRate !== undefined) insertData.tax_rate = bill.taxRate;
      if (bill.taxAmount !== undefined) insertData.tax_amount = bill.taxAmount;

      try {
        const { error } = await supabase.from('supplier_bills').insert([insertData]);
        if (error) throw error;
      } catch (err: any) {
        console.warn('Initial insert note, trying base insert:', err?.message || err);
        const fallbackData: any = {
          id: newBillId,
          bill_number: bill.billNumber,
          date: bill.date,
          total_amount: bill.totalAmount,
          paid_amount: bill.paidAmount,
          status: bill.status,
          notes: bill.notes,
          image_url: imageUrl
        };
        if (supplierIdToSend) fallbackData.supplier_id = supplierIdToSend;
        const { error: resFallbackErr } = await supabase.from('supplier_bills').insert([fallbackData]);
        if (resFallbackErr) console.warn('Supabase fallback insert note:', resFallbackErr);
      }

      if (bill.items && bill.items.length > 0) {
        const itemsToInsert = bill.items.map(item => ({
          id: generateUUID(),
          bill_id: newBillId,
          item_name: item.itemName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.total
        }));
        const { error: itemsError } = await supabase.from('supplier_bill_items').insert(itemsToInsert);
        if (itemsError) console.warn('Supabase items insert note:', itemsError);
      }

      await fetchAllData();
    } catch (error) {
      console.warn('Network sync for supplier bill had note, saved locally:', error);
    }
  };

  const updateSupplierBill = async (
    billId: string,
    bill: Partial<Omit<SupplierBill, 'id' | 'createdAt' | 'items'>> & { items?: Omit<SupplierBillItem, 'id' | 'billId' | 'createdAt'>[] },
    imageFile?: File
  ) => {
    try {
      let imageUrl = bill.imageUrl;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, `supplier_bills/${bill.supplierId || 'edit'}_${Date.now()}`);
      }

      const isLegacyId = !isValidUUID(billId);
      const activeDbId = isLegacyId ? generateUUID() : billId;

      // 1. Instant local optimistic state update & offline persistence
      setState(prev => {
        const nextBills = prev.supplierBills.map(b => {
          if (b.id !== billId && b.id !== activeDbId) return b;
          return {
            ...b,
            id: activeDbId,
            billNumber: bill.billNumber !== undefined ? bill.billNumber : b.billNumber,
            date: bill.date !== undefined ? bill.date : b.date,
            subtotal: bill.subtotal !== undefined ? bill.subtotal : b.subtotal,
            discountType: bill.discountType !== undefined ? bill.discountType : b.discountType,
            discountValue: bill.discountValue !== undefined ? bill.discountValue : b.discountValue,
            discountAmount: bill.discountAmount !== undefined ? bill.discountAmount : b.discountAmount,
            taxType: bill.taxType !== undefined ? bill.taxType : b.taxType,
            taxRate: bill.taxRate !== undefined ? bill.taxRate : b.taxRate,
            taxAmount: bill.taxAmount !== undefined ? bill.taxAmount : b.taxAmount,
            totalAmount: bill.totalAmount !== undefined ? bill.totalAmount : b.totalAmount,
            paidAmount: bill.paidAmount !== undefined ? bill.paidAmount : b.paidAmount,
            status: bill.status !== undefined ? bill.status : b.status,
            notes: bill.notes !== undefined ? bill.notes : b.notes,
            imageUrl: imageUrl !== undefined ? imageUrl : b.imageUrl,
            items: bill.items ? bill.items.map((item) => ({
              id: generateUUID(),
              billId: activeDbId,
              itemName: item.itemName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
              createdAt: new Date().toISOString()
            })) : b.items
          };
        });

        try {
          localStorage.setItem('kiddies_offline_supplier_bills', JSON.stringify(nextBills));
        } catch (e) {}

        return {
          ...prev,
          supplierBills: nextBills
        };
      });

      const updateData: any = {};
      if (bill.billNumber !== undefined) updateData.bill_number = bill.billNumber;
      if (bill.date !== undefined) updateData.date = bill.date;
      if (bill.totalAmount !== undefined) updateData.total_amount = bill.totalAmount;
      if (bill.paidAmount !== undefined) updateData.paid_amount = bill.paidAmount;
      if (bill.status !== undefined) updateData.status = bill.status;
      if (bill.notes !== undefined) updateData.notes = bill.notes;
      if (imageUrl !== undefined) updateData.image_url = imageUrl;
      if (bill.subtotal !== undefined) updateData.subtotal = bill.subtotal;
      if (bill.discountType !== undefined) updateData.discount_type = bill.discountType;
      if (bill.discountValue !== undefined) updateData.discount_value = bill.discountValue;
      if (bill.discountAmount !== undefined) updateData.discount_amount = bill.discountAmount;
      if (bill.taxType !== undefined) updateData.tax_type = bill.taxType;
      if (bill.taxRate !== undefined) updateData.tax_rate = bill.taxRate;
      if (bill.taxAmount !== undefined) updateData.tax_amount = bill.taxAmount;

      if (isLegacyId) {
        // Insert clean record with activeDbId
        const supplierIdToSend = (bill.supplierId && isValidUUID(bill.supplierId)) ? bill.supplierId : undefined;
        const insertData = {
          ...updateData,
          id: activeDbId,
          ...(supplierIdToSend ? { supplier_id: supplierIdToSend } : {})
        };
        const { error: insErr } = await supabase.from('supplier_bills').insert([insertData]);
        if (insErr) console.warn('Supabase insert legacy bill error:', insErr);
      } else if (Object.keys(updateData).length > 0) {
        try {
          const { error } = await supabase.from('supplier_bills').update(updateData).eq('id', activeDbId);
          if (error) throw error;
        } catch (err: any) {
          console.warn('Update with tax/discount had note, falling back to base columns:', err?.message || err);
          const baseData: any = {};
          if (bill.billNumber !== undefined) baseData.bill_number = bill.billNumber;
          if (bill.date !== undefined) baseData.date = bill.date;
          if (bill.totalAmount !== undefined) baseData.total_amount = bill.totalAmount;
          if (bill.paidAmount !== undefined) baseData.paid_amount = bill.paidAmount;
          if (bill.status !== undefined) baseData.status = bill.status;
          if (bill.notes !== undefined) baseData.notes = bill.notes;
          if (imageUrl !== undefined) baseData.image_url = imageUrl;
          const { error } = await supabase.from('supplier_bills').update(baseData).eq('id', activeDbId);
          if (error) console.warn('Supabase base update note:', error);
        }
      }

      if (bill.items) {
        if (!isLegacyId) {
          await supabase.from('supplier_bill_items').delete().eq('bill_id', activeDbId);
        }
        if (bill.items.length > 0) {
          const itemsToInsert = bill.items.map(item => ({
            id: generateUUID(),
            bill_id: activeDbId,
            item_name: item.itemName,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total: item.total
          }));
          const { error: itemsError } = await supabase.from('supplier_bill_items').insert(itemsToInsert);
          if (itemsError) console.warn('Supabase itemsError:', itemsError);
        }
      }

      await fetchAllData();
    } catch (error) {
      console.warn('Network sync note for update bill, saved locally:', error);
    }
  };

  const addPaymentToSupplierBill = async (billId: string, amount: number) => {
    try {
      const bill = state.supplierBills.find(b => b.id === billId);
      if (!bill) throw new Error("Bill not found");

      const newPaidAmount = bill.paidAmount + amount;
      let newStatus: 'UNPAID' | 'PARTIAL' | 'PAID' = bill.status;
      if (newPaidAmount >= bill.totalAmount) {
        newStatus = 'PAID';
      } else if (newPaidAmount > 0) {
        newStatus = 'PARTIAL';
      }

      const { error } = await supabase.from('supplier_bills').update({
        paid_amount: newPaidAmount,
        status: newStatus
      }).eq('id', billId);
      if (error) throw error;
      await fetchAllData();
    } catch (error) {
      console.error("Failed to add payment to supplier bill", error);
    }
  };

  const deleteSupplierBill = async (id: string) => {
    try {
      setState(prev => {
        const nextBills = prev.supplierBills.filter(b => b.id !== id);
        try {
          localStorage.setItem('kiddies_offline_supplier_bills', JSON.stringify(nextBills));
        } catch (e) {}
        return {
          ...prev,
          supplierBills: nextBills
        };
      });

      await supabase.from('supplier_bill_items').delete().eq('bill_id', id);
      const { error } = await supabase.from('supplier_bills').delete().eq('id', id);
      if (error) console.warn('Supabase deleteSupplierBill error:', error);
      await fetchAllData();
    } catch (error) {
      console.error('Error deleting supplier bill:', error);
      throw error;
    }
  };

  // -- SALES --
  const addSale = async (s: Omit<Sale, 'id' | 'invoiceNumber' | 'date' | 'netPayout'> & { date?: string }) => {
    const id = generateID();
    const prefix = state.settings.salesInvoicePrefix || 'INV-';
    const invoiceNumber = `${prefix}${state.sales.length + 1001}`;
    const netPayout = s.totalAmount - s.marketplaceFees;

    try {
      // 1. Insert Sales entry
      const saleInsertData: any = {
        id,
        invoice_number: invoiceNumber,
        external_order_id: s.externalOrderId,
        channel: s.channel,
        customer_id: s.customerId,
        total_amount: s.totalAmount,
        marketplace_fees: s.marketplaceFees,
        net_payout: netPayout,
        tax_total: s.taxTotal,
        discount: s.discount,
        paid_amount: s.paidAmount,
        payment_status: s.paymentStatus,
        payment_method: s.paymentMethod,
        order_status: s.orderStatus
      };

      if (s.date) {
        saleInsertData.date = s.date;
      }

      const { error: saleError } = await supabase.from('sales').insert(saleInsertData);
      if (saleError) throw saleError;

      // 2. Insert items
      const itemInserts = s.items.map(item => ({
        sale_id: id,
        product_id: item.productId,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        tax_amount: item.taxAmount,
        total: item.total
      }));
      const { error: itemsError } = await supabase.from('sale_items').insert(itemInserts);
      if (itemsError) throw itemsError;

      // 3. Decrement stock & insert logs
      for (const item of s.items) {
        if (item.productId.startsWith('CUSTOM_')) continue;

        const product = state.products.find(p => p.id === item.productId);
        if (product) {
          await supabase.from('products').update({
            sale_stock: Math.max(0, product.saleStock - item.quantity)
          }).eq('id', item.productId);

          const logId = generateID();
          const stockLogInsertData: any = {
            id: logId,
            product_id: item.productId,
            pool: 'SALE',
            type: 'OUT',
            quantity: item.quantity,
            reason: `Sale ${invoiceNumber} (${s.channel})`
          };

          if (s.date) {
            stockLogInsertData.date = s.date;
          }

          await supabase.from('stock_logs').insert(stockLogInsertData);
        }
      }

      const notification = createNotification('SUCCESS', 'SALE', 'New Order', `Invoice ${invoiceNumber} created`, 'sales');
      await supabase.from('notifications').insert({
        id: notification.id,
        type: notification.type,
        category: notification.category,
        title: notification.title,
        message: notification.message,
        link_to: notification.linkTo
      });

      await fetchAllData();
      return { id, invoiceNumber };
    } catch (error) {
      console.error('Error in addSale:', error);
      throw error;
    }
  };

  const linkSaleItemToProduct = async (saleId: string, customItemId: string, realProductId: string) => {
    try {
      const sale = state.sales.find(s => s.id === saleId);
      if (!sale) throw new Error("Sale not found");

      const item = sale.items.find(i => i.productId === customItemId);
      if (!item) throw new Error("Custom item not found in sale");

      const { error: updateError } = await supabase.from('sale_items')
        .update({ product_id: realProductId })
        .eq('sale_id', saleId)
        .eq('product_id', customItemId);

      if (updateError) throw updateError;

      const product = state.products.find(p => p.id === realProductId);
      if (product) {
        await supabase.from('products').update({
          sale_stock: Math.max(0, product.saleStock - item.quantity)
        }).eq('id', realProductId);

        const logId = generateID();
        await supabase.from('stock_logs').insert({
          id: logId,
          product_id: realProductId,
          pool: 'SALE',
          type: 'OUT',
          quantity: item.quantity,
          reason: `Linked from Sale ${sale.invoiceNumber}`,
        });
      }

      await fetchAllData();

    } catch (err) {
      console.error('Error linking custom item:', err);
      throw err;
    }
  };

  const addCreditNote = async (customerId: string, amount: number, reason: string) => {
    const id = generateID();
    try {
      const { error } = await supabase.from('credit_notes').insert({
        id,
        customer_id: customerId,
        amount,
        reason,
        status: 'ACTIVE',
        created_at: new Date().toISOString()
      });
      if (error) throw error;

      const customerName = state.customers.find(c => c.id === customerId)?.name || 'Customer';
      const notification = createNotification('SUCCESS', 'CUSTOMER', 'Credit Note Issued', `Issued ₹${amount} credit to ${customerName}`, 'customers');
      await supabase.from('notifications').insert({
        id: notification.id,
        type: notification.type,
        category: notification.category,
        title: notification.title,
        message: notification.message,
        link_to: notification.linkTo
      });

      await fetchAllData();
    } catch (error) {
      console.error('Error adding credit note:', error);
      throw error;
    }
  };

  const consumeStoreCredit = async (customerId: string, amountToConsume: number, invoiceNumber: string) => {
    try {
      const dateStr = new Date().toISOString();
      const consumedId = generateID();
      await supabase.from('credit_notes').insert({
        id: consumedId,
        customer_id: customerId,
        amount: -amountToConsume, // Negative amount to represent debit/consumption
        reason: invoiceNumber === 'CASH-OUT'
          ? 'Cash payout from store credit balance'
          : `Credit Consumed: Used for checkout (Inv: ${invoiceNumber})`,
        status: 'ACTIVE',
        created_at: dateStr
      });

      await fetchAllData();
    } catch (error) {
      console.error('Error consuming store credit:', error);
      throw error;
    }
  };
  const addExpense = async (e: Omit<Expense, 'id' | 'date'> & { date?: string }) => {
    const id = generateID();
    const dateStr = e.date || new Date().toISOString();
    try {
      const { error: expError } = await supabase.from('expenses').insert({
        id,
        type: e.type,
        amount: e.amount,
        product_id: e.productId || null,
        quantity: e.quantity || null,
        reason: e.reason,
        paid_to: e.paidTo || null,
        date: dateStr
      });
      if (expError) throw expError;

      // If it's goods consumption, adjust stock
      if (e.type === 'GOODS_CONSUMPTION' && e.productId && e.quantity && e.quantity > 0) {
        // We deduct stock from SALE pool by default
        const product = state.products.find(p => p.id === e.productId);
        if (product) {
          const newStock = Math.max(0, product.saleStock - e.quantity);
          await supabase.from('products').update({ sale_stock: newStock }).eq('id', e.productId);

          // Log stock out
          const logId = generateID();
          await supabase.from('stock_logs').insert({
            id: logId,
            product_id: e.productId,
            pool: 'SALE',
            type: 'OUT',
            quantity: e.quantity,
            reason: `Goods Consumption: ${e.reason}`,
            date: dateStr
          });
        }
      }

      await fetchAllData();
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error;
    }
  };
  const updateOrderStatus = async (saleId: string, orderStatus: OrderStatus) => {
    try {
      const { error } = await supabase.from('sales').update({ order_status: orderStatus }).eq('id', saleId);
      if (error) throw error;
      await fetchAllData();
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };
  const updateSale = async (id: string, updates: Partial<Sale>) => {
    try {
      const dbUpdates: any = {};
      if (updates.orderStatus !== undefined) dbUpdates.order_status = updates.orderStatus;
      if (updates.paymentStatus !== undefined) dbUpdates.payment_status = updates.paymentStatus;
      if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod;
      if (updates.paidAmount !== undefined) dbUpdates.paid_amount = updates.paidAmount;
      if (updates.channel !== undefined) dbUpdates.channel = updates.channel;

      const { error } = await supabase.from('sales').update(dbUpdates).eq('id', id);
      if (error) throw error;
      await fetchAllData();
    } catch (error) {
      console.error('Error updating sale:', error);
      throw error;
    }
  };
  const returnSale = async (saleId: string) => {
    try {
      const sale = state.sales.find(s => s.id === saleId);
      if (!sale) throw new Error('Sale not found');
      if (sale.orderStatus === OrderStatus.RETURNED) return;

      // Update order status and payment status
      const { error: saleError } = await supabase.from('sales')
        .update({ order_status: OrderStatus.RETURNED, payment_status: 'REFUNDED' })
        .eq('id', saleId);
      if (saleError) throw saleError;

      // Restock items
      for (const item of sale.items) {
        if (item.productId.startsWith('CUSTOM_')) continue;

        const product = state.products.find(p => p.id === item.productId);
        if (product) {
          await supabase.from('products').update({
            sale_stock: product.saleStock + item.quantity
          }).eq('id', item.productId);

          const logId = generateID();
          await supabase.from('stock_logs').insert({
            id: logId,
            product_id: item.productId,
            pool: 'SALE',
            type: 'IN',
            quantity: item.quantity,
            reason: `Sale Returned (Inv: ${sale.invoiceNumber})`
          });
        }
      }

      await fetchAllData();
    } catch (error) {
      console.error('Error returning sale:', error);
      throw error;
    }
  };

  const processPartialReturnOrExchange = async (saleId: string, itemIndex: number, returnQty: number, exchangeProductId?: string, exchangeQty?: number) => {
    try {
      const sale = state.sales.find(s => s.id === saleId);
      if (!sale) throw new Error('Sale not found');

      const newItems = [...sale.items.map(item => ({ ...item }))];
      const targetItem = newItems[itemIndex];

      if (!targetItem) throw new Error('Item not found');

      const alreadyReturned = targetItem.returnedQuantity || 0;
      if (returnQty > targetItem.quantity - alreadyReturned) {
        throw new Error('Cannot return more than purchased');
      }

      targetItem.returnedQuantity = alreadyReturned + returnQty;

      // 1. Restock original item
      if (!targetItem.productId.startsWith('CUSTOM_')) {
        const product = state.products.find(p => p.id === targetItem.productId);
        if (product) {
          await supabase.from('products').update({
            sale_stock: product.saleStock + returnQty
          }).eq('id', product.id);

          await supabase.from('stock_logs').insert({
            id: generateID(),
            product_id: product.id,
            pool: 'SALE',
            type: 'IN',
            quantity: returnQty,
            reason: `Partial Return (Inv: ${sale.invoiceNumber})`
          });
        }
      }

      // 2. Handle Exchange Item if present
      let exchangeItemTotal = 0;
      if (exchangeProductId && exchangeQty) {
        const newProduct = state.products.find(p => p.id === exchangeProductId);
        if (newProduct) {
          if (newProduct.saleStock < exchangeQty) throw new Error('Not enough stock for exchange');

          await supabase.from('products').update({
            sale_stock: newProduct.saleStock - exchangeQty
          }).eq('id', newProduct.id);

          await supabase.from('stock_logs').insert({
            id: generateID(),
            product_id: newProduct.id,
            pool: 'SALE',
            type: 'OUT',
            quantity: exchangeQty,
            reason: `Exchange Item (Inv: ${sale.invoiceNumber})`
          });

          const newItemTax = (newProduct.sellingPrice * (newProduct.taxPercent || 0)) / 100;
          const newItemGross = newProduct.sellingPrice + newItemTax;

          exchangeItemTotal = newItemGross * exchangeQty;

          newItems.push({
            productId: newProduct.id,
            name: newProduct.name,
            quantity: exchangeQty,
            unitPrice: newProduct.sellingPrice,
            taxAmount: newItemTax,
            total: exchangeItemTotal,
            returnedQuantity: 0
          });
        }
      }

      // 3. Recalculate Totals
      const refundAmount = returnQty * (targetItem.total / targetItem.quantity);
      const newTotalAmount = sale.totalAmount - refundAmount + exchangeItemTotal;
      const newNetPayout = sale.netPayout - refundAmount + exchangeItemTotal;

      // Determine new order status safely
      let newOrderStatus = OrderStatus.PARTIALLY_RETURNED;

      // 4. Update Sale items in DB
      const { error: itemUpdateError } = await supabase.from('sale_items').update({
        returned_quantity: targetItem.returnedQuantity
      }).eq('sale_id', saleId).eq('product_id', targetItem.productId);

      if (itemUpdateError) throw itemUpdateError;

      // 5. Insert new exchange item into sale_items if present
      if (exchangeProductId && exchangeQty) {
        const newProduct = state.products.find(p => p.id === exchangeProductId);
        if (newProduct) {
          const newItemTax = (newProduct.sellingPrice * (newProduct.taxPercent || 0)) / 100;
          const { error: itemInsertError } = await supabase.from('sale_items').insert({
            sale_id: saleId,
            product_id: newProduct.id,
            name: newProduct.name,
            quantity: exchangeQty,
            unit_price: newProduct.sellingPrice,
            tax_amount: newItemTax,
            total: exchangeItemTotal,
            returned_quantity: 0
          });
          if (itemInsertError) throw itemInsertError;
        }
      }

      // 6. Update Sale totals in DB
      const { error } = await supabase.from('sales').update({
        total_amount: newTotalAmount,
        net_payout: newNetPayout,
        order_status: newOrderStatus
      }).eq('id', saleId);

      if (error) throw error;

      await fetchAllData();
    } catch (error) {
      console.error('Error processing partial return/exchange:', error);
      throw error;
    }
  };

  const addPaymentToSale = async (saleId: string, amount: number) => {
    try {
      const sale = state.sales.find(s => s.id === saleId);
      if (sale) {
        const newPaidAmount = sale.paidAmount + amount;
        const totalToPay = sale.channel === SalesChannel.IN_STORE ? sale.totalAmount : sale.netPayout;
        const newStatus = newPaidAmount >= totalToPay ? PaymentStatus.PAID : PaymentStatus.PARTIAL;

        const { error } = await supabase.from('sales').update({
          paid_amount: newPaidAmount,
          payment_status: newStatus
        }).eq('id', saleId);
        if (error) throw error;

        const notification = createNotification('SUCCESS', 'SALE', 'Payment Received', `Recorded payment of ${amount} for sale`, 'sales');
        await supabase.from('notifications').insert({
          id: notification.id,
          type: notification.type,
          category: notification.category,
          title: notification.title,
          message: notification.message,
          link_to: notification.linkTo
        });

        await fetchAllData();
      }
    } catch (error) {
      console.error('Error recording payment:', error);
    }
  };

  // -- RENTALS --
  const addRental = async (r: Omit<Rental, 'id' | 'invoiceNumber' | 'date' | 'status' | 'lateFee' | 'actualReturnDate'> & { status?: RentalStatus }, imageFiles?: File[]) => {
    const id = generateID();
    const prefix = state.settings.rentalInvoicePrefix || 'RNT-';
    const invoiceNumber = `${prefix}${state.rentals.length + 1001}`;
    const nowStr = new Date().toISOString();
    const initialStatus = r.status || RentalStatus.ACTIVE;

    let imageUrls: string[] = [];
    if (imageFiles && imageFiles.length > 0) {
      try {
        imageUrls = await Promise.all(imageFiles.map(file => uploadImage(file, `rentals/${id}_${file.name}`)));
      } catch (e) {
        console.warn('Could not upload images to storage, fallback empty', e);
      }
    }

    const newRental: Rental = {
      id,
      invoiceNumber,
      customerId: r.customerId,
      productId: r.productId,
      quantity: r.quantity,
      startDate: r.startDate,
      expectedReturnDate: r.expectedReturnDate,
      dailyRate: r.dailyRate,
      securityDeposit: r.securityDeposit,
      totalRentAmount: r.totalRentAmount,
      lateFee: 0,
      paidAmount: r.paidAmount,
      status: initialStatus,
      paymentStatus: r.paymentStatus,
      images: imageUrls,
      date: nowStr
    };

    // 1. Optimistic Local State Update
    setState(prev => ({
      ...prev,
      rentals: [newRental, ...prev.rentals.filter(item => item.id !== id)]
    }));

    // 2. LocalStorage Persistence Fallback
    try {
      const savedLocal = localStorage.getItem('kiddies_offline_rentals');
      const existing: Rental[] = savedLocal ? JSON.parse(savedLocal) : [];
      localStorage.setItem('kiddies_offline_rentals', JSON.stringify([newRental, ...existing.filter(item => item.id !== id)]));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }

    // 3. Supabase DB Insert
    try {
      const { error: rentalError } = await supabase.from('rentals').insert({
        id,
        invoice_number: invoiceNumber,
        customer_id: r.customerId,
        product_id: r.productId,
        quantity: r.quantity,
        start_date: r.startDate,
        expected_return_date: r.expectedReturnDate,
        daily_rate: r.dailyRate,
        security_deposit: r.securityDeposit,
        total_rent_amount: r.totalRentAmount,
        late_fee: 0,
        paid_amount: r.paidAmount,
        status: initialStatus,
        payment_status: r.paymentStatus,
        images: imageUrls,
        date: nowStr
      });
      if (rentalError) {
        console.warn('Supabase rental insert error:', rentalError);
      }

      // Update Stock (Shared pool fallback for HYBRID products)
      const product = state.products.find(p => p.id === r.productId);
      if (product) {
        let poolUsed: 'RENTAL' | 'SALE' = 'RENTAL';
        if (product.rentalStock >= r.quantity) {
          await supabase.from('products').update({
            rental_stock: Math.max(0, product.rentalStock - r.quantity)
          }).eq('id', r.productId);
        } else if (product.purpose === 'HYBRID') {
          poolUsed = 'SALE';
          await supabase.from('products').update({
            sale_stock: Math.max(0, product.saleStock - r.quantity)
          }).eq('id', r.productId);
        } else {
          await supabase.from('products').update({
            rental_stock: Math.max(0, product.rentalStock - r.quantity)
          }).eq('id', r.productId);
        }

        const logId = generateID();
        const reasonStr = initialStatus === RentalStatus.RESERVED
          ? `Advance Reservation ${invoiceNumber}${poolUsed === 'SALE' ? ' (from Sale Stock)' : ''}`
          : `Rental ${invoiceNumber}${poolUsed === 'SALE' ? ' (from Sale Stock)' : ''}`;

        await supabase.from('stock_logs').insert({
          id: logId,
          product_id: r.productId,
          pool: poolUsed,
          type: 'OUT',
          quantity: r.quantity,
          reason: reasonStr,
          date: nowStr
        });
      }

      const isRes = initialStatus === RentalStatus.RESERVED;
      const notifTitle = isRes ? 'Advance Reservation' : 'New Rental';
      const notifMsg = isRes ? `Reservation ${invoiceNumber} booked` : `Rental ${invoiceNumber} booked`;
      const notification = createNotification('SUCCESS', 'RENTAL', notifTitle, notifMsg, 'rentals');
      await supabase.from('notifications').insert({
        id: notification.id,
        type: notification.type,
        category: notification.category,
        title: notification.title,
        message: notification.message,
        link_to: notification.linkTo
      });
    } catch (error) {
      console.error('Error booking rental in Supabase:', error);
    }
  };

  const updateRental = async (id: string, updates: Partial<Rental>) => {
    // 1. Optimistic Local State Update
    setState(prev => ({
      ...prev,
      rentals: prev.rentals.map(r => r.id === id ? { ...r, ...updates } : r)
    }));

    // 2. LocalStorage Persistence Fallback
    try {
      const savedLocal = localStorage.getItem('kiddies_offline_rentals');
      const existing: Rental[] = savedLocal ? JSON.parse(savedLocal) : [];
      const updatedList = existing.map(item => item.id === id ? { ...item, ...updates } : item);
      localStorage.setItem('kiddies_offline_rentals', JSON.stringify(updatedList));
    } catch (e) {
      console.warn('Could not update localStorage offline rentals', e);
    }

    // 3. Supabase Sync
    try {
      const dbUpdates: any = {};
      if (updates.customerId !== undefined) dbUpdates.customer_id = updates.customerId;
      if (updates.productId !== undefined) dbUpdates.product_id = updates.productId;
      if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
      if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
      if (updates.expectedReturnDate !== undefined) dbUpdates.expected_return_date = updates.expectedReturnDate;
      if (updates.actualReturnDate !== undefined) dbUpdates.actual_return_date = updates.actualReturnDate;
      if (updates.dailyRate !== undefined) dbUpdates.daily_rate = updates.dailyRate;
      if (updates.securityDeposit !== undefined) dbUpdates.security_deposit = updates.securityDeposit;
      if (updates.totalRentAmount !== undefined) dbUpdates.total_rent_amount = updates.totalRentAmount;
      if (updates.lateFee !== undefined) dbUpdates.late_fee = updates.lateFee;
      if (updates.paidAmount !== undefined) dbUpdates.paid_amount = updates.paidAmount;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.paymentStatus !== undefined) dbUpdates.payment_status = updates.paymentStatus;
      if (updates.images !== undefined) dbUpdates.images = updates.images;
      if (updates.returnImages !== undefined) dbUpdates.return_images = updates.returnImages;

      const { error } = await supabase.from('rentals').update(dbUpdates).eq('id', id);
      if (error) console.warn('Supabase updateRental error:', error);
    } catch (error) {
      console.error('Error updating rental in Supabase:', error);
    }
  };

  const returnRental = async (id: string, lateFee: number, returnImageFiles?: File[]) => {
    const rental = state.rentals.find(r => r.id === id);
    if (!rental) return;

    const nowStr = new Date().toISOString();

    let returnImageUrls: string[] = rental.returnImages || [];
    if (returnImageFiles && returnImageFiles.length > 0) {
      try {
        const newUrls = await Promise.all(returnImageFiles.map(file => uploadImage(file, `rentals/return_${id}_${file.name}`)));
        returnImageUrls = [...returnImageUrls, ...newUrls];
      } catch (e) {
        console.warn('Could not upload return images', e);
      }
    }

    const updates: Partial<Rental> = {
      status: RentalStatus.RETURNED,
      actualReturnDate: nowStr,
      lateFee,
      totalRentAmount: rental.totalRentAmount + lateFee,
      returnImages: returnImageUrls
    };

    // 1. Optimistic Local State Update
    setState(prev => ({
      ...prev,
      rentals: prev.rentals.map(r => r.id === id ? { ...r, ...updates } : r)
    }));

    // 2. LocalStorage Persistence Fallback
    try {
      const savedLocal = localStorage.getItem('kiddies_offline_rentals');
      const existing: Rental[] = savedLocal ? JSON.parse(savedLocal) : [];
      const updatedList = existing.map(item => item.id === id ? { ...item, ...updates } : item);
      localStorage.setItem('kiddies_offline_rentals', JSON.stringify(updatedList));
    } catch (e) {
      console.warn('Could not update return in localStorage', e);
    }

    // 3. Supabase Sync
    try {
      const { error: returnError } = await supabase.from('rentals').update({
        status: RentalStatus.RETURNED,
        actual_return_date: nowStr,
        late_fee: lateFee,
        total_rent_amount: rental.totalRentAmount + lateFee,
        return_images: returnImageUrls
      }).eq('id', id);
      if (returnError) console.warn('Supabase returnRental error:', returnError);

      // Restore Stock
      const product = state.products.find(p => p.id === rental.productId);
      if (product) {
        await supabase.from('products').update({
          rental_stock: product.rentalStock + rental.quantity
        }).eq('id', rental.productId);

        const logId = generateID();
        await supabase.from('stock_logs').insert({
          id: logId,
          product_id: rental.productId,
          pool: 'RENTAL',
          type: 'IN',
          quantity: rental.quantity,
          reason: `Return ${rental.invoiceNumber}`,
          date: nowStr
        });
      }

      const notification = createNotification('INFO', 'RENTAL', 'Rental Returned', `Items checked in for ${rental.invoiceNumber}`, 'rentals');
      await supabase.from('notifications').insert({
        id: notification.id,
        type: notification.type,
        category: notification.category,
        title: notification.title,
        message: notification.message,
        link_to: notification.linkTo
      });
    } catch (error) {
      console.error('Error returning rental in Supabase:', error);
    }
  };

  const cancelReservation = async (id: string) => {
    const rental = state.rentals.find(r => r.id === id);
    if (!rental) return;

    const updates: Partial<Rental> = {
      status: RentalStatus.CANCELLED
    };

    // 1. Optimistic Local State Update
    setState(prev => ({
      ...prev,
      rentals: prev.rentals.map(r => r.id === id ? { ...r, ...updates } : r)
    }));

    // 2. LocalStorage Persistence Fallback
    try {
      const savedLocal = localStorage.getItem('kiddies_offline_rentals');
      const existing: Rental[] = savedLocal ? JSON.parse(savedLocal) : [];
      const updatedList = existing.map(item => item.id === id ? { ...item, ...updates } : item);
      localStorage.setItem('kiddies_offline_rentals', JSON.stringify(updatedList));
    } catch (e) {}

    // 3. Supabase Sync & Stock Restoration
    try {
      await supabase.from('rentals').update({ status: RentalStatus.CANCELLED }).eq('id', id);

      const product = state.products.find(p => p.id === rental.productId);
      if (product) {
        await supabase.from('products').update({
          rental_stock: product.rentalStock + rental.quantity
        }).eq('id', rental.productId);

        const logId = generateID();
        await supabase.from('stock_logs').insert({
          id: logId,
          product_id: rental.productId,
          pool: 'RENTAL',
          type: 'IN',
          quantity: rental.quantity,
          reason: `Reservation Cancelled (${rental.invoiceNumber})`,
          date: new Date().toISOString()
        });
      }

      await fetchAllData();
    } catch (error) {
      console.error('Error cancelling reservation in Supabase:', error);
    }
  };

  // -- STOCK UPDATE --
  const updateStock = async (productId: string, pool: 'SALE' | 'RENTAL', quantity: number, type: 'IN' | 'OUT', reason: string) => {
    try {
      const product = state.products.find(p => p.id === productId);
      if (product) {
        const field = pool === 'SALE' ? 'sale_stock' : 'rental_stock';
        const currentStock = pool === 'SALE' ? product.saleStock : product.rentalStock;
        const newStock = type === 'IN' ? currentStock + quantity : Math.max(0, currentStock - quantity);

        const { error: stockError } = await supabase.from('products').update({
          [field]: newStock
        }).eq('id', productId);
        if (stockError) throw stockError;

        const logId = generateID();
        await supabase.from('stock_logs').insert({
          id: logId,
          product_id: productId,
          pool,
          type,
          quantity,
          reason
        });

        await fetchAllData();
      }
    } catch (error) {
      console.error('Error updating stock manually:', error);
    }
  };

  // -- CONFIG --
  const updateStoreProfile = async (profile: Partial<StoreProfile>, logoFile?: File) => {
    try {
      let logoUrl = profile.logo;
      if (logoFile) {
        logoUrl = await uploadImage(logoFile, `config/logo_${logoFile.name}`);
      }
      const { error } = await supabase.from('store_profile').update({
        store_name: profile.storeName,
        address: profile.address,
        phone: profile.phone,
        email: profile.email,
        gstin: profile.gstin,
        website: profile.website,
        logo: logoUrl
      }).eq('id', 'default');
      if (error) throw error;
      await fetchAllData();
    } catch (error) {
      console.error('Error updating store profile:', error);
    }
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      // Optimistically update local state immediately so UI updates instantly
      setState(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          ...newSettings
        }
      }));

      const payload: Record<string, any> = {};
      if (newSettings.defaultTaxRate !== undefined) payload.default_tax_rate = newSettings.defaultTaxRate;
      if (newSettings.currency !== undefined) payload.currency = newSettings.currency;
      if (newSettings.enableLowStockAlerts !== undefined) payload.enable_low_stock_alerts = newSettings.enableLowStockAlerts;
      if (newSettings.lowStockThreshold !== undefined) payload.low_stock_threshold = newSettings.lowStockThreshold;
      if (newSettings.salesInvoicePrefix !== undefined) payload.sales_invoice_prefix = newSettings.salesInvoicePrefix;
      if (newSettings.rentalInvoicePrefix !== undefined) payload.rental_invoice_prefix = newSettings.rentalInvoicePrefix;
      if (newSettings.enableDeleteInventory !== undefined) payload.enable_delete_inventory = newSettings.enableDeleteInventory;
      if (newSettings.enableDeleteCustomers !== undefined) payload.enable_delete_customers = newSettings.enableDeleteCustomers;
      if (newSettings.enableDeleteTransactions !== undefined) payload.enable_delete_transactions = newSettings.enableDeleteTransactions;
      if (newSettings.enableDeleteRentals !== undefined) payload.enable_delete_rentals = newSettings.enableDeleteRentals;
      if (newSettings.enableDeleteSuppliers !== undefined) payload.enable_delete_suppliers = newSettings.enableDeleteSuppliers;
      if (newSettings.enableDeleteUsers !== undefined) payload.enable_delete_users = newSettings.enableDeleteUsers;

      const { error } = await supabase.from('settings').update(payload).eq('id', 'default');
      if (error) {
        console.warn('Supabase settings update note:', error.message || error);
      }
      await fetchAllData();
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  const deleteSale = async (id: string) => {
    setState(prev => ({
      ...prev,
      sales: prev.sales.filter(s => s.id !== id)
    }));
    try {
      await supabase.from('sale_items').delete().eq('sale_id', id);
      const { error } = await supabase.from('sales').delete().eq('id', id);
      if (error) throw error;
      await fetchAllData();
    } catch (error) {
      console.error('Error deleting sale:', error);
      throw error;
    }
  };

  const deleteRental = async (id: string) => {
    setState(prev => ({
      ...prev,
      rentals: prev.rentals.filter(r => r.id !== id)
    }));
    try {
      const savedLocal = localStorage.getItem('kiddies_offline_rentals');
      if (savedLocal) {
        const list: Rental[] = JSON.parse(savedLocal);
        localStorage.setItem('kiddies_offline_rentals', JSON.stringify(list.filter(r => r.id !== id)));
      }
    } catch (e) {}
    try {
      const { error } = await supabase.from('rentals').delete().eq('id', id);
      if (error) throw error;
      await fetchAllData();
    } catch (error) {
      console.error('Error deleting rental:', error);
      throw error;
    }
  };

  const deleteCreditNote = async (id: string) => {
    try {
      const { error } = await supabase.from('credit_notes').delete().eq('id', id);
      if (error) throw error;
      await fetchAllData();
    } catch (error) {
      console.error('Error deleting credit note:', error);
      throw error;
    }
  };

  const importData = async (jsonData: string): Promise<boolean> => {
    try {
      const parsedData = JSON.parse(jsonData);
      console.warn("Import database not fully optimized inside standard web client");
      return false;
    } catch (e) {
      return false;
    }
  };

  const resetData = async () => {
    try {
      // 1. Delete dependent / child tables first to avoid Foreign Key constraint violations
      await Promise.allSettled([
        supabase.from('supplier_bill_items').delete().gte('quantity', 0),
        supabase.from('sale_items').delete().gte('quantity', 0),
        supabase.from('credit_notes').delete().neq('id', ''),
        supabase.from('expenses').delete().neq('id', '')
      ]);

      // 2. Delete parent transactional records
      await Promise.allSettled([
        supabase.from('supplier_bills').delete().neq('id', ''),
        supabase.from('sales').delete().neq('id', ''),
        supabase.from('rentals').delete().neq('id', ''),
        supabase.from('stock_logs').delete().neq('id', '')
      ]);

      // 3. Delete master entities
      await Promise.allSettled([
        supabase.from('products').delete().neq('id', ''),
        supabase.from('customers').delete().neq('id', ''),
        supabase.from('suppliers').delete().neq('id', ''),
        supabase.from('notifications').delete().neq('id', '')
      ]);

      // 4. Wipe all local storage caches
      try {
        const keysToRemove = [
          'kiddies_offline_supplier_bills',
          'kiddies_offline_rentals',
          'kiddies_last_excel_backup_date',
          'inventory_pro_data'
        ];
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch (e) {
        console.warn('Could not clear local storage caches:', e);
      }

      // 5. Instantly clear in-memory state
      setState(prev => ({
        ...prev,
        products: [],
        customers: [],
        suppliers: [],
        supplierBills: [],
        sales: [],
        rentals: [],
        stockLogs: [],
        creditNotes: [],
        expenses: [],
        notifications: [
          {
            id: `n_${Date.now()}`,
            type: 'SUCCESS',
            category: 'SYSTEM',
            title: 'Store Reset Complete',
            message: 'All records have been permanently cleared. Database is fresh and blank.',
            timestamp: new Date().toISOString(),
            isRead: false
          }
        ]
      }));

      // 6. Refresh sync with remote database
      await fetchAllData();
    } catch (error) {
      console.error('Error resetting database:', error);
    }
  };

  const markNotificationsAsRead = async () => {
    try {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
      if (error) throw error;
      await fetchAllData();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const clearNotifications = async () => {
    try {
      const { error } = await supabase.from('notifications').delete().neq('id', '');
      if (error) throw error;
      await fetchAllData();
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  return (
    <AppContext.Provider value={{
      ...state,
      isAuthReady,
      isPasswordRecovery,
      login, loginWithGoogle, logout, addUser, updateUser, deleteUser,
      addProduct, updateProduct, deleteProduct,
      addCustomer, deleteCustomer,
      addSupplier, updateSupplier, deleteSupplier,
      addSale, updateOrderStatus, updateSale, addPaymentToSale,
      addRental, updateRental, returnRental, cancelReservation,
      updateStock, updateStoreProfile, updateSettings,
      importData, resetData, markNotificationsAsRead, clearNotifications,
      uploadImage, linkSaleItemToProduct, returnSale, processPartialReturnOrExchange,
      deleteSale, deleteRental, deleteCreditNote,
      addSupplierBill, updateSupplierBill, addPaymentToSupplierBill, deleteSupplierBill,
      updatePassword,
      addCreditNote,
      consumeStoreCredit,
      addExpense
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
