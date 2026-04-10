@AGENTS.md

# Jacob Co Creative — App Reference

## Project Overview

Internal operations app for **Jacob Co Creative**, a lighting/AV production company in Orlando FL.
Features: event prep board, inventory management, war room display, client booking, payroll submissions, team page, calendar, schedule.

**Production URL:** https://jacobco-app-v2.vercel.app
**GitHub:** BenOpenClaw5/jacobco-app (branch: `v2-redesign`)
**Deploy:** `npx vercel --prod` (always use `--prod` flag or it deploys to preview only)

---

## Stack

| Layer | Version |
|---|---|
| Next.js | 16.2.2 (App Router) |
| React | 19.2.4 |
| TypeScript | ^5 |
| Tailwind CSS | v4 (uses `@theme` block in globals.css, NOT tailwind.config.js) |
| Supabase JS | ^2.101.1 |
| framer-motion | ^12 — **only used in payroll pages** |
| lucide-react | ^1.7 |

**CRITICAL:** framer-motion is intentionally removed from `EventBoard.tsx` and `CardDetailSheet.tsx`. It caused iOS Safari animation crashes on mount. Do not re-add it to those files.

---

## Environment Variables

Set in Vercel dashboard. Also needed in `.env.local` for local dev:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
PAYROLL_ADMIN_PASSWORD=...   # optional, fallback default is 'jacobco2026'
```

`NEXT_PUBLIC_*` vars are baked into the client bundle at build time. If you change them in Vercel, you must redeploy.

---

## Supabase Client Architecture

**Client-side:** `lib/supabase.ts` uses a **Proxy pattern** for lazy initialization.
```ts
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) { return (getSupabase() as any)[prop]; }
});
```
This avoids "env var not set" errors during SSR/build when `NEXT_PUBLIC_*` vars aren't available yet. **Do not change this pattern.**

**Server-side:** `lib/supabaseServer.ts` exports `createServerSupabase()` for API routes. Use this in `app/api/` files, never import `lib/supabase.ts` from server code.

---

## Database Tables

All tables have **open RLS policies** (`FOR ALL USING (true) WITH CHECK (true)`). No auth required.

### Core tables
- **`events`** — event records. Key columns: `id`, `name`, `primary_shop`, `event_start_date`, `event_end_date`, `load_by_date`, `location`, `google_doc_url`, `team_members` (text[]), `archived_at`
- **`inventory_cases`** — physical equipment cases. Key columns: `id`, `type`, `letter`, `sort_order`, `shop` (Orlando|Dallas), `standard_light_count`, `actual_light_count`, `has_issue`, `issue_note`, `last_updated_by`, `last_updated_at`
  - **Pending columns (run v5 migration):** `serial_numbers` jsonb, `price_per_light` decimal, `links` jsonb
- **`event_cards`** — join between cases/custom items and events. Key columns: `id`, `event_id`, `inventory_case_id` (nullable for custom), `is_custom`, `custom_name`, `custom_color`, `stage` (null=pool, or invoice/charging/prepped/loaded), `notes`, `approved_by`, `prepped_by`, `checklist_state` jsonb, `checklist_packed` bool, `has_tools_warning` bool
- **`event_card_images`** — photos per event card. Columns: `id`, `event_card_id`, `url`, `storage_path`
- **`payroll_submissions`** — employee payroll. Key columns: `id`, `employee_name`, `employee_role`, `pay_period_start/end`, `events_count`, `shop_hours_type`, `reimbursements` jsonb, `status` (submitted|reviewed|needs_followup), `submitted_at`, `review_note`
- **`bookings`** — client booking quotes. Key columns: `id`, `status` (inquiry|quoted|confirmed|cancelled), `client_name`, `equipment_selection` jsonb, `total_price`, `event_id`

### Supabase Storage Buckets
- **`card-images`** — event card photos (public)
- **`payroll-receipts`** — payroll receipt uploads (public)

---

## Pending Database Migration (v5)

These columns were added to the UI but the SQL migration has not been run yet. Run in Supabase SQL Editor:

```sql
-- v5: serial numbers, per-light pricing, links
ALTER TABLE inventory_cases 
  ADD COLUMN IF NOT EXISTS serial_numbers jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS price_per_light DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS links jsonb DEFAULT '[]'::jsonb;

