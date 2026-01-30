-- ================================================
-- LOL-PAGE: Initial Data Sync
-- ================================================
-- Run this ONCE after schema.sql and rls_policies.sql
-- Syncs existing accounts' skin_list to public_skins table
-- ================================================

-- Clear any existing data (in case of re-run)
TRUNCATE TABLE public_skins RESTART IDENTITY;

-- Sync all existing accounts
DO $$
DECLARE
    acc RECORD;
    skin_text TEXT;
BEGIN
    -- Loop through all non-sold accounts
    FOR acc IN 
        SELECT id, skin_list 
        FROM accounts 
        WHERE is_sold = FALSE 
          AND skin_list IS NOT NULL 
          AND jsonb_array_length(skin_list) > 0
    LOOP
        -- Insert each skin from the JSONB array
        FOR skin_text IN 
            SELECT jsonb_array_elements_text(acc.skin_list)
        LOOP
            INSERT INTO public_skins (account_id, skin_name, champion_name)
            VALUES (
                acc.id,
                skin_text,
                extract_champion_from_skin(skin_text)
            )
            ON CONFLICT (account_id, skin_name) DO NOTHING;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Sync complete!';
END;
$$;

-- Show sync results
SELECT 
    'Total skins synced: ' || COUNT(*)::TEXT AS result
FROM public_skins;

SELECT 
    'Accounts with skins: ' || COUNT(DISTINCT account_id)::TEXT AS result
FROM public_skins;

-- Show sample of synced data
SELECT 
    ps.skin_name,
    ps.champion_name,
    a.in_game_nick,
    a.level,
    a.server_info
FROM public_skins ps
JOIN accounts a ON a.id = ps.account_id
LIMIT 10;
