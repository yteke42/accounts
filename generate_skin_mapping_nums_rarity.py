"""
Fully automatic skin mapping updater.

Usage:
    python generate_skin_mapping_nums_rarity.py

What it does (everything automatic):
  1. Fetches the latest Data Dragon version
  2. Downloads ALL champion JSONs (English + Turkish) to skinnames/
  3. Downloads skins.json from CommunityDragon (for rarity data)
  4. Auto-downloads any missing splash art to src/splash/
  5. Generates src/skin_mapping_with_nums_rarity.txt (used by the website)

Output format: Turkish Name, English Name, ChampionName_num.jpg, rarity
"""

import json
import os
import sys
import urllib.request
from pathlib import Path


# ─── URLs ───────────────────────────────────────────────────────────────────
VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json"
CHAMPION_LIST_URL = "https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/champion.json"
CHAMPION_JSON_URL = "https://ddragon.leagueoflegends.com/cdn/{version}/data/{locale}/champion/{name}.json"
SPLASH_URL = "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/{champion}_{num}.jpg"
SKINS_JSON_URL = (
    "https://raw.communitydragon.org/latest/plugins/"
    "rcp-be-lol-game-data/global/default/v1/skins.json"
)


# ─── Helper Functions ───────────────────────────────────────────────────────

def download_file(url: str, dest: Path, label: str = "") -> bool:
    """Download a file from url to dest. Returns True on success."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as response:
            with open(str(dest), 'wb') as f:
                f.write(response.read())
        return True
    except Exception as e:
        print(f"  ✗ Failed to download {label or url}: {e}")
        return False


def fetch_json(url: str) -> dict:
    """Fetch and parse JSON from a URL."""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read())


def get_latest_version() -> str:
    """Get the latest Data Dragon version."""
    versions = fetch_json(VERSIONS_URL)
    return versions[0]


def download_all_champion_jsons(version: str, en_path: Path, tr_path: Path):
    """Download all champion JSONs from Data Dragon for both locales."""
    en_path.mkdir(parents=True, exist_ok=True)
    tr_path.mkdir(parents=True, exist_ok=True)

    # Get champion list
    champ_data = fetch_json(CHAMPION_LIST_URL.format(version=version))
    champions = list(champ_data['data'].keys())
    print(f"  Found {len(champions)} champions")

    for i, champ in enumerate(champions):
        for locale, folder in [('en_US', en_path), ('tr_TR', tr_path)]:
            url = CHAMPION_JSON_URL.format(version=version, locale=locale, name=champ)
            dest = folder / f"{champ}.json"
            download_file(url, dest, f"{champ} ({locale})")

        # Progress indicator
        if (i + 1) % 25 == 0:
            print(f"  {i + 1}/{len(champions)} champions downloaded...")

    print(f"  ✓ All {len(champions)} champions downloaded")


def download_skins_json(dest_path: Path) -> dict:
    """Download skins.json from CommunityDragon and return rarity lookup."""
    print("Downloading skins.json from CommunityDragon...")
    if not download_file(SKINS_JSON_URL, dest_path, "skins.json"):
        raise RuntimeError("Could not download skins.json – check your internet connection")

    with open(dest_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    name_to_rarity = {}
    for skin_id, skin_data in data.items():
        name = skin_data.get('name', '')
        rarity = skin_data.get('rarity', 'kNoRarity')
        if name:
            name_to_rarity[name] = rarity

    print(f"  ✓ Loaded {len(name_to_rarity)} skin rarities")
    return name_to_rarity


def get_champion_skins(json_path: Path) -> tuple[str, dict[int, str]]:
    """
    Extract skins from a champion JSON file.
    Returns (champion_name, {num: skin_name}).
    """
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    champion_name = list(data['data'].keys())[0]
    champion_data = data['data'][champion_name]

    skins = {}
    for skin in champion_data['skins']:
        if skin['num'] == 0 or skin['name'].lower() == 'default':
            continue
        skins[skin['num']] = skin['name']

    return champion_name, skins


# ─── Main ───────────────────────────────────────────────────────────────────

def generate_skin_mapping():
    """Main function: fully automatic skin mapping generation."""

    root = Path(__file__).parent
    tr_path = root / 'skinnames' / 'champion_trTR'
    en_path = root / 'skinnames' / 'champion_enUS'
    splash_dir = root / 'src' / 'splash'
    output_path = root / 'src' / 'skin_mapping_with_nums_rarity.txt'
    skins_json_path = root / 'skins.json'

    # Ensure directories exist
    splash_dir.mkdir(parents=True, exist_ok=True)

    # Step 1: Get latest version and download all champion JSONs
    print("Fetching latest Data Dragon version...")
    version = get_latest_version()
    print(f"  ✓ Latest version: {version}")

    print(f"\nDownloading champion JSONs (EN + TR)...")
    download_all_champion_jsons(version, en_path, tr_path)

    # Step 2: Download skins.json for rarity data
    print()
    rarity_lookup = download_skins_json(skins_json_path)

    # Step 3: Process each champion and generate mapping
    output_lines = []
    splash_download_count = 0
    splash_fail_count = 0

    # Cache actual cases of files in the splash directory
    actual_splash_files = {f.name.lower(): f.name for f in splash_dir.iterdir() if f.is_file()}

    tr_files = sorted(tr_path.glob('*.json'))
    print(f"\nGenerating skin mappings for {len(tr_files)} champions...")

    for tr_file in tr_files:
        champion_file_name = tr_file.stem
        en_file = en_path / f'{champion_file_name}.json'

        if not en_file.exists():
            print(f"  ⚠ English file not found for {champion_file_name}, skipping")
            continue

        champion_name, tr_skins = get_champion_skins(tr_file)
        _, en_skins = get_champion_skins(en_file)

        for num in sorted(tr_skins.keys()):
            tr_name = tr_skins.get(num)
            en_name = en_skins.get(num)

            if tr_name and en_name:
                expected_jpg = f"{champion_name}_{num}.jpg"
                jpg_lower = expected_jpg.lower()
                rarity = rarity_lookup.get(en_name, 'kNoRarity')

                # Use actual casing from disk if it exists, otherwise expected casing
                if jpg_lower in actual_splash_files:
                    final_jpg_name = actual_splash_files[jpg_lower]
                else:
                    final_jpg_name = expected_jpg
                    splash_file = splash_dir / expected_jpg
                    url = SPLASH_URL.format(champion=champion_name, num=num)
                    print(f"  ↓ Downloading {expected_jpg}...")
                    if download_file(url, splash_file, expected_jpg):
                        splash_download_count += 1
                        actual_splash_files[jpg_lower] = expected_jpg
                    else:
                        splash_fail_count += 1

                output_lines.append(f"{tr_name}, {en_name}, {final_jpg_name}, {rarity}")
            elif tr_name:
                print(f"  ⚠ No English name for skin num={num} ({tr_name})")
            elif en_name:
                print(f"  ⚠ No Turkish name for skin num={num} ({en_name})")

    # Step 4: Write output
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(output_lines))

    # Summary
    print(f"\n{'='*50}")
    print(f"✓ Generated {len(output_lines)} skin mappings")
    print(f"  → {output_path}")
    if splash_download_count > 0:
        print(f"  ↓ Downloaded {splash_download_count} new splash images")
    if splash_fail_count > 0:
        print(f"  ✗ Failed to download {splash_fail_count} splash images")
    print(f"  Data Dragon version: {version}")
    print(f"{'='*50}")


if __name__ == '__main__':
    generate_skin_mapping()
