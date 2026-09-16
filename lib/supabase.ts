import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.warn('[supabase] env vars missing — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Wrapped in try-catch so a library-level error never crashes the webpack module factory
function _init() {
    try {
        return createClient(
            supabaseUrl || 'https://placeholder.supabase.co',
            supabaseKey || 'placeholder-key'
        );
    } catch (e) {
        console.error('[supabase] createClient failed:', e);
        return createClient('https://placeholder.supabase.co', 'placeholder-key');
    }
}

export const supabase = _init();
