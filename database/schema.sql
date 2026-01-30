-- ================================================
-- LOL-PAGE: Public Layer Schema
-- ================================================
-- This creates public-facing tables and functions
-- on top of your existing private 'accounts' table.
-- 
-- DOES NOT modify your accounts table.
-- Run this in Supabase SQL Editor.
-- ================================================

-- ================================================
-- 1. PUBLIC SKINS TABLE (Normalized from skin_list)
-- ================================================
-- Stores individual skins extracted from JSONB for fast search/filter

CREATE TABLE IF NOT EXISTS public_skins (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    skin_name TEXT NOT NULL,
    champion_name TEXT,  -- Extracted from skin name pattern
    
    -- Prevent duplicate skins per account
    UNIQUE(account_id, skin_name)
);

-- Indexes for fast searching
CREATE INDEX IF NOT EXISTS idx_public_skins_name 
    ON public_skins(skin_name);

CREATE INDEX IF NOT EXISTS idx_public_skins_name_lower 
    ON public_skins(LOWER(skin_name));

CREATE INDEX IF NOT EXISTS idx_public_skins_champion 
    ON public_skins(champion_name);

CREATE INDEX IF NOT EXISTS idx_public_skins_account 
    ON public_skins(account_id);

-- NOTE: Trigram index (pg_trgm) removed - requires extension that may not be available.
-- The basic indexes above work fine for ILIKE searches.
-- If you want faster fuzzy search later, run this in Supabase SQL Editor:
--   CREATE EXTENSION IF NOT EXISTS pg_trgm;
--   CREATE INDEX idx_public_skins_name_trgm ON public_skins USING gin(skin_name gin_trgm_ops);


-- ================================================
-- 2. CHAMPION EXTRACTION HELPER
-- ================================================
-- Common pattern: "Skin Name ChampionName" 
-- This function attempts to extract champion from known patterns

CREATE OR REPLACE FUNCTION extract_champion_from_skin(skin_name TEXT)
RETURNS TEXT AS $$
DECLARE
    -- Common champion names (add more as needed)
    champions TEXT[] := ARRAY[
        'Aatrox', 'Ahri', 'Akali', 'Akshan', 'Alistar', 'Amumu', 'Anivia', 'Annie',
        'Aphelios', 'Ashe', 'Aurelion Sol', 'Azir', 'Bard', 'Belveth', 'Blitzcrank',
        'Brand', 'Braum', 'Briar', 'Caitlyn', 'Camille', 'Cassiopeia', 'Chogath',
        'Corki', 'Darius', 'Diana', 'Draven', 'Dr. Mundo', 'Ekko', 'Elise', 'Evelynn',
        'Ezreal', 'Fiddlesticks', 'Fiora', 'Fizz', 'Galio', 'Gangplank', 'Garen',
        'Gnar', 'Gragas', 'Graves', 'Gwen', 'Hecarim', 'Heimerdinger', 'Hwei',
        'Illaoi', 'Irelia', 'Ivern', 'Janna', 'Jarvan IV', 'Jax', 'Jayce', 'Jhin',
        'Jinx', 'Kaisa', 'Kalista', 'Karma', 'Karthus', 'Kassadin', 'Katarina',
        'Kayle', 'Kayn', 'Kennen', 'Khazix', 'Kindred', 'Kled', 'KogMaw', 'Leblanc',
        'Lee Sin', 'Leona', 'Lillia', 'Lissandra', 'Lucian', 'Lulu', 'Lux',
        'Malphite', 'Malzahar', 'Maokai', 'Master Yi', 'Milio', 'Miss Fortune',
        'Mordekaiser', 'Morgana', 'Naafiri', 'Nami', 'Nasus', 'Nautilus', 'Neeko',
        'Nidalee', 'Nilah', 'Nocturne', 'Nunu', 'Olaf', 'Orianna', 'Ornn', 'Pantheon',
        'Poppy', 'Pyke', 'Qiyana', 'Quinn', 'Rakan', 'Rammus', 'RekSai', 'Rell',
        'Renata Glasc', 'Renekton', 'Rengar', 'Riven', 'Rumble', 'Ryze', 'Samira',
        'Sejuani', 'Senna', 'Seraphine', 'Sett', 'Shaco', 'Shen', 'Shyvana', 'Singed',
        'Sion', 'Sivir', 'Skarner', 'Smolder', 'Sona', 'Soraka', 'Swain', 'Sylas',
        'Syndra', 'Tahm Kench', 'Taliyah', 'Talon', 'Taric', 'Teemo', 'Thresh',
        'Tristana', 'Trundle', 'Tryndamere', 'Twisted Fate', 'Twitch', 'Udyr',
        'Urgot', 'Varus', 'Vayne', 'Veigar', 'Velkoz', 'Vex', 'Vi', 'Viego', 'Viktor',
        'Vladimir', 'Volibear', 'Warwick', 'Wukong', 'Xayah', 'Xerath', 'Xin Zhao',
        'Yasuo', 'Yone', 'Yorick', 'Yuumi', 'Zac', 'Zed', 'Zeri', 'Ziggs', 'Zilean',
        'Zoe', 'Zyra'
    ];
    champ TEXT;
