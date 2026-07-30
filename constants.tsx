
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

export const CATEGORIES = [
  'Party Wear',
  'Casual Wear',
  'Ethnic & Traditional',
  'Costumes & Fancy Dress',
  'Outerwear & Sweaters',
  'Sleepwear',
  'Innerwear',
  'Footwear',
  'Accessories'
];

export const SUB_CATEGORIES: Record<string, string[]> = {
  'Party Wear': ['Gowns', 'Suits', 'Tuxedos', 'Party Dresses', 'Blazers'],
  'Casual Wear': ['T-Shirts', 'Jeans', 'Shorts', 'Tops', 'Leggings', 'Dresses'],
  'Ethnic & Traditional': ['Kurta Sets', 'Lehengas', 'Sherwanis', 'Dhotis', 'Sarees'],
  'Costumes & Fancy Dress': ['Superheroes', 'Animals', 'Professions', 'Fairy Tales'],
  'Outerwear & Sweaters': ['Jackets', 'Coats', 'Sweaters', 'Cardigans', 'Hoodies'],
  'Sleepwear': ['Pajama Sets', 'Nightgowns', 'Rompers', 'Onesies'],
  'Innerwear': ['Briefs', 'Vests', 'Bloomers', 'Camisoles'],
  'Footwear': ['Sneakers', 'Sandals', 'Boots', 'Formal Shoes', 'Slippers'],
  'Accessories': ['Caps & Hats', 'Socks', 'Ties & Bowties', 'Hair Accessories', 'Belts']
};

export const GENDERS = ['Boys', 'Girls', 'Unisex'];
