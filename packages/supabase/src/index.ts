import { createClient, type SupabaseClient, type Session, type User } from '@supabase/supabase-js';
import type { Profile } from '@padel/core';

let client: SupabaseClient | null = null;

// Cliente básico para SPA (Client Components) - SINGLETON
export const createBrowserClient = () => {
    if (client) return client;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
        throw new Error('Supabase URL or Anon Key is missing in environment variables');
    }

    client = createClient(url, key);
    return client;
};

export * from './contexts/AuthContext';
export type { Session, User, Profile };

