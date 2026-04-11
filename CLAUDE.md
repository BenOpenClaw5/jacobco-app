@AGENTS.md

# Jacob Co Creative — App Reference

## URLs & Deployment

| | URL |
|---|---|
| **Active (V4)** | https://jacobco-app-v4.vercel.app |
| **Frozen (V3)** | https://jacobco-app-v3.vercel.app |
| **GitHub** | BenOpenClaw5/jacobco-app · branch: `v2-redesign` |
| **Deploy** | `npx vercel --prod` — `.vercel/project.json` points to v4 project `prj_IU1RSvG4Ycpkg1qW9OX9lSZAu507` |

---

## Stack

| Layer | Version |
|---|---|
| Next.js | 16.2.2 (App Router) |
| React | 19.2.4 |
| TypeScript | ^5 |
| Tailwind CSS | v4 — `@theme` block in `globals.css`, NOT `tailwind.config.js` |
| Supabase JS | ^2.101.1 |
| framer-motion | ^12 |
| lucide-react | ^1.7 |
| react-globe.gl | ^2.37.1 (Three.js-based, SSR disabled) |
| recharts | ^3.8.1 |

**CRITICAL — framer-motion iOS crash:** `EventBoard.tsx` and `CardDetailSheet.tsx` must NEVER use framer-motion. It caused iOS Safari crashes on mount. CSS transitions used instead. All other files may use it freely.

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
PAYROLL_ADMIN_PASSWORD=...   # default fallback: 'jacobco2026'
```

`NEXT_PUBLIC_*` are baked at build time — redeploy after changing in Vercel dashboard.

---

## Supabase Client Architecture

**Client-side** (`lib/supabase.ts`) — Proxy pattern for lazy init, avoids SSR "env var not set" errors:
```ts
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) { return (getSupabase() as any)[prop]; }
});
```
**Do not change this pattern.**

**Server-side** (`lib/supabaseServer.ts`) — exports `createServerSupabase()`. Use only in `app/api/` routes. Never import `lib/supabase.ts` from server code.

---

## Database Tables

All tables: open RLS (`FOR ALL USING (true) WITH CHECK (true)`). No auth required.

### `events`
`id`, `name`, `primary_shop` (Orlando|Dallas), `event_start_date`, `event_end_date`, `load_by_date`, `location`, `google_doc_url`, `team_members` (text[]), `archived_at`, `notes`, `last_updated_by`, `last_updated_at`, `created_at`
- **v5 columns:** `dropoff_time` (timestamptz), `dropoff_driver` (text), `pickup_time` (timestamptz), `pickup_driver` (text)

### `inventory_cases`
`id`, `type`, `letter`, `sort_order`, `shop` (Orlando|Dallas), `standard_light_count`, `actual_light_count`, `has_issue`, `issue_note`, `last_updated_by`, `last_updated_at`, `created_at`
- **v5 columns:** `price_per_light` decimal(10,2), `serial_numbers` jsonb (`[]`), `links` jsonb (`[]`)

### `event_cards`
`id`, `event_id`, `inventory_case_id` (nullable=custom), `is_custom`, `custom_name`, `custom_color`, `stage` (null|invoice|charging|prepped|loaded), `notes`, `approved_by`, `prepped_by`, `checklist_state` jsonb, `checklist_packed` bool, `has_tools_warning` bool, `last_updated_by`, `last_updated_at`, `created_at`, `updated_at`
- **v5 column:** `dual_beam_cover_color` (text)

### `event_card_images`
`id`, `event_card_id`, `url`, `storage_path`, `created_at`

### `payroll_submissions`
`id`, `employee_name`, `employee_role` (Lead Tech|Assistant Tech / Other), `pay_period_start`, `pay_period_end`, `events_count`, `events_description`, `shop_hours_type` (workforce|manual|none), `shop_hours_manual`, `shop_hours_note`, `general_notes`, `status` (submitted|reviewed|needs_followup), `admin_notes`, `review_note`, `submitted_at`, `created_at`

### `payroll_reimbursements` ← separate table, NOT a jsonb column on submissions
`id`, `submission_id` (FK→payroll_submissions), `amount`, `description`, `receipt_url`, `receipt_storage_path`, `created_at`

### `bookings`
`id`, `status` (inquiry|quoted|confirmed|cancelled), `client_name`, `client_contact`, `event_name`, `event_start_date`, `event_end_date`, `venue`, `event_type`, `budget`, `notes`, `primary_shop`, `equipment_selection` jsonb, `total_price`, `event_id` (FK→events), `created_at`, `last_updated_at`

### `globe_locations` ← v5
`id`, `city`, `state`, `country`, `lat`, `lng`, `flag`, `state_name`, `note`, `created_at`

### `pricing_settings` ← v5
`id`, `light_type` (unique), `price_per_day` decimal, `updated_at`

### `tasks` ← v5
`id`, `title`, `description`, `priority` (urgent|high|medium|low), `status` (todo|in_progress|done), `category` (shop|events|admin|finance|other), `assigned_to` text[], `due_date`, `created_at`, `completed_at`, `created_by`

### `task_comments` ← v5
`id`, `task_id` (FK→tasks), `author`, `content`, `created_at`

### Storage Buckets
- `card-images` — event card photos (public)
- `payroll-receipts` — payroll receipts (public, 10MB limit, images+PDF)

---

## SQL Migrations — Status

| File | Status |
|---|---|
| `supabase/schema.sql` | ✅ Run |
| `supabase/seed.sql` | ✅ Run |
| `supabase/v2-migration.sql` | ✅ Run |
| `supabase/v3-inventory-seed.sql` | ✅ Run (63 cases) |
| `supabase/payroll-schema.sql` | ✅ Run |
| `supabase/v4-features-migration.sql` | ✅ Run |
| `supabase/v5-v3-migrations.sql` | ⚠️ **NOT YET RUN** |

**v5-v3-migrations.sql adds:**
- `events`: dropoff/pickup transport fields
- `event_cards`: `dual_beam_cover_color`
- `inventory_cases`: `price_per_light`, `serial_numbers`, `links` + price seeds
- New tables: `globe_locations` (seeded), `pricing_settings` (seeded), `tasks`, `task_comments`
- New inventory case: Haze Machines (Orlando, sort_order 999)

Until v5 runs: inventory serial numbers and per-light prices won't persist to DB; globe falls back to hardcoded FALLBACK_LOCATIONS in `GlobeSection.tsx`; `/rundown` page will error on load.

---

## API Routes

- `POST /api/payroll/submit` — saves submission + reimbursements to DB
- `POST /api/payroll/admin/auth` — password check, returns `{ ok: boolean }`. Auth stored in `sessionStorage` key `payroll_admin`.

---

## Key Library Files

| File | Purpose |
|---|---|
| `lib/types.ts` | `Event`, `DisplayCard`, `InventoryCase`, `EventCard`, `Booking`, `ReturnIncident`, `Stage`, `STAGES`, `STAGE_META`, `STANDARD_COUNTS`, `calcReadiness()` |
| `lib/caseColors.ts` | `getCaseColor(type, customColor)`, `STAGE_COLORS` |
| `lib/supabase.ts` | Client-side Supabase (Proxy pattern) |
| `lib/supabaseServer.ts` | `createServerSupabase()` for API routes |
| `lib/themeContext.tsx` | `ThemeProvider`, `useTheme()` — persists to `localStorage` key `jcc-theme` |
| `lib/commandPaletteContext.tsx` | `PaletteProvider`, `usePalette()` |
| `lib/payPeriod.ts` | `getRecentPayPeriods()`, `formatPeriodLong()`, `formatDueDate()`, `toISO()` |
| `lib/toolsChecklist.ts` | `TOOLS_CHECKLIST`, `ALL_CHECKLIST_ITEMS`, `TOTAL_ITEMS` |
| `lib/sounds.ts` | `playCardMove()` — card move audio |
| `lib/inventory.ts` | Inventory helpers |

---

## Theme System

- CSS vars on `:root` (dark default) and `:root[data-theme="light"]` in `app/globals.css`
- `ThemeProvider` sets `data-theme` on `document.documentElement`; persists to `localStorage` key `jcc-theme`
- FOUC prevention: inline script in `app/layout.tsx` `<head>` applies saved theme before first paint
- Key vars: `--bg`, `--surface`, `--surface-elevated`, `--card`, `--border`, `--border-subtle`, `--border-strong`, `--text-primary`, `--text-secondary`, `--text-muted`, `--text-dim`, `--nav-bg`, `--nav-border`, `--accent`, `--modal-bg`, `--landing-bg`
- Toggle: Sun/Moon icon in `GlobalNav.tsx`

### Always-dark sections (must never use CSS vars — intentional hardcoded dark):
- **War Room** (`/war-room`) — `data-force-dark` attribute on root div, CSS override in `globals.css`
- **Globe section** (`app/page.tsx`) — `background: '#000008'`, white text; globe renders on dark bg regardless of theme
- **LightingRig canvas** — hero is always dark; canvas draws hardcoded amber beam colors
- **GlobeSection popup** — hardcoded `rgba(10,10,10,0.95)` — always dark
- **CardDetailSheet lightbox** — `rgba(0,0,0,0.95)` overlay — always dark (white X button intentional)

### Light mode incomplete (still has some hardcoded whites):
- `/rundown` — `PRIORITY_CONFIG.low` colors, textarea bg, done-task bg (minor)
- `/booking` — 1 toggle border
- `/calendar` — modal border + today cell highlight
- `/events` — modal border, shop color fallback, chevron
- `/inventory` — ~18 hardcoded values (significant)
- `/return/[eventId]` — some values
- `GlobalNav.tsx` — 1 box-shadow inset (cosmetic, non-breaking)

---

## Pages

| Route | File | Notes |
|---|---|---|
| `/` | `app/page.tsx` | Landing — canvas dot grid, LightingRig, GlobeSection, FeatureGrid |
| `/events` | `app/events/page.tsx` | Event list with create modal |
| `/events/[id]` | `app/events/[id]/page.tsx` | Delegates to `<EventBoard>` |
| `/events/[id]/error.tsx` | — | React error boundary |
| `/war-room` | `app/war-room/page.tsx` | TV display, always dark, auto-refresh 60s |
| `/booking` | `app/booking/page.tsx` | 3-step booking flow |
| `/inventory` | `app/inventory/page.tsx` | Cases grouped by type with expand/collapse |
| `/payroll` | `app/payroll/page.tsx` | Employee payroll form (framer-motion OK here) |
| `/payroll/success` | `app/payroll/success/page.tsx` | Post-submit confirmation |
| `/admin/payroll` | `app/admin/payroll/page.tsx` | Admin dashboard (password-gated) |
| `/admin/payroll/[id]` | `app/admin/payroll/[id]/page.tsx` | Submission review |
| `/team` | `app/team/page.tsx` | Team roster with canvas animations |
| `/calendar` | `app/calendar/page.tsx` | Event calendar |
| `/schedule` | `app/schedule/page.tsx` | Schedule view |
| `/lookup` | `app/lookup/page.tsx` | Case lookup |
| `/incidents` | `app/incidents/page.tsx` | Incident log |
| `/rundown` | `app/rundown/page.tsx` | Tasks board — requires v5 migration (`tasks` table) |
| `/return/[eventId]` | `app/return/[eventId]/page.tsx` | Post-event return flow |

---

## Component Architecture

```
app/layout.tsx
  └── <head> inline script (FOUC prevention)
  └── grain-overlay div (fixed, z-9990, CSS class)
  └── SplashScreen (shows once per session via sessionStorage)
  └── ClientShell
        ├── ThemeProvider
        ├── PaletteProvider + KeyboardHandler (⌘K)
        └── CommandPalette (global overlay)

