# LoL Account Browser

A public webpage for browsing League of Legends accounts with skins. Hosted on GitHub Pages, connected to Supabase.

## 🚀 Quick Start

### 1. Set Up Supabase Database

Run these SQL scripts in your Supabase SQL Editor (in order):

1. `database/schema.sql` - Creates tables and functions
2. `database/rls_policies.sql` - Sets up security
3. `database/initial_sync.sql` - Syncs existing data

### 2. Configure the App

1. Copy `config.example.js` to `config.js`
2. Add your Supabase credentials:
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Project → Settings → API
   - Copy **Project URL** and **anon public** key

### 3. Test Locally

```bash
npx -y serve .
```

Open `http://localhost:3000` in your browser.

### 4. Deploy to GitHub Pages

1. Push to GitHub
2. Go to Settings → Pages
3. Set source: `main` branch, root folder
4. Your site: `https://USERNAME.github.io/lol-page/`

## 📁 Files

```
├── database/
│   ├── schema.sql        # Tables & functions
│   ├── rls_policies.sql  # Security policies
│   └── initial_sync.sql  # Data migration
├── index.html            # Main page
├── styles.css            # Styling
├── app.js                # Application logic
├── config.example.js     # Config template
└── config.js             # Your credentials (gitignored)
```

## 🔒 Security

- ✅ Uses Supabase anon key (safe for client)
- ✅ Row Level Security blocks private data
- ✅ SECURITY DEFINER functions filter columns
- ❌ Never exposes: passwords, emails, usernames

## 📄 License

MIT
