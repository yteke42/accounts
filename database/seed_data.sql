-- ================================================
-- SEED DATA GENERATOR
-- Generates 35 dummy accounts with random skins
-- Run this in Supabase SQL Editor
-- ================================================

DO $$
DECLARE
    -- List of skins to pick from
    v_skins text[] := ARRAY[
        'Elementalist Lux', 'DJ Sona', 'Spirit Guard Udyr', 'Pulsefire Ezreal', 'Gun Goddess Miss Fortune',
        'K/DA All Out Seraphine', 'Storm Dragon Lee Sin', 'Dark Star Thresh', 'High Noon Lucian', 'Project: Ashe',
        'Star Guardian Jinx', 'Nightbringer Yasuo', 'Dawnbringer Riven', 'God King Garen', 'God King Darius',
        'True Damage Ekko', 'High Noon Senna', 'Project: Vayne', 'Odyssey Kayn', 'Galaxy Slayer Zed',
        'Spirit Blossom Ahri', 'Spirit Blossom Thresh', 'Spirit Blossom Yone', 'Mecha Kingdoms Jax', 'Dark Cosmic Jhin',
        'Cosmic Lux', 'Dark Cosmic Lux', 'K/DA Akali', 'K/DA Kai''Sa', 'K/DA Ahri', 'K/DA Evelynn',
        'Prestige K/DA Kai''Sa', 'Prestige True Damage Senna', 'Prestige Obsidan Dragon Sett', 'Prestige High Noon Talon',
        'Blood Moon Aatrox', 'Blood Moon Diana', 'Blood Moon Jhin', 'Blood Moon Twisted Fate', 'Blood Moon Talon',
        'Project: Pyke', 'Project: Irelia', 'Project: Akali', 'Project: Warwick', 'Project: Jinx',
        'Battle Academia Ezreal', 'Battle Academia Katarina', 'Battle Academia Lux', 'Battle Academia Jayce',
        'Dragon Trainer Tristana', 'Dragon Trainer Heimerdinger', 'Pool Party Lee Sin', 'Pool Party Caitlyn'
    ];
    
    -- Variables for the loop
    v_account_id int;
    v_skin_count int;
    v_random_skin_indices int[];
    v_account_skins text[];
    v_skin text;
    v_i int;
    v_j int;
    v_region text;
    v_regions text[] := ARRAY['EUW', 'EUNE', 'NA', 'TR', 'KR', 'BR'];
BEGIN
    -- Loop to create 35 accounts
    FOR v_i IN 1..35 LOOP
        -- Select a random region
        v_region := v_regions[1 + floor(random() * array_length(v_regions, 1))::int];
        
        -- Insert dummy account
        -- Using generate_series to create unique names
        INSERT INTO accounts (
            username,          -- Required by schema (NOT NULL UNIQUE)
            password,          -- Required by schema (NOT NULL) (mapped from in_game_password)
            in_game_nick,
            server_info,       -- Mapped from region
            level,
            is_running,        -- Determines status (true=in_use, false=available)
            is_sold,           -- Must be false to be visible
            skin_list
        ) VALUES (
            'User_' || v_i || '_' || floor(random() * 10000)::text, -- Unique username
            'password123',
            'BotAcc' || v_i || '_' || floor(random() * 1000)::text, -- in_game_nick
            v_region,
            30 + floor(random() * 500)::int, -- Random level between 30 and 530
            CASE WHEN random() < 0.2 THEN TRUE ELSE FALSE END, -- 20% In Use, 80% Available (Unranked)
            FALSE, -- Not sold
            '[]'::jsonb -- Start with empty list, will populate below
        ) RETURNING id INTO v_account_id;
        
        -- Decide how many skins (3 to 6 skins)
        v_skin_count := 3 + floor(random() * 4)::int;
        v_account_skins := ARRAY[]::text[];
        
        -- Pick random unique skins
        FOR v_j IN 1..v_skin_count LOOP
            v_skin := v_skins[1 + floor(random() * array_length(v_skins, 1))::int];
            -- Avoid adding same skin twice
            IF NOT (v_skin = ANY(v_account_skins)) THEN
                v_account_skins := array_append(v_account_skins, v_skin);
            END IF;
        END LOOP;
        
        -- Update the account with the JSON list of skins
        -- The trigger 'trigger_sync_skins' will automatically populate public_skins
        UPDATE accounts 
        SET skin_list = to_jsonb(v_account_skins)
        WHERE id = v_account_id;
        
    END LOOP;
    
    RAISE NOTICE 'Successfully created 35 dummy accounts with random skins!';
END $$;
