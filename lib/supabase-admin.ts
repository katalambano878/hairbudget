import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('[supabase-admin] missing env vars — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}

function _init() {
    try {
        return createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseServiceKey || 'placeholder-key', {
            auth: { autoRefreshToken: false, persistSession: false },
        });
    } catch (e) {
        console.error('[supabase-admin] createClient failed:', e);
        return createClient('https://placeholder.supabase.co', 'placeholder-key', {
            auth: { autoRefreshToken: false, persistSession: false },
        });
    }
}

export const supabaseAdmin = _init();
