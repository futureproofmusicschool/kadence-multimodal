import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables for FRONTEND use
// IMPORTANT: Use the ANON KEY here, not the Service Key!
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL; // Still uses REACT_APP_ prefix for client-side CRA
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY; // Public Anon Key

// Ensure environment variables are set
if (!supabaseUrl) {
  console.warn("Warning: REACT_APP_SUPABASE_URL environment variable is not set. Frontend Supabase client may not work.");
  // Don't throw error, maybe frontend client isn't always needed
}
if (!supabaseAnonKey) {
  console.warn("Warning: REACT_APP_SUPABASE_ANON_KEY environment variable is not set. Frontend Supabase client may not work.");
}

// Create and export the Supabase client instance (using Anon key)
// This client is for client-side operations ONLY (if any) and respects RLS.
// Log saving will happen via an API route using the Service Key.
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (supabase) {
  console.log('Frontend Supabase client initialized (using Anon Key).'); 
} else {
  console.log('Frontend Supabase client NOT initialized (missing URL or Anon Key).');
} 