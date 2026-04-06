# Jacob Co — Event Prep Board

A cinematic, mobile-first event production board for Jacob Co luxury event lighting. Track physical lighting cases across prep stages: Invoice → Charging → Prepped → Loaded.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4**
- **Framer Motion** — animations throughout
- **Supabase** — database + image storage
- **Vercel** — deployment target

---

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Open the **SQL Editor** and run `supabase/schema.sql` (creates all tables + RLS policies)
3. Run `supabase/seed.sql` (inserts all 62 inventory cases — idempotent)
4. Go to **Storage** → create a new bucket called `card-images`, set it to **Public**

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials (found in Project Settings → API):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploying to Vercel

### Option A: Vercel CLI

```bash
npm i -g vercel
vercel
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Option B: GitHub + Vercel Dashboard

1. Push to GitHub (commands below)
2. Import repo at vercel.com/new
3. Add the two env vars under Settings → Environment Variables
4. Deploy

---

## Push to GitHub

```bash
git init
git add .
git commit -m "feat: initial Jacob Co event prep board"
git remote add origin https://github.com/YOUR_USERNAME/jacobco-app.git
git push -u origin main
```

---

## Data Model

| Table | Purpose |
|---|---|
| `inventory_cases` | Global lighting case definitions (62 cases) |
| `events` | Each production event |
| `event_cards` | Case assignments per event (stage, notes, approved/prepped by) |
| `event_card_images` | Photos uploaded per card per event |

**Stages:** Invoice (0%) → Charging (33%) → Prepped (66%) → Loaded (100%)

Cards not in any stage appear in the **Inventory Pool** for that event.

---

## Features

- All Events dashboard — create, open, delete events
- Per-event board — 4 stages + inventory pool
- 62 seeded inventory cases across 15 case types
- Card detail sheet — notes, approved by, prepped by, photo upload/remove
- Custom event-only cards with color picker
- Weighted progress bar
- Mobile-first with tab navigation (iPhone primary)
- Subtle sound on card movement
- Persists to Supabase (real backend, no localStorage)
