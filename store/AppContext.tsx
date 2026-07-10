import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { AppState, Product, Customer, Supplier, Sale, Rental, StockLog, RentalStatus, PaymentStatus, SalesChannel, OrderStatus, PaymentMethod, StoreProfile, AppSettings, User, UserRole, AppNotification, CreditNote, Expense } from '../types';
import { generateID } from '../utils/helpers';
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
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Promise<void>;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => Promise<void>;
  addSale: (sale: Omit<Sale, 'id' | 'invoiceNumber' | 'date' | 'netPayout'> & { date?: string }) => Promise<void>;
  addCreditNote: (customerId: string, amount: number, reason: string) => Promise<void>;
  consumeStoreCredit: (customerId: string, amountToConsume: number, invoiceNumber: string) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id' | 'date'> & { date?: string }) => Promise<void>;
  updateOrderStatus: (saleId: string, status: OrderStatus) => Promise<void>;
  addPaymentToSale: (saleId: string, amount: number) => Promise<void>;
  addRental: (rental: Omit<Rental, 'id' | 'invoiceNumber' | 'date' | 'status' | 'lateFee' | 'actualReturnDate'>, imageFiles?: File[]) => Promise<void>;
  updateRental: (id: string, updates: Partial<Rental>) => Promise<void>;
  returnRental: (rentalId: string, lateFee: number, returnImageFiles?: File[]) => Promise<void>;
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
      permissions: ['dashboard', 'inventory', 'sales', 'customers'],
      createdAt: new Date().toISOString()
    }
  ],
  products: [
    { id: 'P1', name: 'Princess Gown - Pink (4-5Y)', sku: 'DRS-001', barcode: '123456', category: 'Party Wear', purchasePrice: 1500, sellingPrice: 3500, rentalPrice: 500, taxPercent: 12, saleStock: 4, rentalStock: 2, purpose: 'HYBRID', minStockAlert: 2, supplierId: 'S1', description: 'Sequined pink party gown with bow.', sizes: ['4-5Y'], createdAt: new Date().toISOString() },
    { id: 'P2', name: 'Tuxedo Suit Set (Black)', sku: 'SUIT-002', barcode: '654321', category: 'Boys Wear', purchasePrice: 2000, sellingPrice: 4500, rentalPrice: 800, taxPercent: 12, saleStock: 6, rentalStock: 3, purpose: 'HYBRID', minStockAlert: 3, supplierId: 'S1', description: '5-piece tuxedo suit set for boys.', sizes: ['S', 'M', 'L'], createdAt: new Date().toISOString() },
    { id: 'P3', name: 'Superhero Costume (Spiderman)', sku: 'COS-003', barcode: '789012', category: 'Costumes', purchasePrice: 800, sellingPrice: 1800, rentalPrice: 300, taxPercent: 12, saleStock: 10, rentalStock: 5, purpose: 'HYBRID', minStockAlert: 4, supplierId: 'S1', description: 'Full body superhero costume.', sizes: ['S', 'M'], createdAt: new Date().toISOString() }
  ],
  customers: [
    { id: 'C1', name: 'Sarah Jenkins', phone: '9876543210', email: 'sarah@example.com', address: '123 Main St, Springfield', createdAt: new Date().toISOString() },
    { id: 'C_AMZ', name: 'Amazon Customer', phone: '', email: 'orders@amazon.in', address: 'Marketplace Order', createdAt: new Date().toISOString() },
    { id: 'C_FK', name: 'Flipkart Customer', phone: '', email: 'orders@flipkart.com', address: 'Marketplace Order', createdAt: new Date().toISOString() },
    { id: 'C_MEE', name: 'Meesho Customer', phone: '', email: 'orders@meesho.com', address: 'Marketplace Order', createdAt: new Date().toISOString() }
  ],
  suppliers: [
    { id: 'S1', name: 'Tiny Tots Wholesalers', contactPerson: 'Mike Brown', phone: '1122334455', email: 'orders@tinytots.com', address: 'Garment District, City', createdAt: new Date().toISOString() }
  ],
  sales: [
    {
      id: 'SALE1', invoiceNumber: 'INV-1001', externalOrderId: '404-1234567-1234567', channel: SalesChannel.AMAZON, customerId: 'C_AMZ',
      items: [{ productId: 'P1', name: 'Princess Gown', quantity: 1, unitPrice: 3500, taxAmount: 0, total: 3500 }],
      totalAmount: 3500, marketplaceFees: 500, netPayout: 3000, taxTotal: 0, discount: 0, paidAmount: 0,
      paymentStatus: PaymentStatus.UNPAID, paymentMethod: PaymentMethod.BANK_TRANSFER, orderStatus: OrderStatus.SHIPPED, date: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'SALE2', invoiceNumber: 'INV-1002', externalOrderId: 'OD1234567890', channel: SalesChannel.FLIPKART, customerId: 'C_FK',
      items: [{ productId: 'P2', name: 'Tuxedo Suit', quantity: 1, unitPrice: 4500, taxAmount: 0, total: 4500 }],
      totalAmount: 4500, marketplaceFees: 650, netPayout: 3850, taxTotal: 0, discount: 0, paidAmount: 3850,
      paymentStatus: PaymentStatus.PAID, paymentMethod: PaymentMethod.BANK_TRANSFER, orderStatus: OrderStatus.DELIVERED, date: new Date(Date.now() - 172800000).toISOString()
    }
  ],
  rentals: [],
  stockLogs: [],
  notifications: [
    {
      id: 'n1', type: 'SUCCESS', category: 'SYSTEM', title: 'Welcome to Kiddies', message: 'System initialized successfully.', timestamp: new Date().toISOString(), isRead: false
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
    rentalInvoicePrefix: 'RNT-'
  },
  creditNotes: [],
  expenses: []
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

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          if (data && mounted) {
            setState(prev => ({
              ...prev,
              currentUser: {
                id: data.id,
                name: data.name || 'User',
                email: data.email || session.user.email || '',
                role: (data.role as any) || UserRole.STAFF,
                permissions: data.permissions || [],
                createdAt: data.created_at
              }
            }));
          }
        } else if (mounted) {
          setState(prev => ({ ...prev, currentUser: null }));
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        if (mounted) {
          setIsAuthReady(true);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') return; // Handled by initializeAuth
      
      if (event === 'PASSWORD_RECOVERY' && mounted) {
        setIsPasswordRecovery(true);
      }
      
      if (session?.user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (data && mounted) {
          setState(prev => ({
            ...prev,
            currentUser: {
              id: data.id,
              name: data.name || 'User',
              email: data.email || session.user.email || '',
              role: (data.role as any) || UserRole.STAFF,
              permissions: data.permissions || [],
              createdAt: data.created_at
            }
          }));
        }
      } else if (mounted) {
        setState(prev => ({ ...prev, currentUser: null }));
      }
    });

    return () => {
      mounted = false;
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

      const combinedSales: Sale[] = (sales || []).map(sale => {
        const items = (saleItems || [])
          .filter(item => item.sale_id === sale.id)
          .map(item => ({
            productId: item.product_id,
            name: item.name,
            quantity: item.quantity,
            unitPrice: Number(item.unit_price),
            taxAmount: Number(item.tax_amount),
            total: Number(item.total)
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

      setState(prev => ({
        ...prev,
        users: (users || []).map(u => ({
          id: u.id,
          name: u.name || '',
          email: u.email || '',
          role: u.role || UserRole.STAFF,
          permissions: u.permissions || [],
          createdAt: u.created_at
        })),
        products: (products || []).map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode || '',
          category: p.category || '',
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
          imageUrl: p.image_url || '',
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
          createdAt: s.created_at
        })),
        sales: combinedSales,
        rentals: (rentals || []).map(r => ({
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
          date: r.date
        })),
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
              rentalInvoicePrefix: settings.rental_invoice_prefix || 'RNT-'
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
  const login = async (email: string, pass: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      await fetchAllData();
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
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
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // -- USERS --
  const addUser = async (u: Omit<User, 'id' | 'createdAt'>) => {
    try {
      const id = generateID();
      // Insert custom profile
      const { error } = await supabase.from('profiles').insert({
        id,
        name: u.name,
        email: u.email,
        role: u.role,
        permissions: u.role === UserRole.ADMIN ? [] : (u.permissions || [])
      });
      if (error) throw error;
      await fetchAllData();
    } catch (error) {
      console.error('Error adding user profiles:', error);
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    try {
      const { error } = await supabase.from('profiles').update({
        name: updates.name,
        email: updates.email,
        role: updates.role,
        permissions: updates.permissions
      }).eq('id', id);
      if (error) throw error;
      await fetchAllData();
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      await fetchAllData();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  // -- CRUD: Products --
  const addProduct = async (p: Omit<Product, 'id' | 'createdAt'>, imageFile?: File, onProgress?: (status: string) => void) => {
    const id = generateID();
    let imageUrl = p.imageUrl;

    try {
      if (imageFile) {
        if (imageFile.size > 5 * 1024 * 1024) {
          throw new Error('Image size exceeds 5MB limit.');
        }
        onProgress?.('Uploading image...');
        imageUrl = await uploadImage(imageFile, `products/${id}_${imageFile.name}`);
      }

      onProgress?.('Saving to database...');
      const { error } = await supabase.from('products').insert({
        id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        category: p.category,
        brand: p.brand,
        color: p.color,
        material: p.material,
        sizes: p.sizes,
        purchase_price: p.purchasePrice,
        selling_price: p.sellingPrice,
        rental_price: p.rentalPrice,
        tax_percent: p.taxPercent,
        sale_stock: p.saleStock,
        rental_stock: p.rentalStock,
        purpose: p.purpose,
        min_stock_alert: p.minStockAlert,
        supplier_id: p.supplierId,
        description: p.description,
        image_url: imageUrl || ''
      });

      if (error) throw error;

      const notification = createNotification('SUCCESS', 'INVENTORY', 'Product Added', `Added ${p.name} to inventory`, 'inventory');
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
      console.error('Error in addProduct:', error);
      throw error;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>, imageFile?: File, onProgress?: (status: string) => void) => {
    let imageUrl = updates.imageUrl;
    try {
      if (imageFile) {
        if (imageFile.size > 5 * 1024 * 1024) {
          throw new Error('Image size exceeds 5MB limit.');
        }
        onProgress?.('Uploading new image...');
        imageUrl = await uploadImage(imageFile, `products/${id}_${imageFile.name}`);
      }

      onProgress?.('Updating record...');
      const { error } = await supabase.from('products').update({
        name: updates.name,
        sku: updates.sku,
        barcode: updates.barcode,
        category: updates.category,
        brand: updates.brand,
        color: updates.color,
        material: updates.material,
        sizes: updates.sizes,
        purchase_price: updates.purchasePrice,
        selling_price: updates.sellingPrice,
        rental_price: updates.rentalPrice,
        tax_percent: updates.taxPercent,
        sale_stock: updates.saleStock,
        rental_stock: updates.rentalStock,
        purpose: updates.purpose,
        min_stock_alert: updates.minStockAlert,
        supplier_id: updates.supplierId,
        description: updates.description,
        image_url: imageUrl
      }).eq('id', id);

      if (error) throw error;
      await fetchAllData();
    } catch (error) {
      console.error('Error in updateProduct:', error);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      await fetchAllData();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  // -- CUSTOMERS --
  const addCustomer = async (c: Omit<Customer, 'id' | 'createdAt'>) => {
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
    } catch (error) {
      console.error('Error adding customer:', error);
    }
  };

  // -- SUPPLIERS --
  const addSupplier = async (s: Omit<Supplier, 'id' | 'createdAt'>) => {
    const id = generateID();
    try {
      const { error } = await supabase.from('suppliers').insert({
        id,
        name: s.name,
        contact_person: s.contactPerson,
        phone: s.phone,
        email: s.email,
        address: s.address
      });
      if (error) throw error;
      await fetchAllData();
    } catch (error) {
      console.error('Error adding supplier:', error);
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
    const activeCNs = state.creditNotes
      .filter(cn => cn.customerId === customerId && cn.status === 'ACTIVE')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let remainingToConsume = amountToConsume;

    try {
      for (const cn of activeCNs) {
        if (remainingToConsume <= 0) break;

        if (cn.amount <= remainingToConsume) {
          await supabase.from('credit_notes').update({ status: 'USED', used_at: new Date().toISOString() }).eq('id', cn.id);
          remainingToConsume -= cn.amount;
        } else {
          await supabase.from('credit_notes').update({ status: 'USED', used_at: new Date().toISOString() }).eq('id', cn.id);
          const remainder = cn.amount - remainingToConsume;
          const newId = generateID();
          await supabase.from('credit_notes').insert({
            id: newId,
            customer_id: customerId,
            amount: remainder,
            reason: `Balance remaining after checkout (Inv: ${invoiceNumber})`,
            status: 'ACTIVE',
            created_at: new Date().toISOString()
          });
          remainingToConsume = 0;
        }
      }
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
  const addRental = async (r: Omit<Rental, 'id' | 'invoiceNumber' | 'date' | 'status' | 'lateFee' | 'actualReturnDate'>, imageFiles?: File[]) => {
    const id = generateID();
    const prefix = state.settings.rentalInvoicePrefix || 'RNT-';
    const invoiceNumber = `${prefix}${state.rentals.length + 1001}`;

    try {
      let imageUrls: string[] = [];
      if (imageFiles) {
        imageUrls = await Promise.all(imageFiles.map(file => uploadImage(file, `rentals/${id}_${file.name}`)));
      }

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
        status: RentalStatus.ACTIVE,
        payment_status: r.paymentStatus,
        images: imageUrls
      });
      if (rentalError) throw rentalError;

      // Update Stock
      const product = state.products.find(p => p.id === r.productId);
      if (product) {
        await supabase.from('products').update({
          rental_stock: Math.max(0, product.rentalStock - r.quantity)
        }).eq('id', r.productId);

        const logId = generateID();
        await supabase.from('stock_logs').insert({
          id: logId,
          product_id: r.productId,
          pool: 'RENTAL',
          type: 'OUT',
          quantity: r.quantity,
          reason: `Rental ${invoiceNumber}`
        });
      }

      const notification = createNotification('SUCCESS', 'RENTAL', 'New Rental', `Rental ${invoiceNumber} booked`, 'rentals');
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
      console.error('Error booking rental:', error);
    }
  };

  const updateRental = async (id: string, updates: Partial<Rental>) => {
    try {
      const { error } = await supabase.from('rentals').update({
        customer_id: updates.customerId,
        product_id: updates.productId,
        quantity: updates.quantity,
        start_date: updates.startDate,
        expected_return_date: updates.expectedReturnDate,
        actual_return_date: updates.actualReturnDate,
        daily_rate: updates.dailyRate,
        security_deposit: updates.securityDeposit,
        total_rent_amount: updates.totalRentAmount,
        late_fee: updates.lateFee,
        paid_amount: updates.paidAmount,
        status: updates.status,
        payment_status: updates.paymentStatus,
        images: updates.images,
        return_images: updates.returnImages
      }).eq('id', id);
      if (error) throw error;
      await fetchAllData();
    } catch (error) {
      console.error('Error updating rental:', error);
    }
  };

  const returnRental = async (id: string, lateFee: number, returnImageFiles?: File[]) => {
    try {
      const rental = state.rentals.find(r => r.id === id);
      if (rental) {
        let returnImageUrls: string[] = [];
        if (returnImageFiles) {
          returnImageUrls = await Promise.all(returnImageFiles.map(file => uploadImage(file, `rentals/return_${id}_${file.name}`)));
        }

        const { error: returnError } = await supabase.from('rentals').update({
          status: RentalStatus.RETURNED,
          actual_return_date: new Date().toISOString(),
          late_fee: lateFee,
          total_rent_amount: rental.totalRentAmount + lateFee,
          return_images: returnImageUrls
        }).eq('id', id);
        if (returnError) throw returnError;

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
            reason: `Return ${rental.invoiceNumber}`
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

        await fetchAllData();
      }
    } catch (error) {
      console.error('Error returning rental:', error);
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

  const updateSettings = async (settings: Partial<AppSettings>) => {
    try {
      const { error } = await supabase.from('settings').update({
        default_tax_rate: settings.defaultTaxRate,
        currency: settings.currency,
        enable_low_stock_alerts: settings.enableLowStockAlerts,
        low_stock_threshold: settings.lowStockThreshold,
        sales_invoice_prefix: settings.salesInvoicePrefix,
        rental_invoice_prefix: settings.rentalInvoicePrefix
      }).eq('id', 'default');
      if (error) throw error;
      await fetchAllData();
    } catch (error) {
      console.error('Error updating settings:', error);
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
      await Promise.all([
        supabase.from('products').delete().neq('id', ''),
        supabase.from('customers').delete().neq('id', ''),
        supabase.from('suppliers').delete().neq('id', ''),
        supabase.from('sales').delete().neq('id', ''),
        supabase.from('rentals').delete().neq('id', ''),
        supabase.from('stock_logs').delete().neq('id', ''),
        supabase.from('notifications').delete().neq('id', '')
      ]);
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
      addCustomer, addSupplier,
      addSale, updateOrderStatus, addPaymentToSale,
      addRental, updateRental, returnRental,
      updateStock, updateStoreProfile, updateSettings,
      importData, resetData,
      markNotificationsAsRead, clearNotifications,
      uploadImage,
      updatePassword,
      addCreditNote,
      consumeStoreCredit,
      addExpense,
      linkSaleItemToProduct,
      returnSale
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
