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
const SUPABASE_URL = 'https://unaunfiyzmwhrjorupqe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYXVuZml5em13aHJqb3J1cHFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MjgyODksImV4cCI6MjA4MDQwNDI4OX0.FNmRfWS_GLVKvBnSoxxQ6F2GD_DbOr3sDf5R_7ymxUk';

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
