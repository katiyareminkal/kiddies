
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
  'Party Wear': ['Gowns', 'Suits', 'Tuxedos', 'Party Dresses', 'Blazers', 'Waistcoats', 'Sequined Dresses', 'Tulle Skirts', 'Party Sets', 'Other'],
  'Casual Wear': ['Co-ord Sets', 'T-Shirts', 'Jeans', 'Shorts', 'Tops', 'Leggings', 'Dresses', 'Jumpsuits', 'Rompers', 'Overalls / Dungarees', 'Joggers', 'Sweatpants', 'Skirts', 'Tunics', 'Other'],
  'Ethnic & Traditional': ['Kurta Sets', 'Lehengas', 'Sherwanis', 'Dhotis', 'Sarees', 'Salwar Kameez', 'Nehru Jackets', 'Anarkalis', 'Palazzo Sets', 'Other'],
  'Costumes & Fancy Dress': ['Superheroes', 'Animals', 'Professions', 'Fairy Tales', 'Historical', 'Cartoon Characters', 'Other'],
  'Outerwear & Sweaters': ['Jackets', 'Coats', 'Sweaters', 'Cardigans', 'Hoodies', 'Windbreakers', 'Raincoats', 'Vests', 'Pullovers', 'Thermals', 'Other'],
  'Sleepwear': ['Pajama Sets', 'Nightgowns', 'Rompers', 'Onesies', 'Sleep Shirts', 'Robes', 'Other'],
  'Innerwear': ['Briefs', 'Vests', 'Bloomers', 'Camisoles', 'Trunks', 'Panties', 'Thermal Underwear', 'Other'],
  'Footwear': ['Sneakers', 'Sandals', 'Boots', 'Formal Shoes', 'Slippers', 'Flip Flops', 'Mary Janes', 'Loafers', 'Water Shoes', 'Other'],
  'Accessories': ['Caps & Hats', 'Socks', 'Ties & Bowties', 'Hair Accessories', 'Belts', 'Mittens & Gloves', 'Scarves', 'Sunglasses', 'Suspenders', 'Bags & Backpacks', 'Other']
};

export const GENDERS = ['Boys', 'Girls', 'Unisex'];

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