GlobalNav — used by all pages EXCEPT: war-room, payroll, booking, return, admin/payroll
  ├── NAV_LINKS: Events, Booking, Inventory, War Room, Team, Rundown, Schedule, Payroll
  ├── MORE_LINKS (dropdown): Calendar, Case Lookup, Incidents, Payroll Admin
  ├── Company call countdown (Monday 11am ET)
  └── Theme toggle (Sun/Moon)

EventBoard (events/[id])
  ├── StageColumn × 4 (invoice → charging → prepped → loaded)
  ├── InventoryPool (stage=null cards)
  ├── CardDetailSheet (bottom sheet)
  └── CreateCustomCardModal
```

### Stage System
`invoice` → `charging` → `prepped` → `loaded`. `null` = pool.
`calcReadiness()` = avg `STAGE_META[stage].weight` across all assigned cards (0/33/66/100).

### DisplayCard
Joined from `inventory_cases` + `event_cards`. `eventCardId` may be null before first interaction (card not yet in DB).

---

## Known Bugs — Must Not Re-Introduce

### Rules of Hooks (CardDetailSheet)
`useCallback` for `saveChecklistState` was originally after `if (!card) return null`. Caused "Rendered more hooks than during previous render" crash. **FIXED — all hooks must be before any early returns in this file.**

### framer-motion iOS crash (EventBoard, CardDetailSheet)
Spring animations crashed iOS Safari on mount. **FIXED — removed framer-motion from both files entirely.** CSS transitions used (`transition: 'transform 0.28s cubic-bezier(...)'`). Never re-add it.

### Unhandled rejection debug overlay (EventBoard)
`handleTeamChange` had no try/catch — rejection persisted across navigations as debug overlay. **FIXED — try/catch added.**

---

## Booking — Non-Chargeable Types

Hidden from equipment selector, budget, and quote output:
`Tools`, `Air Wall Track`, `Circle Brackets`, `Clamp Brackets Tree`, `Tools Cases`

---

## Payroll Admin

- Gate: `PAYROLL_ADMIN_PASSWORD` env (default `jacobco2026`)
- Auth state: `sessionStorage.getItem('payroll_admin') === '1'`
- Expected submitters: Augustus (Gus), Ben, Jace, Max, Mia, Tommy, Van

---

## Team Roster (current)

Jacob Towe, Courtney Towe, Heather O'Donovan, Augustus Delgado, Tommy Freeman, Jace Roman, Ben Morris, Van Sistare, Max Iturriaga, Mia Goodwill, Abby Towe, Eden Towe

---

## Inventory Price Per Light (hardcoded fallback in inventory/page.tsx)

Used when `price_per_light` DB column is 0/unset (until v5 migration runs):
Dacore $179 · Pinspot $150 · Dual Beam $189 · Pixel Brick $400 · Pixel Tube $500 · AX2 $1500 · AX5 $775 · Plutos $2000

---

## Serial Numbers (CardDetailSheet)

Only shown for `Pixel Brick` and `AX5` types. Stored in `inventory_cases.serial_numbers` (`[{ label, serial }]`). Requires v5 migration.

---

## Cybertruck Calculator (EventBoard)

Event header, beside Team selector. `displayCards.filter(c => c.stage).length`: 0 = neutral, ≤15 = "Fits in a Cybertruck ✓" (green), >15 = "Use the trailer instead" (amber).

---

## War Room Countdown Logic

Uses calendar date comparison (YYYY-MM-DD strings), not timestamps:
- `> 7 days`: cool white · "Loads in Xd Xh"
- `3–7 days`: amber · "Loads in Xd Xh"
- `< 3 days OR same calendar day as load_by_date`: red pulse · "LAST DAY TO LOAD"
- `past load_by_date`: red pulse · "OVERDUE"

---

## V4 Design System (globals.css)

Added in V4 — use these classes:
- `.grain-overlay` — fixed noise texture overlay (z-9990, pointer-events none)
- `.card-interactive` — hover lift + gold border + active press
- `.btn-press` — scale(0.97) on active
- `.glass-surface` — blur(12px) glass effect
- `.inset-highlight` — top edge specular shadow
- `.nav-active` — gold pill background for active nav items
- `.text-accent-glow` — gold text with glow
- `.page-enter` — fade-up page entrance animation

Shadow vars: `--shadow-accent-sm/md/glow`, `--card-hover-shadow`

---

## Pricing Settings Table (v5)

Used by booking flow. `price_per_day` per light type. Pre-seeded values:
Dacore $10 · Pinspot $25 · Dual Beam $15 · Gobo $50 · Super Spot $100 · Pixel Brick $30 · Pixel Tube $40 · AX2 $50 · AX5 $40 · Plutos $50 · Chandelier $10 · Dome Lights $10 · Haze $200
