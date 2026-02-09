/* ================================================
    Supabase Configuration
   ================================================
*/
const SUPABASE_URL = 'https://unaunfiyzmwhrjorupqe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYXVuZml5em13aHJqb3J1cHFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MjgyODksImV4cCI6MjA4MDQwNDI4OX0.FNmRfWS_GLVKvBnSoxxQ6F2GD_DbOr3sDf5R_7ymxUk';


// Validation
if (SUPABASE_URL.includes('YOUR_PROJECT_ID')) {
    console.warn(' Supabase URL not configured! Please update config.js');
}

if (SUPABASE_ANON_KEY.includes('YOUR_ANON')) {
    console.warn(' Supabase anon key not configured! Please update config.js');
}