BEGIN
    -- Check if skin name ends with a champion name
    FOREACH champ IN ARRAY champions LOOP
        IF skin_name ILIKE '%' || champ THEN
            RETURN champ;
        END IF;
    END LOOP;
    
    -- Return NULL if no match found
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ================================================
-- 3. SYNC FUNCTION (Trigger-based)
-- ================================================
-- Automatically syncs skins when account's skin_list changes

CREATE OR REPLACE FUNCTION sync_account_skins()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip if account is sold
    IF NEW.is_sold = TRUE THEN
        -- Remove skins for sold accounts
        DELETE FROM public_skins WHERE account_id = NEW.id;
        RETURN NEW;
    END IF;
    
    -- Delete existing skins for this account
    DELETE FROM public_skins WHERE account_id = NEW.id;
    
    -- Insert skins from JSONB string array
    INSERT INTO public_skins (account_id, skin_name, champion_name)
    SELECT 
        NEW.id,
        skin_elem::TEXT,  -- Convert JSONB string to TEXT (removes quotes)
        extract_champion_from_skin(skin_elem::TEXT)
    FROM jsonb_array_elements_text(COALESCE(NEW.skin_list, '[]'::jsonb)) AS skin_elem
    ON CONFLICT (account_id, skin_name) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS trigger_sync_skins ON accounts;

CREATE TRIGGER trigger_sync_skins
    AFTER INSERT OR UPDATE OF skin_list, is_sold ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION sync_account_skins();


-- ================================================
-- 4. SECURE FUNCTION: Get Public Accounts
-- ================================================
-- Returns ONLY safe account data, bypasses RLS safely

CREATE OR REPLACE FUNCTION get_public_accounts()
RETURNS TABLE (
    id INTEGER,
    display_name TEXT,
    level INTEGER,
    region TEXT,
    status TEXT,
    skin_count INTEGER,
    created_at DATE
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.in_game_nick,
        a.level,
        a.server_info,
        CASE 
            WHEN a.is_running THEN 'in_use'
            ELSE 'available'
        END,
        jsonb_array_length(COALESCE(a.skin_list, '[]'::jsonb)),
        a.creation_time
    FROM accounts a
    WHERE a.is_sold = FALSE
    ORDER BY a.level DESC, a.id;
END;
$$;


-- ================================================
-- 5. SECURE FUNCTION: Get Public Skins with Account Info
-- ================================================
-- Returns skins joined with safe account data

CREATE OR REPLACE FUNCTION get_public_skins()
RETURNS TABLE (
    skin_id INTEGER,
    skin_name TEXT,
    champion_name TEXT,
    account_id INTEGER,
    display_name TEXT,
    level INTEGER,
    region TEXT,
    status TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.id,
        ps.skin_name,
        ps.champion_name,
        ps.account_id,
        a.in_game_nick,
        a.level,
        a.server_info,
        CASE 
            WHEN a.is_running THEN 'in_use'
            ELSE 'available'
        END
    FROM public_skins ps
    JOIN accounts a ON a.id = ps.account_id
    WHERE a.is_sold = FALSE
    ORDER BY ps.skin_name, a.level DESC;
END;
$$;


-- ================================================
-- 6. SECURE FUNCTION: Search Skins
-- ================================================
-- Searches skins by name with account info

CREATE OR REPLACE FUNCTION search_skins(search_term TEXT)
RETURNS TABLE (
    skin_id INTEGER,
    skin_name TEXT,
    champion_name TEXT,
    account_id INTEGER,
    display_name TEXT,
    level INTEGER,
    region TEXT,
    status TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.id,
        ps.skin_name,
        ps.champion_name,
        ps.account_id,
        a.in_game_nick,
        a.level,
        a.server_info,
        CASE 
            WHEN a.is_running THEN 'in_use'
            ELSE 'available'
        END
    FROM public_skins ps
    JOIN accounts a ON a.id = ps.account_id
    WHERE a.is_sold = FALSE
      AND ps.skin_name ILIKE '%' || search_term || '%'
    ORDER BY 
        -- Exact matches first
        CASE WHEN ps.skin_name ILIKE search_term THEN 0 ELSE 1 END,
        ps.skin_name,
        a.level DESC;
END;
$$;


-- ================================================
-- 7. Get Unique Regions (for filter dropdown)
-- ================================================

CREATE OR REPLACE FUNCTION get_regions()
RETURNS TABLE (region TEXT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT a.server_info
    FROM accounts a
    WHERE a.is_sold = FALSE
      AND a.server_info IS NOT NULL
    ORDER BY a.server_info;
END;
$$;


-- ================================================
-- 8. Get Unique Champions (for filter dropdown)
-- ================================================

CREATE OR REPLACE FUNCTION get_champions()
RETURNS TABLE (champion TEXT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ps.champion_name
    FROM public_skins ps
    JOIN accounts a ON a.id = ps.account_id
    WHERE a.is_sold = FALSE
      AND ps.champion_name IS NOT NULL
    ORDER BY ps.champion_name;
END;
$$;
