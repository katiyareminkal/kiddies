import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Resolve a valid Supabase HTTP/HTTPS URL safely
function getSanitizedSupabaseUrl(): string {
  const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();

  // 1. If it's already a valid HTTP or HTTPS URL, use it directly
  if (rawUrl && /^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }

  // 2. If the user entered only their project ref (e.g., "zadjywovlasxeecxhurj")
  if (rawUrl && /^[a-z0-9]{15,30}$/i.test(rawUrl)) {
    return `https://${rawUrl}.supabase.co`;
  }

  // 3. If rawUrl is invalid (such as a secret key starting with sb_secret_... or missing),
  // extract the project ref from the anon key JWT payload (which contains {"ref": "..."})
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  if (anonKey && anonKey.includes('.')) {
    try {
      const parts = anonKey.split('.');
      if (parts.length >= 2) {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = typeof atob === 'function'
          ? decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
          : Buffer.from(base64, 'base64').toString('utf8');
        const payload = JSON.parse(jsonPayload);
        if (payload?.ref) {
          console.info(`[Supabase] Inferred project URL from Anon Key: https://${payload.ref}.supabase.co`);
          return `https://${payload.ref}.supabase.co`;
        }
      }
    } catch {
      // Ignore decoding failure and fall back
    }
  }

  // 4. Safe fallback to placeholder if nothing can be resolved
  console.warn("Supabase URL or Anon Key is missing or invalid. Using placeholder credentials to prevent app startup crash.");
  return 'https://placeholder.supabase.co';
}

function getSanitizedSupabaseKey(): string {
  const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  if (rawKey && rawKey.length > 10) {
    return rawKey;
  }
  return 'placeholder-key';
}

const supabaseUrl = getSanitizedSupabaseUrl();
const supabaseAnonKey = getSanitizedSupabaseKey();

export const supabase: any = createClient<any>(supabaseUrl, supabaseAnonKey);
export default supabase;
