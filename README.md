# The Rad Pad — Members Hub

## Setup Guide (Do This Once)

### Step 1 — Supabase (your database, free)

1. Go to **supabase.com** → Sign up → New Project
2. Name it `rad-pad`, pick a region, set a password (save it somewhere)
3. Wait ~2 min for it to spin up
4. Go to **SQL Editor** → paste and run this:

```sql
create table recordings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  date text,
  duration text,
  host text,
  video_url text,
  tags text[] default '{}',
  created_at timestamp default now()
);

create table resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,
  file_url text,
  file_type text,
  created_at timestamp default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_date text,
  time text,
  duration text,
  type text,
  platform text,
  created_at timestamp default now()
);

create table links (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  url text,
  category text,
  emoji text,
  created_at timestamp default now()
);
```

5. Go to **Project Settings → API**
6. Copy **Project URL** and **anon public** key — you'll need these next

---

### Step 2 — Deploy to Vercel (free)

1. Go to **github.com** → New repository → name it `rad-pad` → Create
2. Upload this entire folder to that repo (drag and drop on GitHub works)
3. Go to **vercel.com** → Sign up → New Project → import your GitHub repo
4. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
5. Click **Deploy**
6. Done — your site is live at a `.vercel.app` URL

---

### Step 3 — Custom Domain (optional)

In Vercel → your project → Settings → Domains → add your domain → follow the DNS instructions.

---

## Day-to-Day Use

### To add a new recording:
Go to `yoursite.com/admin-rp2026` → click "Add Recording" → fill in the form → click "Add Recording" → it appears on the site immediately.

### To add an event, resource, or link:
Same admin page, just switch tabs at the top.

### That's it.

---

## Admin URL
`/admin-rp2026` — keep this private. Only people with the URL can access it.
