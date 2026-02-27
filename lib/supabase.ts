import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isValidUrl = (url: string) => {
    try {
        if (!url || url.includes('AQUI')) return false;
        const parsed = new URL(url);
        return parsed.protocol === 'https:';
    } catch {
        return false;
    }
};

export const isSupabaseConfigured = isValidUrl(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes('AQUI');

if (!isSupabaseConfigured) {
    console.error('Supabase configuration error:');
    console.warn('- URL valid:', isValidUrl(supabaseUrl));
    console.warn('- Key present:', Boolean(supabaseAnonKey));
    console.warn('Application will run in restricted mode (Configuration UI will be shown).');
}

// Ensure we pass a valid URL format to createClient to avoid fatal initialization error
export const supabase = createClient<Database>(
    isSupabaseConfigured ? supabaseUrl : 'https://placeholder-project.supabase.co',
    isSupabaseConfigured ? supabaseAnonKey : 'placeholder-key'
);
