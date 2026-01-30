-- ================================================
-- LOL-PAGE: Row Level Security Policies
-- ================================================
-- Run this AFTER schema.sql in Supabase SQL Editor.
-- Ensures public_skins table is read-only for anon users.
-- ================================================

-- ================================================
-- 1. Enable RLS on public_skins table
-- ================================================

ALTER TABLE public_skins ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 2. Allow anonymous SELECT on public_skins
-- ================================================
-- This lets the website read skin data

DROP POLICY IF EXISTS "Allow public read on public_skins" ON public_skins;

CREATE POLICY "Allow public read on public_skins"
    ON public_skins
    FOR SELECT
    TO anon
    USING (true);

-- ================================================
-- 3. Block anonymous INSERT on public_skins
-- ================================================

DROP POLICY IF EXISTS "Block public insert on public_skins" ON public_skins;

CREATE POLICY "Block public insert on public_skins"
    ON public_skins
    FOR INSERT
    TO anon
    WITH CHECK (false);

-- ================================================
-- 4. Block anonymous UPDATE on public_skins
-- ================================================

DROP POLICY IF EXISTS "Block public update on public_skins" ON public_skins;

CREATE POLICY "Block public update on public_skins"
    ON public_skins
    FOR UPDATE
    TO anon
    USING (false)
    WITH CHECK (false);

-- ================================================
-- 5. Block anonymous DELETE on public_skins
-- ================================================

DROP POLICY IF EXISTS "Block public delete on public_skins" ON public_skins;

CREATE POLICY "Block public delete on public_skins"
    ON public_skins
    FOR DELETE
    TO anon
    USING (false);

-- ================================================
-- 6. Grant EXECUTE on public functions to anon
-- ================================================
-- These functions use SECURITY DEFINER to safely
-- return filtered data from the accounts table

GRANT EXECUTE ON FUNCTION get_public_accounts() TO anon;
GRANT EXECUTE ON FUNCTION get_public_skins() TO anon;
GRANT EXECUTE ON FUNCTION search_skins(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_regions() TO anon;
GRANT EXECUTE ON FUNCTION get_champions() TO anon;

-- ================================================
-- 7. Verify accounts table has RLS enabled
-- ================================================
-- Your accounts table should already have RLS, but
-- let's make sure no anonymous access is possible

-- Enable RLS if not already enabled
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Drop any existing public select policy (just in case)
DROP POLICY IF EXISTS "Allow public read on accounts" ON accounts;

-- Explicitly block all anonymous operations on accounts
DROP POLICY IF EXISTS "Block all anon on accounts" ON accounts;

CREATE POLICY "Block all anon on accounts"
    ON accounts
    FOR ALL
    TO anon
    USING (false)
    WITH CHECK (false);

-- ================================================
-- 8. Security Verification Queries
-- ================================================
-- Run these to verify security is working:

-- This should return data (via function):
-- SELECT * FROM get_public_accounts() LIMIT 5;

-- This should return EMPTY (direct table access blocked):
-- SELECT * FROM accounts LIMIT 5;  -- Run as anon role

-- To test as anon, you can use:
-- SET ROLE anon;
-- SELECT * FROM accounts;  -- Should fail or be empty
-- RESET ROLE;


-- ================================================
-- SECURITY SUMMARY
-- ================================================
-- 
-- ✅ public_skins: SELECT allowed, all writes blocked
-- ✅ accounts: ALL operations blocked for anon
-- ✅ Functions: SECURITY DEFINER safely filters data
-- 
-- Anonymous users can ONLY:
--   - Call get_public_accounts()
--   - Call get_public_skins()
--   - Call search_skins(term)
--   - Call get_regions()
--   - Call get_champions()
--   - SELECT from public_skins (direct)
--
-- Anonymous users CANNOT:
--   - Read accounts table directly
--   - Insert/Update/Delete any data
--   - See passwords, emails, usernames
-- ================================================
