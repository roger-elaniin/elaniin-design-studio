# Elaniin Design Studio

A multi-user AI-powered design deliverable tool.

## Stack

- **Frontend**: HTML5, CSS (base.css from Elaniin Design System), Vanilla JS
- **Auth & Database**: Supabase (PostgreSQL + Row Level Security)
- **Hosting**: Vercel (Serverless Functions)
- **AI**: Anthropic API (Claude) via `/api/chat.js`

## Folder Structure

```
elaniin-design-studio/
  index.html          # Login page
  admin.html          # Admin panel (config, prompts, users)
  workspace.html      # User workspace (projects, AI chat, preview)
  base.css            # Shared design system styles
  animations.js       # Shared animation utilities
  js/
    config.js         # Supabase client initialization
    auth.js           # Login / session logic
    admin.js          # Admin panel logic
    workspace.js      # Workspace logic
  api/
    chat.js           # Vercel serverless function — Anthropic API proxy
  assets/             # Static assets
  vercel.json         # Vercel deployment configuration
  SUPABASE-SETUP.sql  # Database schema and RLS policies
  README.md           # This file
```

## First-Time Setup

> **IMPORTANT**: Before deploying or running the app, you must manually execute the SQL schema in Supabase.

1. Go to your [Supabase project](https://app.supabase.com) → **SQL Editor**
2. Open `SUPABASE-SETUP.sql`
3. Paste the full contents and click **Run**

This creates the `profiles`, `app_config`, `projects`, and `messages` tables, sets up Row Level Security policies, and installs the auto-profile trigger on user signup.
