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
      permissions: ['dashboard', 'inventory', 'sales', 'customers'],
      createdAt: new Date().toISOString()
    }
  ],
  products: [
    // 1. Boys Top Wear & Daily Wear
    {
      id: 'P101',
      name: 'Boys Cotton Graphic Printed T-Shirt',
      sku: 'TSH-B01',
      barcode: '8901001001',
      category: 'Top Wear',
      subCategory: 'T-Shirts',
      gender: 'Boys',
      clothingType: 'Half (Short Sleeves/Shorts)',
      brand: 'Kiddies Casuals',
      color: 'Navy Blue',
      material: '100% Combed Cotton',
      purchasePrice: 220,
      sellingPrice: 499,
      rentalPrice: 0,
      taxPercent: 5,
      saleStock: 15,
      rentalStock: 0,
      purpose: 'SALE',
      minStockAlert: 3,
      supplierId: 'S1',
      description: 'Soft 100% breathable cotton t-shirt with durable dinosaur graphic print.',
      sizes: ['2-3Y', '4-5Y', '6-7Y', '8-9Y'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'P102',
      name: 'Boys Cotton Polo Collar T-Shirt',
      sku: 'POL-B02',
      barcode: '8901001002',
      category: 'Top Wear',
      subCategory: 'Polo T-Shirts',
      gender: 'Boys',
      clothingType: 'Half (Short Sleeves/Shorts)',
      brand: 'Kiddies Premium',
      color: 'Royal Blue',
      material: 'Pique Cotton',
      purchasePrice: 320,
      sellingPrice: 699,
      rentalPrice: 0,
      taxPercent: 5,
      saleStock: 12,
      rentalStock: 0,
      purpose: 'SALE',
      minStockAlert: 3,
      supplierId: 'S1',
      description: 'Classic rib polo collar with 2-button placket for casual & party wear.',
      sizes: ['4-5Y', '6-7Y', '8-9Y', '10-11Y'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'P103',
      name: 'Boys Printed Casual Full Sleeve Shirt',
      sku: 'SHT-B03',
      barcode: '8901001003',
      category: 'Top Wear',
      subCategory: 'Casual Shirts',
      gender: 'Boys',
      clothingType: 'Full (Long Sleeves/Pants)',
      brand: 'Little Champs',
      color: 'Olive Green',
      material: 'Cotton Linen',
      purchasePrice: 400,
      sellingPrice: 899,
      rentalPrice: 0,
      taxPercent: 5,
      saleStock: 10,
      rentalStock: 0,
      purpose: 'SALE',
      minStockAlert: 2,
      supplierId: 'S1',
      description: 'Lightweight linen blend casual roll-up sleeve shirt.',
      sizes: ['3-4Y', '5-6Y', '7-8Y', '9-10Y'],
      createdAt: new Date().toISOString()
    },

    // 2. Boys Bottom Wear
    {
      id: 'P104',
      name: 'Boys Slim Fit Stretch Denim Jeans',
      sku: 'JNS-B04',
      barcode: '8901001004',
      category: 'Bottom Wear',
      subCategory: 'Jeans',
      gender: 'Boys',
      clothingType: 'Full (Long Sleeves/Pants)',
      brand: 'Kiddies Denim Co',
      color: 'Dark Indigo',
      material: 'Stretch Denim',
      purchasePrice: 450,
      sellingPrice: 999,
      rentalPrice: 0,
      taxPercent: 5,
      saleStock: 18,
      rentalStock: 0,
      purpose: 'SALE',
      minStockAlert: 4,
      supplierId: 'S1',
      description: 'Adjustable inner elastic waistband stretch denim jeans for active boys.',
      sizes: ['4-5Y', '6-7Y', '8-9Y', '10-12Y'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'P105',
      name: 'Boys Cotton Jogger Track Pants',
      sku: 'JOG-B05',
      barcode: '8901001005',
      category: 'Bottom Wear',
      subCategory: 'Joggers',
      gender: 'Boys',
      clothingType: 'Full (Long Sleeves/Pants)',
      brand: 'ActiveTots',
      color: 'Melange Grey',
      material: 'Cotton Fleece',
      purchasePrice: 280,
      sellingPrice: 599,
      rentalPrice: 0,
      taxPercent: 5,
      saleStock: 14,
      rentalStock: 0,
      purpose: 'SALE',
      minStockAlert: 3,
      supplierId: 'S1',
      description: 'Elastic drawstring jogger pants with side zipper pockets.',
      sizes: ['2-3Y', '4-5Y', '6-7Y', '8-9Y'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'P106',
      name: 'Boys Multi-Pocket Cargo Shorts',
      sku: 'SHR-B06',
      barcode: '8901001006',
      category: 'Bottom Wear',
      subCategory: 'Shorts',
      gender: 'Boys',
      clothingType: 'Half (Short Sleeves/Shorts)',
      brand: 'Kiddies Outdoor',
      color: 'Khaki Beige',
      material: '100% Cotton Twill',
      purchasePrice: 250,
      sellingPrice: 549,
      rentalPrice: 0,
      taxPercent: 5,
      saleStock: 16,
      rentalStock: 0,
      purpose: 'SALE',
      minStockAlert: 3,
      supplierId: 'S1',
      description: 'Durable cotton twill cargo shorts with multi utility flap pockets.',
      sizes: ['3-4Y', '5-6Y', '7-8Y', '9-10Y'],
      createdAt: new Date().toISOString()
    },

    // 3. Boys Ethnic & Festive Wear
    {
      id: 'P107',
      name: 'Boys Jacquard Silk Kurta Pajama Set',
      sku: 'KRT-B07',
      barcode: '8901001007',
      category: 'Ethnic Wear',
      subCategory: 'Kurta Pajama',
      gender: 'Boys',
      clothingType: 'Set - Full Top & Full Bottom',
      brand: 'Shree Kids Ethnic',
      color: 'Maroon & Gold',
      material: 'Art Silk Blend',
      purchasePrice: 650,
      sellingPrice: 1499,
      rentalPrice: 350,
      taxPercent: 12,
      saleStock: 6,
      rentalStock: 3,
      purpose: 'HYBRID',
      minStockAlert: 2,
      supplierId: 'S1',
      description: 'Traditional brocade woven mandarin collar kurta with comfy churidar.',
      sizes: ['2-3Y', '4-5Y', '6-7Y', '8-9Y', '10-12Y'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'P108',
      name: 'Boys Designer Royal Sherwani Set',
      sku: 'SHW-B08',
      barcode: '8901001008',
      category: 'Ethnic Wear',
      subCategory: 'Sherwani',
      gender: 'Boys',
      clothingType: 'Set - Full Top & Full Bottom',
      brand: 'Royal Heritage Kids',
      color: 'Off-White & Red',
      material: 'Raw Silk & Velvet',
      purchasePrice: 1800,
      sellingPrice: 4200,
      rentalPrice: 750,
      taxPercent: 12,
      saleStock: 4,
      rentalStock: 4,
      purpose: 'HYBRID',
      minStockAlert: 2,
      supplierId: 'S1',
      description: 'Heavy zardozi embroidered Royal Sherwani set with matching dupatta & brooch.',
      sizes: ['4-5Y', '6-7Y', '8-9Y', '10-12Y'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'P109',
      name: 'Boys Garba Kediyu & Dhoti Set (Navratri)',
      sku: 'KED-B09',
      barcode: '8901001009',
      category: 'Ethnic Wear',
      subCategory: 'Kurta Dhoti',
      gender: 'Boys',
      clothingType: 'Set - Full Top & Full Bottom',
      brand: 'Gujrat Heritage',
      color: 'Multi-color Mirror Work',
      material: 'Pure Cotton',
      purchasePrice: 700,
      sellingPrice: 1699,
      rentalPrice: 400,
      taxPercent: 12,
      saleStock: 5,
      rentalStock: 5,
      purpose: 'HYBRID',
      minStockAlert: 2,
      supplierId: 'S1',
      description: 'Authentic Gujarati mirror-work Kediyu top with ready-to-wear stitched dhoti & turban cap.',
      sizes: ['2-3Y', '4-5Y', '6-7Y', '8-9Y'],
      createdAt: new Date().toISOString()
    },

    // 4. Boys Party Wear & Tuxedos
    {
      id: 'P110',
      name: 'Boys 5-Piece Classic Tuxedo Suit Set',
      sku: 'TUX-B10',
      barcode: '8901001010',
      category: 'Party Wear',
      subCategory: 'Tuxedo',
      gender: 'Boys',
      clothingType: 'Set - Full Top & Full Bottom',
      brand: 'Little Gentleman',
      color: 'Midnight Black',
      material: 'Poly-Viscose Suiting',
      purchasePrice: 1600,
      sellingPrice: 3800,
      rentalPrice: 650,
      taxPercent: 12,
      saleStock: 5,
      rentalStock: 4,
      purpose: 'HYBRID',
      minStockAlert: 2,
      supplierId: 'S1',
      description: 'Complete 5-piece tuxedo suite including coat, trousers, shirt, waistcoat & satin bow-tie.',
      sizes: ['4-5Y', '6-7Y', '8-9Y', '10-12Y'],
      createdAt: new Date().toISOString()
    },

    // 5. Girls Tops, Bottoms & Casual Wear
    {
      id: 'P201',
      name: 'Girls Printed Cotton Peplum Top',
      sku: 'TOP-G01',
      barcode: '8902002001',
      category: 'Top Wear',
      subCategory: 'Tops',
      gender: 'Girls',
      clothingType: 'Half (Short Sleeves/Shorts)',
      brand: 'Angel Wear',
      color: 'Blush Pink',
      material: '100% Cotton',
      purchasePrice: 240,
      sellingPrice: 549,
      rentalPrice: 0,
      taxPercent: 5,
      saleStock: 14,
      rentalStock: 0,
      purpose: 'SALE',
      minStockAlert: 3,
      supplierId: 'S1',
      description: 'Ruffled peplum waist floral printed top with keyhole back opening.',
      sizes: ['2-3Y', '4-5Y', '6-7Y', '8-9Y'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'P202',
      name: 'Girls Stretch Denim Jegging Pants',
      sku: 'LEG-G02',
      barcode: '8902002002',
      category: 'Bottom Wear',
      subCategory: 'Jeggings',
      gender: 'Girls',
      clothingType: 'Full (Long Sleeves/Pants)',
      brand: 'Cute Fit',
      color: 'Deep Blue',
      material: 'Cotton Lycra Stretch',
      purchasePrice: 300,
      sellingPrice: 649,
      rentalPrice: 0,
      taxPercent: 5,
      saleStock: 18,
      rentalStock: 0,
      purpose: 'SALE',
      minStockAlert: 4,
      supplierId: 'S1',
      description: 'Super soft elasticated stretch denim jegging pants for girls.',
      sizes: ['3-4Y', '5-6Y', '7-8Y', '9-10Y'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'P203',
      name: 'Girls Printed Summer Cotton Frock',
      sku: 'FRK-G03',
      barcode: '8902002003',
      category: 'Dresses',
      subCategory: 'Frock',
      gender: 'Girls',
      clothingType: 'Half (Short Sleeves/Shorts)',
      brand: 'Princess Cut',
      color: 'Lemon Yellow',
      material: '100% Cotton',
      purchasePrice: 350,
      sellingPrice: 799,
      rentalPrice: 0,
      taxPercent: 5,
      saleStock: 12,
      rentalStock: 0,
      purpose: 'SALE',
      minStockAlert: 3,
      supplierId: 'S1',
      description: 'Breathable tiered cotton A-line flared summer dress with sash belt.',
      sizes: ['2-3Y', '4-5Y', '6-7Y', '8-9Y'],
      createdAt: new Date().toISOString()
    },

    // 6. Girls Party Wear & Gowns
    {
      id: 'P204',
      name: 'Girls Sequin Layered Birthday Party Gown',
      sku: 'GWN-G04',
      barcode: '8902002004',
      category: 'Party Wear',
      subCategory: 'Designer Gown',
      gender: 'Girls',
      clothingType: 'Full (Long Sleeves/Pants)',
      brand: 'Royal Fairytale',
      color: 'Lavender Purple',
      material: 'Net Tulle & Satin',
      purchasePrice: 1500,
      sellingPrice: 3600,
      rentalPrice: 600,
      taxPercent: 12,
      saleStock: 5,
      rentalStock: 4,
      purpose: 'HYBRID',
      minStockAlert: 2,
      supplierId: 'S1',
      description: 'Heavy sequined bodice with fluffy 5-layer tulle flare gown for birthdays.',
      sizes: ['3-4Y', '5-6Y', '7-8Y', '9-10Y', '11-12Y'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'P205',
      name: 'Girls Velvet Royal Ball Gown',
      sku: 'GWN-G05',
      barcode: '8902002005',
      category: 'Party Wear',
      subCategory: 'Designer Gown',
      gender: 'Girls',
      clothingType: 'Full (Long Sleeves/Pants)',
      brand: 'Royal Fairytale',
      color: 'Emerald Green',
      material: 'Micro Velvet & Organza',
      purchasePrice: 1900,
      sellingPrice: 4500,
      rentalPrice: 750,
      taxPercent: 12,
      saleStock: 4,
      rentalStock: 3,
      purpose: 'HYBRID',
      minStockAlert: 2,
      supplierId: 'S1',
      description: 'Rich micro-velvet bodice ball gown with organza trailing skirt.',
      sizes: ['4-5Y', '6-7Y', '8-9Y', '10-12Y'],
      createdAt: new Date().toISOString()
    },

    // 7. Girls Ethnic Wear & Navratri Chaniya Choli
    {
      id: 'P206',
      name: 'Girls Embroidered Lehenga Choli Set',
      sku: 'LHG-G06',
      barcode: '8902002006',
      category: 'Ethnic Wear',
      subCategory: 'Lehenga Choli',
      gender: 'Girls',
      clothingType: 'Set - Full Top & Full Bottom',
      brand: 'Bapu Ethnic',
      color: 'Magenta & Gold',
      material: 'Silk Blend & Net Dupatta',
      purchasePrice: 1400,
      sellingPrice: 3200,
      rentalPrice: 550,
      taxPercent: 12,
      saleStock: 6,
      rentalStock: 4,
      purpose: 'HYBRID',
      minStockAlert: 2,
      supplierId: 'S1',
      description: 'Traditional zari work choli top with flared pleated lehenga & matching dupatta.',
      sizes: ['3-4Y', '5-6Y', '7-8Y', '9-10Y', '11-12Y'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'P207',
      name: 'Girls Navratri Heavy Mirror-Work Chaniya Choli',
      sku: 'LHG-G07',
      barcode: '8902002007',
      category: 'Ethnic Wear',
      subCategory: 'Lehenga Choli',
      gender: 'Girls',
      clothingType: 'Set - Full Top & Full Bottom',
      brand: 'Gujrat Heritage',
      color: 'Multi-color Patchwork',
      material: 'Cotton & Real Glass Mirror',
      purchasePrice: 1200,
      sellingPrice: 2800,
      rentalPrice: 500,
      taxPercent: 12,
      saleStock: 5,
      rentalStock: 5,
      purpose: 'HYBRID',
      minStockAlert: 2,
      supplierId: 'S1',
      description: 'Authentic Garba Chaniya Choli set with traditional pom-pom hangings & mirror work dupatta.',
      sizes: ['3-4Y', '5-6Y', '7-8Y', '9-10Y'],
      createdAt: new Date().toISOString()
    },

    // 8. Baby Wear (0-2 Years)
    {
      id: 'P301',
      name: 'Baby Boys Printed Cotton Romper Set',
      sku: 'RMP-B01',
      barcode: '8903003001',
      category: 'Clothing',
      subCategory: 'Rompers',
      gender: 'Baby Boys (0–2 Years)',
      clothingType: 'Set - Half Top & Half Bottom',
      brand: 'Tiny Care',
      color: 'Sky Blue',
      material: '100% Organic Cotton',
      purchasePrice: 260,
      sellingPrice: 599,
      rentalPrice: 0,
      taxPercent: 5,
      saleStock: 20,
      rentalStock: 0,
      purpose: 'SALE',
      minStockAlert: 5,
      supplierId: 'S1',
      description: 'Super soft nickle-free snap button diaper access cotton romper.',
      sizes: ['0-3M', '3-6M', '6-12M', '12-18M'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'P302',
      name: 'Baby Girls Floral Cotton Dress Frock',
      sku: 'RMP-G02',
      barcode: '8903003002',
      category: 'Clothing',
      subCategory: 'Frocks',
      gender: 'Baby Girls (0–2 Years)',
      clothingType: 'Half (Short Sleeves/Shorts)',
      brand: 'Tiny Care',
      color: 'Coral Pink',
      material: 'Soft Organic Cotton',
      purchasePrice: 290,
      sellingPrice: 649,
      rentalPrice: 0,
      taxPercent: 5,
      saleStock: 18,
      rentalStock: 0,
      purpose: 'SALE',
      minStockAlert: 4,
      supplierId: 'S1',
      description: 'Adorable baby girl floral frock with matching inner bloomers.',
      sizes: ['3-6M', '6-12M', '12-18M', '18-24M'],
      createdAt: new Date().toISOString()
    },

    // 9. Costumes & Roleplay
    {
      id: 'P401',
      name: 'Superhero Spiderman Full Suit Costume',
      sku: 'COS-01',
      barcode: '8904004001',
      category: 'Costumes',
      subCategory: 'Roleplay',
      gender: 'Unisex',
      clothingType: 'Full (Long Sleeves/Pants)',
      brand: 'Fun Costumes',
      color: 'Red & Blue',
      material: 'Polyester Spandex',
      purchasePrice: 500,
      sellingPrice: 1200,
      rentalPrice: 300,
      taxPercent: 12,
      saleStock: 8,
      rentalStock: 6,
      purpose: 'HYBRID',
      minStockAlert: 3,
      supplierId: 'S1',
      description: 'Stretchable full body superhero costume with detachable mask for school plays & parties.',
      sizes: ['3-4Y', '5-6Y', '7-8Y'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'P402',
      name: 'Fairy Princess Costume with Wings & Wand',
      sku: 'COS-02',
      barcode: '8904004002',
      category: 'Costumes',
      subCategory: 'Roleplay',
      gender: 'Girls',
      clothingType: 'Set - Sleeveless & Shorts',
      brand: 'Fun Costumes',
      color: 'Pink Glitter',
      material: 'Satin & Glitter Net',
      purchasePrice: 450,
      sellingPrice: 1100,
      rentalPrice: 250,
      taxPercent: 12,
      saleStock: 6,
      rentalStock: 5,
      purpose: 'HYBRID',
      minStockAlert: 2,
      supplierId: 'S1',
      description: 'Fairy dress complete with detachable wings, tiara headpiece & magic wand.',
      sizes: ['3-4Y', '5-6Y', '7-8Y'],
      createdAt: new Date().toISOString()
    },

    // 10. Winter Wear & Rainwear
    {
      id: 'P501',
      name: 'Boys Fleece Hooded Jacket',
      sku: 'WNT-01',
      barcode: '8905005001',
      category: 'Winter Wear',
      subCategory: 'Jackets',
      gender: 'Boys',
      clothingType: 'Full (Long Sleeves/Pants)',
      brand: 'Kiddies Warm',
      color: 'Navy & Yellow',
      material: 'Polyester Fleece',
      purchasePrice: 550,
      sellingPrice: 1299,
      rentalPrice: 0,
      taxPercent: 12,
      saleStock: 10,
      rentalStock: 0,
      purpose: 'SALE',
      minStockAlert: 3,
      supplierId: 'S1',
      description: 'Heavy thermal fleece warm hooded zipper jacket with side pockets.',
      sizes: ['4-5Y', '6-7Y', '8-9Y', '10-12Y'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'P502',
      name: 'Kids Waterproof Hooded Raincoat Set',
      sku: 'RAIN-01',
      barcode: '8905005002',
      category: 'Clothing',
      subCategory: 'Raincoats',
      gender: 'Unisex',
      clothingType: 'Set - Full Top & Full Bottom',
      brand: 'RainShield',
      color: 'Bright Yellow',
      material: 'Waterproof PVC',
      purchasePrice: 350,
      sellingPrice: 799,
      rentalPrice: 0,
      taxPercent: 12,
      saleStock: 12,
      rentalStock: 0,
      purpose: 'SALE',
      minStockAlert: 3,
      supplierId: 'S1',
      description: '100% waterproof raincoat with school bag space back panel & pants.',
      sizes: ['3-5Y', '6-8Y', '9-12Y'],
      createdAt: new Date().toISOString()
    }
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
  supplierBills: [],
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
    rentalInvoicePrefix: 'RNT-',
    enableDeleteInventory: false,
    enableDeleteCustomers: false,
    enableDeleteTransactions: false,
    enableDeleteRentals: false,
    enableDeleteSuppliers: false,
    enableDeleteUsers: false
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
          setState(prev => ({ ...prev, currentUser: null }));
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
        supabase.from('profiles').select('*').eq('id', session.user.id).single()
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
        setState(prev => ({ ...prev, currentUser: null }));
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
        products: (products && products.length > 0)
          ? products.map(p => ({
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
          }))
          : INITIAL_DATA.products,
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
        supplierBills: (supplierBills || []).map(b => {
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
            totalAmount: Number(b.total_amount || 0),
            paidAmount: Number(b.paid_amount || 0),
            status: b.status as 'UNPAID' | 'PARTIAL' | 'PAID',
            notes: b.notes || '',
            imageUrl: b.image_url || undefined,
            createdAt: b.created_at
          };
        }),
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
              const map = new Map(remoteRentals.map(item => [item.id, item]));
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
  const login = async (email: string, pass: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;

      if (data?.user) {
        const name = data.user.user_metadata?.name || 'User';
        const role = data.user.user_metadata?.role || UserRole.STAFF;
        const permissions: string[] = [];
        const createdAt = new Date().toISOString();

        setState(prev => ({
          ...prev,
          currentUser: {
            id: data.user.id,
            name,
            email: data.user.email || '',
            role,
            permissions,
            createdAt
          }
        }));

        // Fetch profile in the background
        supabase.from('profiles').select('*').eq('id', data.user.id).single()
          .then(({ data: profile }) => {
            if (profile) {
              setState(prev => {
                if (!prev.currentUser || prev.currentUser.id !== data.user.id) return prev;
                return {
                  ...prev,
                  currentUser: {
                    ...prev.currentUser,
                    name: profile.name || prev.currentUser.name,
                    role: (profile.role as any) || prev.currentUser.role,
                    permissions: profile.permissions || prev.currentUser.permissions,
                    createdAt: profile.created_at || prev.currentUser.createdAt
                  }
                };
              });
            }
          })
          .catch(err => {
            console.warn("Could not query user profile on login in background:", err);
          });
      }

      fetchAllData();
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
    const id = generateID();
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
      if (error) throw error;
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

      const { error } = await supabase.from('suppliers').update(dbUpdates).eq('id', id);
      if (error) throw error;
      await fetchAllData();
    } catch (error) {
      console.error('Error updating supplier:', error);
    }
  };

  const deleteSupplier = async (id: string) => {
    try {
      setState(prev => ({
        ...prev,
        suppliers: prev.suppliers.filter(s => s.id !== id)
      }));
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) console.warn('Supabase deleteSupplier error:', error);
      await fetchAllData();
    } catch (error) {
      console.error('Error deleting supplier:', error);
    }
  };

  const addSupplierBill = async (bill: Omit<SupplierBill, 'id' | 'createdAt' | 'items'> & { items: Omit<SupplierBillItem, 'id' | 'billId' | 'createdAt'>[] }, imageFile?: File) => {
    try {
      let imageUrl = bill.imageUrl;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, `supplier_bills/${bill.supplierId}_${Date.now()}`);
      }

      const { data, error } = await supabase.from('supplier_bills').insert([{
        supplier_id: bill.supplierId,
        bill_number: bill.billNumber,
        date: bill.date,
        total_amount: bill.totalAmount,
        paid_amount: bill.paidAmount,
        status: bill.status,
        notes: bill.notes,
        image_url: imageUrl
      }]).select().single();
      if (error) throw error;

      const newBillId = data.id;

      if (bill.items && bill.items.length > 0) {
        const itemsToInsert = bill.items.map(item => ({
          bill_id: newBillId,
          item_name: item.itemName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.total
        }));
        const { error: itemsError } = await supabase.from('supplier_bill_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      await fetchAllData();
    } catch (error) {
      console.error('Error adding supplier bill:', error);
      throw error;
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

      const updateData: any = {};
      if (bill.billNumber !== undefined) updateData.bill_number = bill.billNumber;
      if (bill.date !== undefined) updateData.date = bill.date;
      if (bill.totalAmount !== undefined) updateData.total_amount = bill.totalAmount;
      if (bill.paidAmount !== undefined) updateData.paid_amount = bill.paidAmount;
      if (bill.status !== undefined) updateData.status = bill.status;
      if (bill.notes !== undefined) updateData.notes = bill.notes;
      if (imageUrl !== undefined) updateData.image_url = imageUrl;

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase.from('supplier_bills').update(updateData).eq('id', billId);
        if (error) throw error;
      }

      if (bill.items) {
        await supabase.from('supplier_bill_items').delete().eq('bill_id', billId);
        if (bill.items.length > 0) {
          const itemsToInsert = bill.items.map(item => ({
            bill_id: billId,
            item_name: item.itemName,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total: item.total
          }));
          const { error: itemsError } = await supabase.from('supplier_bill_items').insert(itemsToInsert);
          if (itemsError) throw itemsError;
        }
      }

      await fetchAllData();
    } catch (error) {
      console.error('Error updating supplier bill:', error);
      throw error;
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
      const { error } = await supabase.from('supplier_bills').delete().eq('id', id);
      if (error) throw error;
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
  const addRental = async (r: Omit<Rental, 'id' | 'invoiceNumber' | 'date' | 'status' | 'lateFee' | 'actualReturnDate'>, imageFiles?: File[]) => {
    const id = generateID();
    const prefix = state.settings.rentalInvoicePrefix || 'RNT-';
    const invoiceNumber = `${prefix}${state.rentals.length + 1001}`;
    const nowStr = new Date().toISOString();

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
      status: RentalStatus.ACTIVE,
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
        status: RentalStatus.ACTIVE,
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
        await supabase.from('stock_logs').insert({
          id: logId,
          product_id: r.productId,
          pool: poolUsed,
          type: 'OUT',
          quantity: r.quantity,
          reason: `Rental ${invoiceNumber}${poolUsed === 'SALE' ? ' (from Sale Stock)' : ''}`,
          date: nowStr
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
        rental_invoice_prefix: settings.rentalInvoicePrefix,
        enable_delete_inventory: settings.enableDeleteInventory,
        enable_delete_customers: settings.enableDeleteCustomers,
        enable_delete_transactions: settings.enableDeleteTransactions,
        enable_delete_rentals: settings.enableDeleteRentals,
        enable_delete_suppliers: settings.enableDeleteSuppliers,
        enable_delete_users: settings.enableDeleteUsers
      }).eq('id', 'default');
      if (error) throw error;
      await fetchAllData();
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  const deleteSale = async (id: string) => {
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
      addCustomer, deleteCustomer,
      addSupplier, updateSupplier, deleteSupplier,
      addSale, updateOrderStatus, updateSale, addPaymentToSale,
      addRental, updateRental, returnRental,
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
