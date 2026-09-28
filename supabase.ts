import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfigInfo {
  url: string;
  hasKey: boolean;
  isConfigured: boolean;
  source: 'local_storage' | 'environment' | 'none';
}

export interface TableProbeResult {
  ok: boolean;
  count?: number;
  error?: string;
}

export interface SupabaseConnectionStatus {
  isConfigured: boolean;
  isConnected: boolean;
  url: string;
  source: 'local_storage' | 'environment' | 'none';
  latencyMs?: number;
  message: string;
  tables: Record<string, TableProbeResult>;
}

// 1. Resolve Supabase URL from localStorage first, then environment variable
function resolveSupabaseUrl(): { url: string; source: 'local_storage' | 'environment' | 'none' } {
  try {
    const customUrl = localStorage.getItem('kiddies_supabase_url')?.trim();
    if (customUrl) {
      if (/^https?:\/\//i.test(customUrl)) {
        return { url: customUrl, source: 'local_storage' };
      }
      if (/^[a-z0-9]{15,30}$/i.test(customUrl)) {
        return { url: `https://${customUrl}.supabase.co`, source: 'local_storage' };
      }
    }
  } catch (e) {}

  const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  if (rawUrl && /^https?:\/\//i.test(rawUrl)) {
    return { url: rawUrl, source: 'environment' };
  }
  if (rawUrl && /^[a-z0-9]{15,30}$/i.test(rawUrl)) {
    return { url: `https://${rawUrl}.supabase.co`, source: 'environment' };
  }

  // Attempt to infer from Anon Key payload if JWT
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
          return { url: `https://${payload.ref}.supabase.co`, source: 'environment' };
        }
      }
    } catch {}
  }

  return { url: 'https://placeholder.supabase.co', source: 'none' };
}

// 2. Resolve Supabase Key from localStorage first, then environment variable
function resolveSupabaseKey(): { key: string; source: 'local_storage' | 'environment' | 'none' } {
  try {
    const customKey = localStorage.getItem('kiddies_supabase_anon_key')?.trim();
    if (customKey && customKey.length > 10) {
      return { key: customKey, source: 'local_storage' };
    }
  } catch (e) {}

  const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  if (rawKey && rawKey.length > 10) {
    return { key: rawKey, source: 'environment' };
  }

  const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  if (rawUrl && (rawUrl.startsWith('sb_secret_') || rawUrl.startsWith('sbp_'))) {
    return { key: rawUrl, source: 'environment' };
  }

  return { key: 'placeholder-key', source: 'none' };
}

let activeClient: SupabaseClient | null = null;
let activeUrl = '';
let activeKey = '';

function createActiveClient(): SupabaseClient {
  const { url, source: urlSource } = resolveSupabaseUrl();
  const { key, source: keySource } = resolveSupabaseKey();

  activeUrl = url;
  activeKey = key;

  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  });
}

activeClient = createActiveClient();

// Proxy export so any changes to activeClient apply immediately everywhere
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(target, prop, receiver) {
    if (!activeClient) {
      activeClient = createActiveClient();
    }
    const val = (activeClient as any)[prop];
    if (typeof val === 'function') {
      return val.bind(activeClient);
    }
    return val;
  }
});

export function isSupabaseConfigured(): boolean {
  const { url, source: urlSource } = resolveSupabaseUrl();
  const { key, source: keySource } = resolveSupabaseKey();
  return (
    url !== 'https://placeholder.supabase.co' &&
    key !== 'placeholder-key' &&
    (urlSource !== 'none' || keySource !== 'none')
  );
}

export function getSupabaseConfig(): SupabaseConfigInfo {
  const { url, source: urlSource } = resolveSupabaseUrl();
  const { key, source: keySource } = resolveSupabaseKey();
  const isConfigured = isSupabaseConfigured();

  return {
    url: isConfigured ? url : '',
    hasKey: key !== 'placeholder-key' && key.length > 10,
    isConfigured,
    source: urlSource !== 'none' ? urlSource : keySource
  };
}

