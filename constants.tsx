
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

export const SUB_CATEGORIES: Record<string, Record<string, string[]>> = {
  'Party Wear': {
    'Boys': ['Suits', 'Tuxedos', 'Blazers', 'Waistcoats', 'Party Sets', 'Other'],
    'Girls': ['Gowns', 'Party Dresses', 'Sequined Dresses', 'Tulle Skirts', 'Party Sets', 'Other'],
    'Unisex': ['Party Sets', 'Other']
  },
  'Casual Wear': {
    'Boys': ['Co-ord Sets', 'T-Shirts', 'Jeans', 'Shorts', 'Joggers', 'Sweatpants', 'Overalls / Dungarees', 'Other'],
    'Girls': ['Co-ord Sets', 'T-Shirts', 'Jeans', 'Shorts', 'Tops', 'Leggings', 'Dresses', 'Jumpsuits', 'Rompers', 'Skirts', 'Tunics', 'Joggers', 'Sweatpants', 'Other'],
    'Unisex': ['Co-ord Sets', 'T-Shirts', 'Jeans', 'Shorts', 'Joggers', 'Sweatpants', 'Rompers', 'Overalls / Dungarees', 'Other']
  },
  'Ethnic & Traditional': {
    'Boys': ['Kurta Sets', 'Sherwanis', 'Dhotis', 'Nehru Jackets', 'Other'],
    'Girls': ['Lehengas', 'Sarees', 'Salwar Kameez', 'Anarkalis', 'Palazzo Sets', 'Kurta Sets', 'Other'],
    'Unisex': ['Kurta Sets', 'Other']
  },
  'Costumes & Fancy Dress': {
    'Boys': ['Superheroes', 'Animals', 'Professions', 'Historical', 'Cartoon Characters', 'Other'],
    'Girls': ['Superheroes', 'Animals', 'Professions', 'Fairy Tales', 'Historical', 'Cartoon Characters', 'Other'],
    'Unisex': ['Animals', 'Professions', 'Historical', 'Cartoon Characters', 'Other']
  },
  'Outerwear & Sweaters': {
    'Boys': ['Jackets', 'Coats', 'Sweaters', 'Cardigans', 'Hoodies', 'Windbreakers', 'Raincoats', 'Vests', 'Pullovers', 'Thermals', 'Other'],
    'Girls': ['Jackets', 'Coats', 'Sweaters', 'Cardigans', 'Hoodies', 'Windbreakers', 'Raincoats', 'Vests', 'Pullovers', 'Thermals', 'Other'],
    'Unisex': ['Jackets', 'Coats', 'Sweaters', 'Cardigans', 'Hoodies', 'Windbreakers', 'Raincoats', 'Vests', 'Pullovers', 'Thermals', 'Other']
  },
  'Sleepwear': {
    'Boys': ['Pajama Sets', 'Rompers', 'Onesies', 'Robes', 'Other'],
    'Girls': ['Pajama Sets', 'Nightgowns', 'Rompers', 'Onesies', 'Sleep Shirts', 'Robes', 'Other'],
    'Unisex': ['Pajama Sets', 'Rompers', 'Onesies', 'Robes', 'Other']
  },
  'Innerwear': {
    'Boys': ['Briefs', 'Vests', 'Trunks', 'Thermal Underwear', 'Other'],
    'Girls': ['Bloomers', 'Camisoles', 'Panties', 'Thermal Underwear', 'Other'],
    'Unisex': ['Vests', 'Thermal Underwear', 'Other']
  },
  'Footwear': {
    'Boys': ['Sneakers', 'Sandals', 'Boots', 'Formal Shoes', 'Slippers', 'Flip Flops', 'Loafers', 'Water Shoes', 'Other'],
    'Girls': ['Sneakers', 'Sandals', 'Boots', 'Formal Shoes', 'Slippers', 'Flip Flops', 'Mary Janes', 'Loafers', 'Water Shoes', 'Other'],
    'Unisex': ['Sneakers', 'Sandals', 'Boots', 'Slippers', 'Flip Flops', 'Water Shoes', 'Other']
  },
  'Accessories': {
    'Boys': ['Caps & Hats', 'Socks', 'Ties & Bowties', 'Belts', 'Mittens & Gloves', 'Scarves', 'Sunglasses', 'Suspenders', 'Bags & Backpacks', 'Other'],
    'Girls': ['Caps & Hats', 'Socks', 'Hair Accessories', 'Belts', 'Mittens & Gloves', 'Scarves', 'Sunglasses', 'Bags & Backpacks', 'Other'],
    'Unisex': ['Caps & Hats', 'Socks', 'Belts', 'Mittens & Gloves', 'Scarves', 'Sunglasses', 'Bags & Backpacks', 'Other']
  }
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
