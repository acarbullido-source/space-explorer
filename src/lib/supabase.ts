import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const STORAGE_URL_KEY = 'space_explorer_supabase_url';
const STORAGE_ANON_KEY = 'space_explorer_supabase_anon_key';
const SESSION_CLIENT_ID_KEY = 'space_explorer_client_id';
const STORAGE_SHIP_NAME_KEY = 'space_explorer_ship_name';

export interface SupabaseConfigInfo {
  url: string;
  anonKey: string;
  source: 'env' | 'storage' | 'none';
  isConfigured: boolean;
}

function isValidUrl(val: string | undefined | null): val is string {
  if (!val) return false;
  const trimmed = val.trim();
  return (
    trimmed.startsWith('https://') || trimmed.startsWith('http://')
  ) && !trimmed.includes('your-project-ref');
}

function isValidKey(val: string | undefined | null): val is string {
  if (!val) return false;
  const trimmed = val.trim();
  return trimmed.length >= 20 && !trimmed.includes('your-supabase-anon');
}

export function getSupabaseConfig(): SupabaseConfigInfo {
  const envUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

  if (isValidUrl(envUrl) && isValidKey(envKey)) {
    return {
      url: envUrl,
      anonKey: envKey,
      source: 'env',
      isConfigured: true,
    };
  }

  if (typeof window !== 'undefined') {
    const storedUrl = window.localStorage.getItem(STORAGE_URL_KEY)?.trim() ?? '';
    const storedKey = window.localStorage.getItem(STORAGE_ANON_KEY)?.trim() ?? '';
    if (isValidUrl(storedUrl) && isValidKey(storedKey)) {
      return {
        url: storedUrl,
        anonKey: storedKey,
        source: 'storage',
        isConfigured: true,
      };
    }
  }

  return {
    url: '',
    anonKey: '',
    source: 'none',
    isConfigured: false,
  };
}

let cachedClient: SupabaseClient | null = null;
let cachedSignature = '';

export function saveRuntimeSupabaseConfig(url: string, anonKey: string): boolean {
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();
  if (!isValidUrl(cleanUrl) || !isValidKey(cleanKey)) {
    return false;
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_URL_KEY, cleanUrl);
    window.localStorage.setItem(STORAGE_ANON_KEY, cleanKey);
  }
  // Reset cached client so next call picks up new credentials
  cachedClient = null;
  cachedSignature = '';
  return true;
}

export function clearRuntimeSupabaseConfig(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_URL_KEY);
    window.localStorage.removeItem(STORAGE_ANON_KEY);
  }
  cachedClient = null;
  cachedSignature = '';
}

export function getSupabaseClient(): SupabaseClient | null {
  const cfg = getSupabaseConfig();
  if (!cfg.isConfigured) return null;

  const sig = `${cfg.url}|${cfg.anonKey}`;
  if (cachedClient && cachedSignature === sig) {
    return cachedClient;
  }

  cachedClient = createClient(cfg.url, cfg.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 30,
      },
    },
  });
  cachedSignature = sig;
  return cachedClient;
}

export function getOrCreateClientId(): string {
  if (typeof window === 'undefined') return 'ship-server';
  let id = window.sessionStorage.getItem(SESSION_CLIENT_ID_KEY);
  if (!id) {
    const rand =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10);
    id = `ship-${rand}`;
    window.sessionStorage.setItem(SESSION_CLIENT_ID_KEY, id);
  }
  return id;
}

export function getSavedShipName(): string {
  if (typeof window === 'undefined') return 'ISS Horizon';
  return window.localStorage.getItem(STORAGE_SHIP_NAME_KEY) || 'ISS Horizon';
}

export function saveShipName(name: string): void {
  if (typeof window !== 'undefined' && name.trim()) {
    window.localStorage.setItem(STORAGE_SHIP_NAME_KEY, name.trim());
  }
}
