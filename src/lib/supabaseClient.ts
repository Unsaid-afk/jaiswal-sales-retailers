import { createClient } from '@supabase/supabase-js';

// This is the client-side client.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// This is a server-side client creator.
export function createSupabaseServerClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Fallback to Anon Key if Service Role Key is not provided. 
    // Note: Using Anon Key means RLS policies will apply. Service Role Key bypasses RLS.
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase environment variables for server-side client.');
        throw new Error('Supabase URL and Key (Service Role or Anon) must be defined.');
    }

    return createClient(supabaseUrl, supabaseKey);
} 