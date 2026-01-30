/* ================================================
   LOL-PAGE: Supabase Configuration
   ================================================
   
   HOW TO SET UP:
   
   1. Copy this file and rename it to: config.js
   2. Replace the placeholder values with your actual Supabase credentials
   3. Your config.js will be loaded by the app
   
   WHERE TO FIND YOUR CREDENTIALS:
   
   1. Go to https://supabase.com/dashboard
   2. Select your project
   3. Go to Settings (gear icon) → API
   4. Copy "Project URL" for SUPABASE_URL
   5. Copy "anon public" key for SUPABASE_ANON_KEY
   
   ⚠️ SECURITY NOTES:
   
   - ONLY use the "anon" key, NEVER the "service_role" key
   - The anon key is designed to be public (client-side)
   - Your RLS policies protect the data, not the key
   - Never commit service_role key to any repository
   
   ================================================ */

// Replace these with your actual Supabase credentials
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY_HERE';

// ================================================
// DO NOT MODIFY BELOW THIS LINE
// ================================================

// Validation
if (SUPABASE_URL.includes('YOUR_PROJECT_ID')) {
    console.warn('⚠️ Supabase URL not configured! Please update config.js');
}

if (SUPABASE_ANON_KEY.includes('YOUR_ANON')) {
    console.warn('⚠️ Supabase anon key not configured! Please update config.js');
}
