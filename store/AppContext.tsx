
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, Product, Customer, Supplier, Sale, Rental, StockLog, RentalStatus, PaymentStatus, SalesChannel, OrderStatus, PaymentMethod, StoreProfile, AppSettings, User, UserRole, AppNotification } from '../types';
import { generateID, withTimeout } from '../utils/helpers';
import { auth, db, storage } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface AppContextType extends AppState {
  isAuthReady: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>, imageFile?: File, onProgress?: (status: string) => void) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>, imageFile?: File, onProgress?: (status: string) => void) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Promise<void>;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => Promise<void>;
  addSale: (sale: Omit<Sale, 'id' | 'invoiceNumber' | 'date' | 'netPayout'>) => Promise<void>;
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
      permissions: ['dashboard', 'inventory', 'sales', 'customers'], // Default staff permissions
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
  }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(INITIAL_DATA);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // -- AUTH LISTENER --
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user profile from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setState(prev => ({ ...prev, currentUser: userDoc.data() as User }));
          } else {
            // Fallback if user doc doesn't exist yet (e.g. first admin)
            if (firebaseUser.email === 'katiyareminkal@gmail.com') {
              const adminUser: User = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || 'Admin',
                email: firebaseUser.email,
                role: UserRole.ADMIN,
                permissions: [],
                createdAt: new Date().toISOString()
              };
              await setDoc(doc(db, 'users', firebaseUser.uid), adminUser);
              setState(prev => ({ ...prev, currentUser: adminUser }));
            }
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setState(prev => ({ ...prev, currentUser: null }));
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // -- DATA SYNC --
  useEffect(() => {
    if (!isAuthReady) return;

    const collections = [
      { name: 'users', key: 'users' },
      { name: 'products', key: 'products' },
      { name: 'customers', key: 'customers' },
      { name: 'suppliers', key: 'suppliers' },
      { name: 'sales', key: 'sales' },
      { name: 'rentals', key: 'rentals' },
      { name: 'stockLogs', key: 'stockLogs' },
      { name: 'notifications', key: 'notifications' }
    ];

    const unsubscribes = collections.map(col => {
      const q = query(collection(db, col.name), orderBy('createdAt', 'desc'));
      // Note: Some collections might not have createdAt yet, or use 'date' or 'timestamp'
      // For simplicity in this migration, we'll try to order by date/timestamp if possible
      let finalQuery = query(collection(db, col.name));
      if (col.name === 'sales' || col.name === 'rentals' || col.name === 'stockLogs') {
        finalQuery = query(collection(db, col.name), orderBy('date', 'desc'));
      } else if (col.name === 'notifications') {
        finalQuery = query(collection(db, col.name), orderBy('timestamp', 'desc'));
      } else if (col.name === 'products') {
        // For products, we'll fetch all and sort in memory to avoid issues with missing createdAt fields
        finalQuery = query(collection(db, col.name));
      } else {
        finalQuery = query(collection(db, col.name), orderBy('createdAt', 'desc'));
      }

      return onSnapshot(finalQuery, (snapshot) => {
        let data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

        // Sort in memory if needed
        if (col.name === 'products') {
          data = (data as any[]).sort((a, b) => {
            const dateA = a.createdAt || '';
            const dateB = b.createdAt || '';
            return dateB.localeCompare(dateA);
          });
        }

        console.log(`Synced ${col.name}:`, data.length, 'items');
        setState(prev => ({ ...prev, [col.key]: data }));
      }, (error) => {
        console.error(`Snapshot error for ${col.name}:`, error);
        handleFirestoreError(error, OperationType.LIST, col.name);
      });
    });

    // Sync Config
    const unsubStore = onSnapshot(doc(db, 'config', 'storeProfile'), (doc) => {
      if (doc.exists()) {
        setState(prev => ({ ...prev, storeProfile: doc.data() as StoreProfile }));
      }
    });

    const unsubSettings = onSnapshot(doc(db, 'config', 'settings'), (doc) => {
      if (doc.exists()) {
        setState(prev => ({ ...prev, settings: doc.data() as AppSettings }));
      }
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
      unsubStore();
      unsubSettings();
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
    console.log(`uploadImage starting for path: ${path}, file size: ${file.size} bytes`);
    try {
      const storageRef = ref(storage, path);
      console.log('Storage ref created, starting uploadBytes...');

      const uploadPromise = async () => {
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
      };

      return await withTimeout(
        uploadPromise(),
        20000,
        'Image upload timed out (20s). Please try a smaller image or better network.'
      );
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  // -- AUTH --
  const login = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google login failed:", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // -- USERS --
  const addUser = async (u: Omit<User, 'id' | 'createdAt'>) => {
    const id = generateID();
    const newUser: User = {
      ...u,
      id,
      createdAt: new Date().toISOString(),
      permissions: u.role === UserRole.ADMIN ? [] : (u.permissions || [])
    };
    try {
      await setDoc(doc(db, 'users', id), newUser);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${id}`);
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    try {
      await updateDoc(doc(db, 'users', id), updates as any);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
    }
  };

  // -- OTHER ENTITIES --
  const addProduct = async (p: Omit<Product, 'id' | 'createdAt'>, imageFile?: File, onProgress?: (status: string) => void) => {
    console.log('addProduct called with:', p);
    const id = generateID();
    let imageUrl = p.imageUrl;

    try {
      if (imageFile) {
        if (imageFile.size > 5 * 1024 * 1024) {
          throw new Error('Image size exceeds 5MB limit.');
        }
        onProgress?.('Uploading image...');
        console.log(`Uploading image: ${imageFile.name} (${imageFile.size} bytes)...`);
        imageUrl = await uploadImage(imageFile, `products/${id}_${imageFile.name}`);
        console.log('Image uploaded successfully:', imageUrl);
      }

      onProgress?.('Saving to database...');
      const newProduct: Product = {
        ...p,
        id,
        imageUrl: imageUrl || '',
        createdAt: new Date().toISOString()
      };

      console.log('Saving product to Firestore...', id);

      await withTimeout(
        setDoc(doc(db, 'products', id), newProduct),
        10000,
        'Database connection timed out (10s). Please check your internet.'
      );
      console.log('Product document saved successfully.');

      try {
        const notification = createNotification('SUCCESS', 'INVENTORY', 'Product Added', `Added ${newProduct.name} to inventory`, 'inventory');
        setDoc(doc(db, 'notifications', notification.id), notification).catch(e => console.warn('Note save failed', e));
      } catch (noteError) {
        console.warn('Notification setup failed', noteError);
      }

      console.log('addProduct finished successfully.');
    } catch (error) {
      console.error('CRITICAL ERROR in addProduct:', error);
      handleFirestoreError(error, OperationType.CREATE, `products/${id}`);
      throw error;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>, imageFile?: File, onProgress?: (status: string) => void) => {
    console.log('updateProduct called for:', id, updates);
    let imageUrl = updates.imageUrl;
    try {
      if (imageFile) {
        if (imageFile.size > 5 * 1024 * 1024) {
          throw new Error('Image size exceeds 5MB limit.');
        }
        onProgress?.('Uploading new image...');
        console.log(`Uploading new image: ${imageFile.name} (${imageFile.size} bytes)...`);
        imageUrl = await uploadImage(imageFile, `products/${id}_${imageFile.name}`);
        console.log('New image uploaded successfully:', imageUrl);
      }

      onProgress?.('Updating record...');
      console.log('Updating Firestore document...', id);
      const finalUpdates = { ...updates, ...(imageUrl ? { imageUrl } : {}) };

      await withTimeout(
        updateDoc(doc(db, 'products', id), finalUpdates as any),
        10000,
        'Database update timed out (10s). Please check your internet.'
      );
      console.log('updateDoc finished successfully.');
    } catch (error) {
      console.error('CRITICAL ERROR in updateProduct:', error);
      handleFirestoreError(error, OperationType.UPDATE, `products/${id}`);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  const addCustomer = async (c: Omit<Customer, 'id' | 'createdAt'>) => {
    const id = generateID();
    const newCustomer: Customer = { ...c, id, createdAt: new Date().toISOString() };
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'customers', id), newCustomer);

      const notification = createNotification('INFO', 'CUSTOMER', 'New Customer', `${newCustomer.name} has been registered`, 'customers');
      batch.set(doc(db, 'notifications', notification.id), notification);

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `customers/${id}`);
    }
  };

  const addSupplier = async (s: Omit<Supplier, 'id' | 'createdAt'>) => {
    const id = generateID();
    const newSupplier: Supplier = { ...s, id, createdAt: new Date().toISOString() };
    try {
      await setDoc(doc(db, 'suppliers', id), newSupplier);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `suppliers/${id}`);
    }
  };

  const addSale = async (s: Omit<Sale, 'id' | 'invoiceNumber' | 'date' | 'netPayout'>) => {
    const id = generateID();
    const prefix = state.settings.salesInvoicePrefix || 'INV-';
    const newSale: Sale = {
      ...s,
      id,
      invoiceNumber: `${prefix}${state.sales.length + 1001}`,
      netPayout: s.totalAmount - s.marketplaceFees,
      date: new Date().toISOString()
    };

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'sales', id), newSale);

      const notification = createNotification('SUCCESS', 'SALE', 'New Order', `Invoice ${newSale.invoiceNumber} created for ${s.channel}`, 'sales');
      batch.set(doc(db, 'notifications', notification.id), notification);

      // Update Stock
      for (const item of s.items) {
        const productRef = doc(db, 'products', item.productId);
        const productDoc = await getDoc(productRef);
        if (productDoc.exists()) {
          const p = productDoc.data() as Product;
          batch.update(productRef, { saleStock: p.saleStock - item.quantity });

          const logId = generateID();
          batch.set(doc(db, 'stockLogs', logId), {
            id: logId,
            productId: item.productId,
            pool: 'SALE',
            type: 'OUT',
            quantity: item.quantity,
            reason: `Sale ${newSale.invoiceNumber} (${s.channel})`,
            date: new Date().toISOString()
          });
        }
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `sales/${id}`);
    }
  };

  const updateOrderStatus = async (saleId: string, status: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'sales', saleId), { orderStatus: status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sales/${saleId}`);
    }
  };

  const addPaymentToSale = async (saleId: string, amount: number) => {
    try {
      const saleRef = doc(db, 'sales', saleId);
      const saleDoc = await getDoc(saleRef);
      if (saleDoc.exists()) {
        const s = saleDoc.data() as Sale;
        const newPaidAmount = s.paidAmount + amount;
        const newStatus = newPaidAmount >= (s.channel === SalesChannel.IN_STORE ? s.totalAmount : s.netPayout) ? PaymentStatus.PAID : PaymentStatus.PARTIAL;

        const batch = writeBatch(db);
        batch.update(saleRef, { paidAmount: newPaidAmount, paymentStatus: newStatus });

        const notification = createNotification('SUCCESS', 'SALE', 'Payment Received', `Recorded payment of ${amount} for sale`, 'sales');
        batch.set(doc(db, 'notifications', notification.id), notification);

        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sales/${saleId}`);
    }
  };

  const addRental = async (r: Omit<Rental, 'id' | 'invoiceNumber' | 'date' | 'status' | 'lateFee' | 'actualReturnDate'>, imageFiles?: File[]) => {
    const id = generateID();
    const prefix = state.settings.rentalInvoicePrefix || 'RNT-';

    let imageUrls: string[] = [];
    if (imageFiles) {
      imageUrls = await Promise.all(imageFiles.map(file => uploadImage(file, `rentals/${id}_${file.name}`)));
    }

    const newRental: Rental = {
      ...r,
      id,
      invoiceNumber: `${prefix}${state.rentals.length + 1001}`,
      date: new Date().toISOString(),
      status: RentalStatus.ACTIVE,
      lateFee: 0,
      images: imageUrls
    };

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'rentals', id), newRental);

      const notification = createNotification('SUCCESS', 'RENTAL', 'New Rental', `Rental ${newRental.invoiceNumber} booked`, 'rentals');
      batch.set(doc(db, 'notifications', notification.id), notification);

      // Update Stock
      const productRef = doc(db, 'products', r.productId);
      const productDoc = await getDoc(productRef);
      if (productDoc.exists()) {
        const p = productDoc.data() as Product;
        batch.update(productRef, { rentalStock: p.rentalStock - r.quantity });

        const logId = generateID();
        batch.set(doc(db, 'stockLogs', logId), {
          id: logId,
          productId: r.productId,
          pool: 'RENTAL',
          type: 'OUT',
          quantity: r.quantity,
          reason: `Rental ${newRental.invoiceNumber}`,
          date: new Date().toISOString()
        });
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `rentals/${id}`);
    }
  };

  const updateRental = async (id: string, updates: Partial<Rental>) => {
    try {
      await updateDoc(doc(db, 'rentals', id), updates as any);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rentals/${id}`);
    }
  };

  const returnRental = async (id: string, lateFee: number, returnImageFiles?: File[]) => {
    try {
      const rentalRef = doc(db, 'rentals', id);
      const rentalDoc = await getDoc(rentalRef);
      if (rentalDoc.exists()) {
        const r = rentalDoc.data() as Rental;
        const batch = writeBatch(db);

        let returnImageUrls: string[] = [];
        if (returnImageFiles) {
          returnImageUrls = await Promise.all(returnImageFiles.map(file => uploadImage(file, `rentals/return_${id}_${file.name}`)));
        }

        batch.update(rentalRef, {
          status: RentalStatus.RETURNED,
          actualReturnDate: new Date().toISOString(),
          lateFee: lateFee,
          totalRentAmount: r.totalRentAmount + lateFee,
          returnImages: returnImageUrls
        });

        const notification = createNotification('INFO', 'RENTAL', 'Rental Returned', `Items checked in for ${r.invoiceNumber}`, 'rentals');
        batch.set(doc(db, 'notifications', notification.id), notification);

        // Update Stock
        const productRef = doc(db, 'products', r.productId);
        const productDoc = await getDoc(productRef);
        if (productDoc.exists()) {
          const p = productDoc.data() as Product;
          batch.update(productRef, { rentalStock: p.rentalStock + r.quantity });

          const logId = generateID();
          batch.set(doc(db, 'stockLogs', logId), {
            id: logId,
            productId: r.productId,
            pool: 'RENTAL',
            type: 'IN',
            quantity: r.quantity,
            reason: `Return ${r.invoiceNumber}`,
            date: new Date().toISOString()
          });
        }

        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rentals/${id}`);
    }
  };

  const updateStock = async (productId: string, pool: 'SALE' | 'RENTAL', quantity: number, type: 'IN' | 'OUT', reason: string) => {
    try {
      const productRef = doc(db, 'products', productId);
      const productDoc = await getDoc(productRef);
      if (productDoc.exists()) {
        const p = productDoc.data() as Product;
        const batch = writeBatch(db);

        if (pool === 'SALE') {
          batch.update(productRef, { saleStock: type === 'IN' ? p.saleStock + quantity : p.saleStock - quantity });
        } else {
          batch.update(productRef, { rentalStock: type === 'IN' ? p.rentalStock + quantity : p.rentalStock - quantity });
        }

        const logId = generateID();
        batch.set(doc(db, 'stockLogs', logId), {
          id: logId,
          productId,
          pool,
          type,
          quantity,
          reason,
          date: new Date().toISOString()
        });

        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${productId}`);
    }
  };

  const updateStoreProfile = async (profile: Partial<StoreProfile>, logoFile?: File) => {
    try {
      let logoUrl = profile.logo;
      if (logoFile) {
        logoUrl = await uploadImage(logoFile, `config/logo_${logoFile.name}`);
      }
      await setDoc(doc(db, 'config', 'storeProfile'), { ...state.storeProfile, ...profile, ...(logoUrl ? { logo: logoUrl } : {}) });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'config/storeProfile');
    }
  };

  const updateSettings = async (settings: Partial<AppSettings>) => {
    try {
      await setDoc(doc(db, 'config', 'settings'), { ...state.settings, ...settings });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'config/settings');
    }
  };

  const importData = async (jsonData: string): Promise<boolean> => {
    try {
      const parsedData = JSON.parse(jsonData);
      // This would need a more complex batch implementation for Firestore
      // For now, we'll just return false or implement a basic version
      console.warn("Import data not fully implemented for Firestore");
      return false;
    } catch (e) {
      return false;
    }
  };

  const resetData = async () => {
    // This would need to delete all docs in all collections
    console.warn("Reset data not fully implemented for Firestore");
  };

  const markNotificationsAsRead = async () => {
    try {
      const batch = writeBatch(db);
      state.notifications.forEach(n => {
        if (!n.isRead) {
          batch.update(doc(db, 'notifications', n.id), { isRead: true });
        }
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
  };

  const clearNotifications = async () => {
    try {
      const batch = writeBatch(db);
      state.notifications.forEach(n => {
        batch.delete(doc(db, 'notifications', n.id));
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'notifications');
    }
  };

  return (
    <AppContext.Provider value={{
      ...state,
      isAuthReady,
      login, loginWithGoogle, logout, addUser, updateUser, deleteUser,
      addProduct, updateProduct, deleteProduct,
      addCustomer, addSupplier,
      addSale, updateOrderStatus, addPaymentToSale,
      addRental, updateRental, returnRental,
      updateStock, updateStoreProfile, updateSettings,
      importData, resetData,
      markNotificationsAsRead, clearNotifications,
      uploadImage
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
