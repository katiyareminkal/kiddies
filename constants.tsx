import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag,
  RefreshCcw,
  Package, 
  Truck,
  Users,
  BarChart3, 
  ShieldCheck,
  Settings
} from 'lucide-react';

export const NAVIGATION_ITEMS = [
  { label: 'Dashboard', icon: <LayoutDashboard size={20} />, id: 'dashboard' },
  { label: 'Sales', icon: <ShoppingBag size={20} />, id: 'sales' },
  { label: 'Rentals', icon: <RefreshCcw size={20} />, id: 'rentals' },
  { label: 'Inventory', icon: <Package size={20} />, id: 'inventory' },
  { label: 'Suppliers', icon: <Truck size={20} />, id: 'suppliers' },
  { label: 'Customers', icon: <Users size={20} />, id: 'customers' },
  { label: 'Reports', icon: <BarChart3 size={20} />, id: 'reports' },
  { label: 'User Management', icon: <ShieldCheck size={20} />, id: 'users' },
  { label: 'Settings', icon: <Settings size={20} />, id: 'settings' },
];

export const GENDERS = [
  'Boys',
  'Girls',
  'Baby Boys (0–2 Years)',
  'Baby Girls (0–2 Years)',
  'Unisex'
];

export const CATEGORIES_BY_GENDER: Record<string, string[]> = {
  'Boys': [
    'Top Wear', 'Bottom Wear', 'Co-ord Sets', 'Ethnic Wear', 'Party Wear', 'Night Wear', 'Winter Wear', 'Sports Wear', 'Swimwear'
  ],
  'Girls': [
    'Top Wear', 'Bottom Wear', 'Dresses', 'Co-ord Sets', 'Ethnic Wear', 'Party Wear', 'Night Wear', 'Winter Wear', 'Sports Wear', 'Swimwear'
  ],
  'Baby Boys (0–2 Years)': [
    'Clothing', 'Accessories'
  ],
  'Baby Girls (0–2 Years)': [
    'Clothing', 'Accessories'
  ],
  'Unisex': [
    'Clothing', 'Accessories'
  ]
};

export const CATEGORIES = Array.from(new Set(Object.values(CATEGORIES_BY_GENDER).flat()));

export const SUB_CATEGORIES_BY_GENDER_AND_CATEGORY: Record<string, Record<string, string[]>> = {
  'Boys': {
    'Top Wear': ['T-Shirts', 'Polo T-Shirts', 'Casual Shirts', 'Formal Shirts', 'Denim Shirts', 'Kurtas', 'Hoodies', 'Sweatshirts', 'Jackets', 'Blazers', 'Waistcoats'],
    'Bottom Wear': ['Jeans', 'Trousers', 'Joggers', 'Track Pants', 'Cargo Pants', 'Shorts', 'Capris'],
    'Co-ord Sets': ['Casual', 'Party', 'Cotton', 'Winter'],
    'Ethnic Wear': ['Kurta Pajama', 'Kurta Dhoti', 'Sherwani', 'Pathani Suit', 'Nehru Jacket Set'],
    'Party Wear': ['Suit', 'Blazer Set', 'Tuxedo', 'Party Shirt'],
    'Night Wear': ['Night Suit', 'Pajama Set', 'Sleepsuit'],
    'Winter Wear': ['Sweaters', 'Cardigans', 'Hoodies', 'Jackets', 'Thermals'],
    'Sports Wear': ['Sports T-Shirts', 'Jerseys', 'Shorts', 'Tracksuits'],
    'Swimwear': ['Swim Shorts', 'Swim Sets']
  },
  'Girls': {
    'Top Wear': ['Tops', 'T-Shirts', 'Shirts', 'Tunics', 'Crop Tops', 'Kurtis', 'Hoodies', 'Sweatshirts', 'Jackets'],
    'Bottom Wear': ['Jeans', 'Leggings', 'Jeggings', 'Shorts', 'Skirts', 'Palazzos', 'Trousers', 'Capris'],
    'Dresses': ['Casual Dress', 'Party Dress', 'Frock', 'Maxi Dress', 'Gown', 'Denim Dress'],
    'Co-ord Sets': ['Casual', 'Party', 'Cotton', 'Winter'],
    'Ethnic Wear': ['Lehenga Choli', 'Sharara Set', 'Kurti Set', 'Anarkali', 'Gown', 'Dhoti Set'],
    'Party Wear': ['Party Dress', 'Party Frock', 'Designer Gown'],
    'Night Wear': ['Night Suit', 'Night Dress', 'Pajama Set'],
    'Winter Wear': ['Sweaters', 'Cardigans', 'Hoodies', 'Jackets', 'Thermals'],
    'Sports Wear': ['Sports T-Shirts', 'Leggings', 'Tracksuits', 'Activewear'],
    'Swimwear': ['Swimsuit', 'Swim Set']
  },
  'Baby Boys (0–2 Years)': {
    'Clothing': ['Rompers', 'Onesies', 'Bodysuits', 'Sleepsuits', 'Jumpsuits', 'Dungarees', 'T-Shirt & Shorts Set', 'Shirt & Pant Set', 'Kurta Set', 'Winter Set'],
    'Accessories': ['Caps', 'Bibs', 'Mittens', 'Socks', 'Booties']
  },
  'Baby Girls (0–2 Years)': {
    'Clothing': ['Rompers', 'Onesies', 'Bodysuits', 'Sleepsuits', 'Jumpsuits', 'Dungarees', 'Frocks', 'Dress Sets', 'Skirt Sets', 'Kurti Sets', 'Winter Set'],
    'Accessories': ['Headbands', 'Hair Clips', 'Caps', 'Bibs', 'Socks', 'Booties']
  },
  'Unisex': {
    'Clothing': ['T-Shirts', 'Co-ord Sets', 'Hoodies', 'Sweatshirts', 'Jackets', 'Thermals', 'Night Suits', 'Raincoats'],
    'Accessories': ['Caps', 'Hats', 'Socks', 'Gloves', 'Belts', 'Sunglasses', 'Scarves']
  }
};

// Deprecated: kept for backwards compatibility if needed, but should use SUB_CATEGORIES_BY_GENDER_AND_CATEGORY
export const SUB_CATEGORIES: Record<string, string[]> = {};

export const CLOTHING_TYPES = [
  'Half (Short Sleeves/Shorts)',
  'Full (Long Sleeves/Pants)',
  'Sleeveless',
  'Set - Half Top & Half Bottom',
  'Set - Full Top & Full Bottom',
  'Set - Half Top & Full Bottom',
  'Set - Full Top & Half Bottom',
  'Set - Sleeveless & Shorts',
  'Set - Sleeveless & Pants',
  'Other'
];