export function setSupabaseCredentials(url: string, key: string): void {
  try {
    if (url) {
      localStorage.setItem('kiddies_supabase_url', url.trim());
    } else {
      localStorage.removeItem('kiddies_supabase_url');
    }
    if (key) {
      localStorage.setItem('kiddies_supabase_anon_key', key.trim());
    } else {
      localStorage.removeItem('kiddies_supabase_anon_key');
    }
  } catch (e) {}

  activeClient = createActiveClient();
}

export function clearSupabaseCredentials(): void {
  try {
    localStorage.removeItem('kiddies_supabase_url');
    localStorage.removeItem('kiddies_supabase_anon_key');
  } catch (e) {}

  activeClient = createActiveClient();
}

// Live diagnostics test against real Supabase tables
export async function testSupabaseConnection(): Promise<SupabaseConnectionStatus> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return {
      isConfigured: false,
      isConnected: false,
      url: '',
      source: 'none',
      message: 'Supabase credentials are not configured. The application is running in local offline mode.',
      tables: {}
    };
  }

  const tablesToProbe = [
    'users',
    'profiles',
    'products',
    'customers',
    'sales',
    'sale_items',
    'rentals',
    'suppliers',
    'supplier_bills',
    'supplier_bill_items',
    'expenses',
    'credit_notes',
    'stock_logs',
    'notifications',
    'store_profile',
    'settings'
  ];

  const startTime = performance.now();
  const tablesResult: Record<string, TableProbeResult> = {};
  let successfulTables = 0;
  let primaryError = '';

  try {
    const probePromises = tablesToProbe.map(async (table) => {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          tablesResult[table] = { ok: false, error: error.message };
          if (!primaryError) primaryError = `${table}: ${error.message}`;
        } else {
          tablesResult[table] = { ok: true, count: count ?? 0 };
          successfulTables++;
        }
      } catch (err: any) {
        tablesResult[table] = { ok: false, error: err?.message || 'Network probe failed' };
        if (!primaryError) primaryError = `${table}: ${err?.message || 'Network probe failed'}`;
      }
    });

    await Promise.all(probePromises);
    const latencyMs = Math.round(performance.now() - startTime);

    const isConnected = successfulTables > 0;
    let message = '';

    if (successfulTables === tablesToProbe.length) {
      message = `Connected securely to Supabase (${latencyMs}ms). All ${successfulTables} tables verified and operational.`;
    } else if (successfulTables > 0) {
      message = `Connected with partial table access (${successfulTables}/${tablesToProbe.length} tables verified). Some tables may need schema creation or RLS permissions.`;
    } else {
      if (primaryError.includes('relation') || primaryError.includes('does not exist')) {
        message = `Connected to Supabase project, but database tables are not found. Please execute 'supabase_schema.sql' in the Supabase SQL Editor.`;
      } else if (primaryError.includes('policy') || primaryError.includes('permission denied')) {
        message = `Connected, but Row Level Security (RLS) is blocking access. Please run 'supabase_allow_all_public.sql' in the Supabase SQL Editor.`;
      } else if (primaryError.includes('API key') || primaryError.includes('JWT')) {
        message = `Connection failed: Invalid Supabase Anon API Key. Please verify your public anon key in project settings.`;
      } else {
        message = `Connection failed: ${primaryError || 'Could not reach Supabase endpoint.'}`;
      }
    }

    return {
      isConfigured: true,
      isConnected,
      url: config.url,
      source: config.source,
      latencyMs,
      message,
      tables: tablesResult
    };
  } catch (error: any) {
    return {
      isConfigured: true,
      isConnected: false,
      url: config.url,
      source: config.source,
      message: `Failed to connect to Supabase: ${error?.message || 'Network error'}`,
      tables: {}
    };
  }
}

export default supabase;