-- Seed price_per_light from known costs
UPDATE inventory_cases SET price_per_light = 179 WHERE type = 'Dacore';
UPDATE inventory_cases SET price_per_light = 150 WHERE type = 'Pinspot';
UPDATE inventory_cases SET price_per_light = 189 WHERE type = 'Dual Beam';
UPDATE inventory_cases SET price_per_light = 400 WHERE type = 'Pixel Brick';
UPDATE inventory_cases SET price_per_light = 500 WHERE type = 'Pixel Tube';
UPDATE inventory_cases SET price_per_light = 1500 WHERE type = 'AX2';
UPDATE inventory_cases SET price_per_light = 775 WHERE type = 'AX5';
UPDATE inventory_cases SET price_per_light = 2000 WHERE type = 'Plutos';
```

---

## API Routes

- `POST /api/payroll/submit` — saves payroll submission to DB
- `POST /api/payroll/admin/auth` — checks password against `PAYROLL_ADMIN_PASSWORD` env var (default: `jacobco2026`). Returns `{ ok: boolean }`. Auth state stored in `sessionStorage` key `payroll_admin`.

---

## Key Library Files

| File | Purpose |
|---|---|
| `lib/types.ts` | All shared types: `Event`, `DisplayCard`, `InventoryCase`, `EventCard`, `Stage`, `STAGES`, `STAGE_META`, `calcReadiness()` |
| `lib/caseColors.ts` | `getCaseColor(type, customColor)`, `STAGE_COLORS` record |
| `lib/supabase.ts` | Client-side Supabase (Proxy pattern — lazy init) |
| `lib/supabaseServer.ts` | `createServerSupabase()` for API routes |
| `lib/themeContext.tsx` | `ThemeProvider`, `useTheme()` — reads/writes `jcc-theme` in localStorage |
| `lib/commandPaletteContext.tsx` | `PaletteProvider`, `usePalette()` |
| `lib/payPeriod.ts` | Pay period logic: `getRecentPayPeriods()`, `formatPeriodLong()`, `formatDueDate()`, `toISO()` |
| `lib/toolsChecklist.ts` | `TOOLS_CHECKLIST`, `ALL_CHECKLIST_ITEMS`, `TOTAL_ITEMS` — tools case packing list |
| `lib/sounds.ts` | `playCardMove()` — plays audio when a card is moved between stages |
| `lib/inventory.ts` | Inventory helpers |

---

## Theme System

- CSS variables defined in `app/globals.css` on `:root` (dark default) and `:root[data-theme="light"]`
- `ThemeProvider` sets `data-theme` attribute on `document.documentElement` and persists to `localStorage` key `jcc-theme`
- Key variables: `--bg`, `--surface`, `--surface-elevated`, `--card`, `--border`, `--border-subtle`, `--text-primary`, `--text-secondary`, `--text-muted`, `--text-dim`, `--nav-bg`, `--nav-border`, `--accent`
- **War Room** always stays dark: its root div has `data-force-dark` attribute + `[data-force-dark]` CSS override in globals.css
- **Landing page** hero section always dark (controlled by `--landing-bg` variable)
- Toggle button (Sun/Moon icon) lives in `components/GlobalNav.tsx`

---

## Pages

| Route | File | Notes |
|---|---|---|
| `/` | `app/page.tsx` | Landing page with lighting canvas animation |
| `/events` | `app/events/page.tsx` | Event list |
| `/events/[id]` | `app/events/[id]/page.tsx` | Delegates to `<EventBoard>` component |
| `/events/[id]/error.tsx` | — | Error boundary — catches React render errors |
| `/war-room` | `app/war-room/page.tsx` | TV display, always dark, auto-refreshes 60s |
| `/booking` | `app/booking/page.tsx` | 3-step booking flow |
| `/inventory` | `app/inventory/page.tsx` | Case inventory with expand/collapse |
| `/payroll` | `app/payroll/page.tsx` | Employee payroll submission form |
| `/payroll/success` | `app/payroll/success/page.tsx` | Post-submit confirmation |
| `/admin/payroll` | `app/admin/payroll/page.tsx` | Admin dashboard (password-gated) |
| `/admin/payroll/[id]` | `app/admin/payroll/[id]/page.tsx` | Individual submission review |
| `/team` | `app/team/page.tsx` | Team roster with pinspot canvas animations |
| `/calendar` | `app/calendar/page.tsx` | Event calendar view |
| `/schedule` | `app/schedule/page.tsx` | Schedule view |
| `/lookup` | `app/lookup/page.tsx` | Case lookup tool |
| `/incidents` | `app/incidents/page.tsx` | Incident log |
| `/return/[eventId]` | `app/return/[eventId]/page.tsx` | Post-event return flow |

---

## Component Architecture

```
ClientShell (layout wrapper)
  ├── ThemeProvider
  ├── PaletteProvider + CommandPalette
  └── GlobalNav (all pages except war-room, payroll, booking which use custom headers)

EventBoard (events/[id])
  ├── StageColumn × 4 (invoice, charging, prepped, loaded)
  ├── InventoryPool (unassigned cases)
  ├── CardDetailSheet (bottom sheet, mobile-first)
  └── CreateCustomCardModal
```

### Stage system
Stages (in order): `invoice` → `charging` → `prepped` → `loaded`. `null` = inventory pool.
`calcReadiness()` in types.ts returns 0–100% based on how many cases are in `prepped`+`loaded`.

### DisplayCard type
Built from joining `inventory_cases` + `event_cards`. Has: `displayId`, `inventoryCaseId`, `eventCardId` (may be null before first interaction), `type`, `letter`, `displayName`, `isCustom`, `stage`, plus all event-card metadata.

---

## Known Bugs Fixed (Critical to remember)

### Rules of Hooks violation in CardDetailSheet
`useCallback` for `saveChecklistState` was originally defined AFTER the `if (!card) return null` early return. This caused "Rendered more hooks than during the previous render" React crash when tapping a card. **FIXED** — all hooks are now before the early return guard. **Never put hooks after early returns in this file.**

### framer-motion iOS crash
AnimatePresence/motion.div in EventBoard/CardDetailSheet caused iOS Safari to crash on mount with spring animations. **FIXED** by removing framer-motion from those components entirely. CSS transitions used instead (`transition: 'transform 0.28s cubic-bezier(...)'`).

### "Failed to fetch" debug overlay
handleTeamChange in EventBoard had no try/catch, causing unhandled rejection that persisted across navigations. **FIXED** — try/catch added.

---

## Booking — Non-Chargeable Types

These types are hidden from the booking equipment selector, budget, and quote:
`Tools`, `Air Wall Track`, `Circle Brackets`, `Clamp Brackets Tree`, `Tools Cases`

---

## Payroll Admin

- Password gate: checks `PAYROLL_ADMIN_PASSWORD` env (default `jacobco2026`)
- Auth state: `sessionStorage.getItem('payroll_admin') === '1'`
- Expected submitters (for "Who Hasn't Submitted" panel): Augustus (Gus), Ben, Jace, Max, Mia, Tommy, Van

---

## Team Roster (current)

Jacob Towe, Courtney Towe, Heather O'Donovan, Augustus Delgado, Tommy Freeman, Jace Roman, Ben Morris, Van Sistare, Max Iturriaga, Mia Goodwill, Abby Towe, **Eden Towe** (was Eden Tal — already corrected)

---

## SQL Migration Files (in `supabase/`)

Run in this order if setting up fresh:
1. `schema.sql` — base tables
2. `seed.sql` — initial data
3. `v2-migration.sql` — adds google_doc_url, load_by_date, archived_at to events; images table
4. `v3-inventory-seed.sql` — replaces inventory with real physical cases (63 cases)
5. `payroll-schema.sql` — payroll_submissions table + storage bucket
6. `v4-features-migration.sql` — team_members, checklist columns, bookings table, tools cases
7. **v5 (not yet a file)** — serial_numbers, price_per_light, links on inventory_cases (SQL above)

---

## Inventory Price Per Light (hardcoded fallback in inventory/page.tsx)

Used when `price_per_light` DB column is 0/unset:
Dacore $179 · Pinspot $150 · Dual Beam $189 · Pixel Brick $400 · Pixel Tube $500 · AX2 $1500 · AX5 $775 · Plutos $2000

---

## Serial Numbers (CardDetailSheet)

Only shown for `Pixel Brick` and `AX5` case types. Stored in `inventory_cases.serial_numbers` (jsonb array: `[{ label, serial }]`). Requires v5 migration to be run first.

---

## Cybertruck Calculator (EventBoard)

Shows in event header beside Team selector. Logic: 0 cases = neutral, ≤15 = "Fits in a Cybertruck ✓" (green), >15 = "Use the trailer instead" (amber). Reads `displayCards.filter(c => c.stage).length`.

---

## War Room Countdown Logic

- `> 7 days`: cool white, "Loads in Xd Xh"
- `3–7 days`: amber, "Loads in Xd Xh"
- `< 3 days OR same calendar day as load_by_date`: red pulse, "LAST DAY TO LOAD"
- `past load_by_date`: red pulse, "OVERDUE"

Uses calendar date comparison (YYYY-MM-DD strings), not timestamp comparison, so same-day shows correctly regardless of time.
